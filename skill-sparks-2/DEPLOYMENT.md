# Skill Sparks 2.0 — Vercel Deployment Checklist

## Environment variables

### Frontend (set in Vercel → Project → Settings → Environment Variables)
These are baked into the build at deploy time. The anon key is safe to expose
in the browser (Row Level Security protects the data).

| Variable | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://wdugjmdoicitrsyvivmc.supabase.co` | Public |
| `VITE_SUPABASE_ANON_KEY` | *(Supabase → Settings → API → anon public key)* | Public, RLS-protected |

### Server-side only (Edge Functions — already configured in Supabase)
These are auto-provided by Supabase to Edge Functions. **Never** put them in
Vercel frontend env vars or in any client code.

| Variable | Where it lives |
|---|---|
| `SUPABASE_URL` | Auto-provided to Edge Functions |
| `SUPABASE_ANON_KEY` | Auto-provided to Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided to Edge Functions (secret — never in browser) |
| `SITE_URL` | Supabase secret — **update to production URL after deploy** |

## After you share the production URL, I will update:
1. Supabase Auth `site_url` → production URL
2. Supabase Auth `uri_allow_list` → production URL + `/**`
3. Edge Function secret `SITE_URL` → production URL
4. Verify: login, approval, activation email redirect on the live domain

## Deploy settings (Vercel)
- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Root Directory: `skill-sparks-2` (if the repo root is the parent folder)

Routing uses URL hash (`#/courses`, `#/login`, …) so no server rewrites are
needed. `vercel.json` in this folder already sets framework/build/output.

## Current state (do not change)
- Supabase project `wdugjmdoicitrsyvivmc` — schema, RLS, Edge Functions live
- Default Supabase SMTP kept for development/testing
- Admin: `admin@skillsparks.id` (change password after first login)
