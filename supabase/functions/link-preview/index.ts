// Fetches a URL server-side and extracts a lightweight link preview
// (title, image, description, source host) so the Research board can
// show a real preview card for pasted links instead of assuming the
// URL points directly at an image. Runs server-side because browsers
// block cross-origin HTML fetches from client JS (CORS).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
      return new Response(JSON.stringify({ ok: false, error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new Response(
        JSON.stringify({ ok: false, error: "Unsupported protocol" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(parsed.toString(), {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; CreativeCompanionBot/1.0; +https://creative-companion.app)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Fetch failed (${res.status})` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.startsWith("image/")) {
      return new Response(
        JSON.stringify({
          ok: true,
          isImage: true,
          url: parsed.toString(),
          host: parsed.host,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = (await res.text()).slice(0, 300_000);

    const ogTitle = metaContent(html, "property", "og:title");
    const title = ogTitle || firstMatch(html, /<title[^>]*>([^<]*)<\/title>/i);
    const ogImage = metaContent(html, "property", "og:image");
    const ogDescription =
      metaContent(html, "property", "og:description") ||
      metaContent(html, "name", "description");

    return new Response(
      JSON.stringify({
        ok: true,
        isImage: false,
        url: parsed.toString(),
        host: parsed.host,
        title: title || parsed.host,
        image: resolveUrl(parsed.toString(), ogImage),
        description: ogDescription.slice(0, 280),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
