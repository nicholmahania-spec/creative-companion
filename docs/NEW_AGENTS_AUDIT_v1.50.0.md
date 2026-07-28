# New agents + skills audit — Creative Companion v1.50.0

**Date:** 2026-07-27 · **Commit:** `bf21fbd`  
**Baseline:** Node v26.5 · **177 tests** · **build green**  
**Method:** Six specialist agents + deploy-safety / schema-ripple / supabase-rls-guardrails mindsets. Static code audit; Supabase MCP not available for live `pg_policies`.

---

## What ran

| Agent | Score | One-line |
|-------|------:|----------|
| `backend-security-auditor` | **5.5/10** | RPC pattern good; storage SQL missing; proxy open mode; portal leaks |
| `deploy-config-auditor` | **9/10** | base / SPA / publicUrl solid; CI dual-base asserts thin |
| `data-integrity-auditor` | **6.5/10** | Define→path strong; deadline dual-home; export formatters weak |
| `performance-auditor` | **6.0/10** | Lazy views good; App god-shell + storage binary paths hurt |
| `pwa-reliability-auditor` | **7.0/10** | Network-first shell good; no JS precache; e2e overclaims |
| `copy-editor` | **Client 7.5 · Designer 7** | Mostly plain; Login Reset / onboard Skip / tip restates |

### Skills applied

| Skill | Result |
|-------|--------|
| `dev-env-guardrails` | Node 26 · tests 177 · build green |
| `deploy-safety` | PASS critical path |
| `schema-change-ripple` | Deadline + blankDetective + export formatters flagged |
| `supabase-rls-guardrails` | Pattern OK in schema.sql; storage/grants incomplete |
| `token-efficiency` | Audit-only |

---

## Scoreboard

| Domain | Score | Ship risk |
|--------|------:|-----------|
| Deploy / deep links | **9** | Low |
| PWA offline shell | **7** | Medium (claim honesty) |
| Copy (client) | **7.5** | Low |
| Copy (designer) | **7** | Low |
| Data integrity | **6.5** | Medium |
| Performance | **6** | Medium |
| Backend security | **5.5** | **High** if cloud/public used |

---

## Consensus top residuals

### P0 — trust / money / rebuild safety

1. **Client-uploads Storage + `is_client_upload_target`** — used in code, **not in `schema.sql`**. Live policies must be verified; check into repo.
2. **xAI proxy open mode** — no secret + empty Origin still serves; client model free; burn API budget. Fail closed in prod.
3. **Logo / version history localStorage** — full data URLs + 50 version snapshots with logoImage can exhaust quota (desk stops saving).

### P1 — product integrity

4. **Portal `get_client_portal` returns detective before form “sent”**  
5. **`respond_client_portal_step` ignores step_visibility / allowlist**  
6. **Unbounded portal chat / jsonb**  
7. **SECURITY DEFINER** — `search_path` missing `pg_temp`; no revoke/grant hygiene in schema  
8. **`forms` schema vs `forms_migration.sql` vs `formApi`** drift  
9. **link-preview SSRF + open CORS**  
10. **Deadline dual storage** (`project.deadline` vs `detective.projectDeadline`)  
11. **blankDetective incomplete**; templates/versions drop required fields; version restore no-op  
12. **Overview PDF / MD formatters** raw tokens for checklist/spectrum  
13. **App.jsx ~70 store subscriptions** — Define keystroke re-renders whole shell  
14. **PWA** — no JS/CSS precache; e2e offline doesn’t prove SW  
15. **Copy** — Login Reset, onboard Skip, audiencePains tip restates label  

### P2

- Deploy CI dual-base positive asserts; appPaths subpath unit tests  
- Font cut (8 families); lazy Supabase / public portals  
- Manifest icons + theme_color  
- Copy tips / multi-Home thin kicker  

---

## What’s solid (do not re-open)

- `base` never `./`; Netlify + Pages SPA fallback; `publicUrl` / `routePath`  
- Owner RLS + DEFINER RPC pattern for discovery/portal tables  
- Single-use discovery submit / portal form submit gates  
- Path Define done = `requiredReady`  
- Mood pin image downscale (1600)  
- Lazy path views; jspdf/lottie deferred  
- Work log relative language; Home brand-book honesty (designer)  
- Client soft error strings on public forms  

---

## Suggested PR stack (confirm before code)

| PR | Goal | Size |
|----|------|------|
| **1** | Proxy fail-closed + model allowlist (ops + small client) | S |
| **2** | Check storage SQL + is_client_upload_target into schema; live-verify | M |
| **3** | Logo downscale + strip binaries from version snapshots | S |
| **4** | Unify deadline; blankDetective from chapters | S–M |
| **5** | Portal RPC: redact answers until sent; step visibility; body caps | M |
| **6** | Copy: Reset/Skip/tips + multi-Home thin kicker | S |
| **7** | PWA: shell put keys + HTTP cache headers; e2e honesty | S–M |

---

## Bottom line

Deploy path is **production-ready**. Security score is the ceiling limiter for **cloud + public client links**. Data integrity on the designer Define→path spine is good; export/templates/deadline need one honesty pass. Performance is “fine until Define typing jank / storage cliff.”

No product code changed this audit.
