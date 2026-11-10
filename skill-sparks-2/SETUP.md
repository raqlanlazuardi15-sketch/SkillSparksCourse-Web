# Skill Sparks 2.0 — Production Setup Guide (v2: Approval Workflow)

## Flow
Visitor registers → application saved as **PENDING** → Admin reviews in
**Student Applications** → APPROVE creates a Supabase Auth user (INVITED) +
enrollment via the `approve-student` Edge Function → student sets password
via activation link → account **ACTIVE** → can log in. REJECT stores a reason;
the student may re-apply. Pending/rejected applicants cannot log in.

## 1. Supabase (turn the Supabase app ON in Arena, then:)
1. Create/open project → SQL Editor → run `supabase/schema.sql`
   (creates all 12 tables, RLS, storage buckets, seeds the 3 real courses).
2. First admin: Dashboard → Authentication → Users → Add user (email+password),
   then run the SQL snippet at the bottom of schema.sql to set role=admin.
3. Deploy Edge Function: `supabase functions deploy approve-student`
   with secrets SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SITE_URL.
4. Configure SMTP in Auth settings to enable activation emails
   (otherwise the function returns a warning + manual activation path).

## 2. App env vars (never hardcode keys)
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY in .env.local / Vercel settings.
SUPABASE_SERVICE_ROLE_KEY lives ONLY in Edge Function secrets.

## 3. Deploy (Vercel)
Push to GitHub → import in Vercel → Vite → build `npm run build`.

## 4. Google Sheet dual-write
Registrations still forward to the original Apps Script Sheet
(LEGACY_SCRIPT_URL in src/lib/db.ts). Remove once migration is confirmed.

## Demo mode (no Supabase yet)
Data lives in browser localStorage. No demo accounts exist — create the
first admin via "Setup: Buat Admin Pertama" on the login page (only shown
while zero admins exist), then test: Register → Admin → Applications →
Approve → copy activation link → Activate → Login.
