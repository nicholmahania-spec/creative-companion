# Supabase setup (Creative Companion)

## 1. Create a project
1. https://supabase.com → New project  
2. Save the database password  

## 2. Run the schema
1. Dashboard → **SQL Editor** → New query  
2. Paste contents of `supabase/schema.sql`  
3. **Run**

## 3. Auth
1. **Authentication → Providers → Email** → enable  
2. For local testing you can turn **off** “Confirm email” under Auth settings  

## 4. Local env
```bash
cp .env.example .env.local
```

Fill from **Project Settings → API**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (public anon key only)

```bash
npm run dev
```

## 5. GitHub Pages
Repo → **Settings → Secrets and variables → Actions** add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The Pages workflow injects them at build time.

## 6. Auth redirect (optional)
Authentication → URL configuration:
- Site URL: `https://nicholmahania-spec.github.io/creative-companion/`
- Redirect URLs: same + `http://127.0.0.1:5173/**`

## How sync works
- Sign in → pull `user_workspaces.payload` for your user  
- If cloud empty and this browser has data → upload local desk  
- Edits debounce-push (~1.2s) to Supabase  
- localStorage still caches for speed / offline feel  

## Security
- RLS: users only read/write their own row  
- Never ship the **service_role** key in the app  

## Known advisories, and why they stay

`get_advisors(security)` reports these every run. Both were checked
2026-08-06; neither is an action item, and this note exists so they are not
re-investigated each time.

**Leaked-password protection is disabled — and cannot be enabled on this
plan.** Supabase gates it behind Pro and above; this organization is on
`free`, so the toggle is unavailable rather than merely unset. What IS
available on free, on the same page (Authentication → Providers → Email), is
a longer minimum password length and required character classes. Worth
keeping in proportion: it only affects designers signing up to the app.
Clients never authenticate — they open a portal link.

**~16 `SECURITY DEFINER` functions are executable by `anon`.** This is the
client portal's whole architecture: a client opening `/c/<id>` or `/d/<id>` is
not signed in, so `get_client_portal`, `submit_client_portal_form`,
`get_brand_delivery` and the rest have to be reachable without a session.

The two worth re-reading before dismissing are the ones that DELETE —
`discard_decision` and `discard_retained_version`. Both were read in full
rather than assumed safe: each deletes `where id = p_id and owner_id =
auth.uid()`, and for an anonymous caller `auth.uid()` is NULL, so nothing
matches and nothing is removed. Both also pin `search_path`. So
`project_conflicts` — the retention table the entire sync design depends on —
is not reachable by an anonymous caller. The advisory flags executability,
not a hole.

If a NEW `SECURITY DEFINER` function appears in that list, do not wave it
through on the strength of this note. Read its body and check it guards on
`auth.uid()` or a portal id it validates.
