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
