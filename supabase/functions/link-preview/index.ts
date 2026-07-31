// Fetches a URL server-side and extracts a lightweight link preview
// (title, image, description, source host) so the Research board can
// show a real preview card for pasted links instead of assuming the
// URL points directly at an image. Runs server-side because browsers
// block cross-origin HTML fetches from client JS (CORS).
//
// SSRF hardening, added 2026-07-31. This function used to accept any URL from
// any caller with `verify_jwt: false`, validate only the protocol, and fetch
// with `redirect: "follow"`. That made it an unauthenticated open proxy: a
// request for http://169.254.169.254/ or an internal 10.x address was fetched
// from inside Supabase's egress and up to 300 KB of the response handed back,
// and the differing errors made it a usable host/port scanner.
//
// Four things close it, and all four are needed:
//
//   1. verify_jwt is now true (set at deploy time). The only caller is
//      ResearchView, which sits behind the app's login gate, so requiring a
//      session costs nothing and removes the anonymous-proxy property outright.
//   2. The hostname is RESOLVED and the resulting addresses checked, not just
//      pattern-matched. A blocklist on the hostname alone does not stop DNS
//      rebinding — evil.example with an A record pointing at 169.254.169.254
//      passes every string check there is.
//   3. redirect is "manual" and every hop is re-validated. Following redirects
//      lets a public first hop hand off to a private second one, which defeats
//      any check that only looks at the URL the caller supplied.
//   4. The body is read through a byte cap rather than buffered whole, so a
//      hostile or broken target cannot make this allocate without limit.
//
// The blocklist mirrors src/lib/safeBoardUrl.js, whose own docstring says it is
// "not a substitute for server allowlists". It was right; this is that server
// side. Keep the two in step — the client one gives a fast, friendly error, and
// this one is the boundary that actually holds.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Max redirect hops to follow by hand. Each one is re-validated. */
const MAX_HOPS = 4;
/** Hard ceiling on bytes read from a target. */
const MAX_BYTES = 300_000;
const FETCH_TIMEOUT_MS = 8000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * True if an IP literal is anything other than a public internet address.
 * Covers loopback, private, link-local (incl. cloud metadata at 169.254.169.254),
 * CGNAT, benchmarking, multicast and reserved space, plus the IPv6 equivalents
 * and IPv4-mapped IPv6 (::ffff:127.0.0.1 is still loopback).
 */
function isBlockedAddress(ip: string): boolean {
  const h = String(ip || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;

  // IPv4-mapped IPv6 — unwrap and test as IPv4 rather than letting it through.
  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(h);
  if (mapped) return isBlockedAddress(mapped[1]);

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const a = v4.slice(1, 5).map(Number);
    if (a.some((n) => Number.isNaN(n) || n > 255)) return true;
    if (a[0] === 0) return true;                              // 0.0.0.0/8
    if (a[0] === 10) return true;                             // private
    if (a[0] === 127) return true;                            // loopback
    if (a[0] === 169 && a[1] === 254) return true;            // link-local + metadata
    if (a[0] === 172 && a[1] >= 16 && a[1] <= 31) return true; // private
    if (a[0] === 192 && a[1] === 168) return true;            // private
    if (a[0] === 192 && a[1] === 0 && a[2] === 0) return true; // IETF protocol
    if (a[0] === 100 && a[1] >= 64 && a[1] <= 127) return true; // CGNAT
    if (a[0] === 198 && (a[1] === 18 || a[1] === 19)) return true; // benchmarking
    if (a[0] >= 224) return true;                             // multicast + reserved
    return false;
  }

  // IPv6
  if (h === "::" || h === "::1") return true;                 // unspecified, loopback
  if (/^f[cd]/.test(h)) return true;                          // fc00::/7 unique local
  if (/^fe[89ab]/.test(h)) return true;                       // fe80::/10 link-local
  if (/^ff/.test(h)) return true;                             // multicast
  return false;
}

/** Hostnames that never legitimately appear in a pasted inspiration link. */
function isBlockedHostname(host: string): boolean {
  const h = String(host || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "metadata" || h === "metadata.google.internal") return true;
  return false;
}

/**
 * Reject anything that is not a public internet host. Resolves the name when it
 * is not already an IP literal, and blocks if ANY resolved address is private —
 * a name that returns both a public and a private address is a rebinding
 * attempt, not a partially-valid host.
 */
async function assertPublicHost(hostname: string): Promise<string | null> {
  if (isBlockedHostname(hostname)) return "That host is not reachable";

  const bare = hostname.replace(/^\[|\]$/g, "");
  const looksLikeIp = /^[\d.]+$/.test(bare) || bare.includes(":");
  if (looksLikeIp) {
    return isBlockedAddress(bare) ? "That host is not reachable" : null;
  }

  let addresses: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    try {
      addresses = addresses.concat(await Deno.resolveDns(hostname, type));
    } catch {
      // A host with no AAAA record is normal; only a total failure matters.
    }
  }
  // Fail closed: if the name resolves to nothing we can check, don't fetch it.
  if (!addresses.length) return "Could not resolve that host";
  if (addresses.some(isBlockedAddress)) return "That host is not reachable";
  return null;
}

/** Read a response body up to a byte ceiling without buffering it whole. */
async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Target already closed the stream; nothing to do.
    }
  }
  const joined = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    if (at >= total) break;
    joined.set(c.subarray(0, Math.min(c.byteLength, total - at)), at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(joined).slice(0, maxBytes);
}

/**
 * Fetch, following redirects by hand so each hop is validated before it is
 * requested. Returns the final response plus the URL it actually came from.
 */
async function safeFetch(
  start: URL
): Promise<{ res: Response; finalUrl: URL } | { error: string }> {
  let current = start;
  for (let hop = 0; hop <= MAX_HOPS; hop += 1) {
    const blocked = await assertPublicHost(current.hostname);
    if (blocked) return { error: blocked };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; CreativeCompanionBot/1.0; +https://creative-companion.app)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    const isRedirect = res.status >= 300 && res.status < 400;
    if (!isRedirect) return { res, finalUrl: current };

    const location = res.headers.get("location");
    try {
      await res.body?.cancel();
    } catch {
      // Body already drained.
    }
    if (!location) return { res, finalUrl: current };

    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      return { error: "That link redirects somewhere invalid" };
    }
    if (next.protocol !== "http:" && next.protocol !== "https:") {
      return { error: "That link redirects to an unsupported protocol" };
    }
    current = next;
  }
  return { error: "That link redirects too many times" };
}

function firstMatch(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? decodeEntities(m[1].trim()) : "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function metaContent(html: string, attr: "property" | "name", key: string): string {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const reAlt = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`,
    "i"
  );
  return firstMatch(html, re) || firstMatch(html, reAlt);
}

function resolveUrl(base: string, maybeRelative: string): string {
  if (!maybeRelative) return "";
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return json({ ok: false, error: "Missing url" }, 400);
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return json({ ok: false, error: "Invalid url" }, 400);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return json({ ok: false, error: "Unsupported protocol" }, 400);
    }

    const fetched = await safeFetch(parsed);
    if ("error" in fetched) {
      // 200 so the board shows the message in place rather than treating it as
      // a transport failure — same shape as the "Fetch failed" branch below.
      return json({ ok: false, error: fetched.error });
    }
    const { res, finalUrl } = fetched;

    if (!res.ok) {
      try {
        await res.body?.cancel();
      } catch {
        // Body already drained.
      }
      return json({ ok: false, error: `Fetch failed (${res.status})` });
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.startsWith("image/")) {
      try {
        await res.body?.cancel();
      } catch {
        // Body already drained.
      }
      return json({
        ok: true,
        isImage: true,
        url: finalUrl.toString(),
        host: finalUrl.host,
      });
    }

    const html = await readCapped(res, MAX_BYTES);

    const ogTitle = metaContent(html, "property", "og:title");
    const title = ogTitle || firstMatch(html, /<title[^>]*>([^<]*)<\/title>/i);
    const ogImage = metaContent(html, "property", "og:image");
    const ogDescription =
      metaContent(html, "property", "og:description") ||
      metaContent(html, "name", "description");

    return json({
      ok: true,
      isImage: false,
      url: finalUrl.toString(),
      host: finalUrl.host,
      title: title || finalUrl.host,
      image: resolveUrl(finalUrl.toString(), ogImage),
      description: ogDescription.slice(0, 280),
    });
  } catch (err) {
    return json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});
