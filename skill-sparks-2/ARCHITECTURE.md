# SKILL SPARKS 2.0 — Architecture Plan

## Phase 1 — Inspection findings (from `index (1).html`)
- Language: Indonesian. Font: Fredoka. Palette: blue #1636C9, yellow #FFD21F, orange #FF8A00.
- Courses: Scratch Coding (CODING), Canva Design (DESIGN), Roblox Game Development (GAME DEV).
- Registration fields preserved: kelas, nama, usia/kelas sekolah, sekolah, orang tua/wali, WhatsApp, email, perangkat, catatan + honeypot anti-bot.
- Backend: Google Apps Script Web App → Spreadsheet. URL preserved in `src/lib/db.ts` as `LEGACY_SCRIPT_URL`. New app saves registrations to the DB *and* forwards to Apps Script (dual-write) so no existing data is lost.
- Capacity default: 15 students/class — configurable per course in Admin.

## Phase 2 — Design system
- Black base `#050505`, neon purple `#A855F7`, electric green `#22FF88`, cyan `#00E5FF`, yellow `#FFD21F`, pink `#FF4F7B`.
- Fredoka (display) + Outfit (body). Rounded 24–32px cards, glassmorphism, chunky offset shadows (playful, not generic).
- Original identity inspired by the reference festival look — not a copy.

## Phase 3–7 — App structure (this repo)
```
src/
  lib/db.ts        Data layer: types, seed data, CRUD, auth, XP/achievements.
                   Runs on localStorage in demo mode; same API maps 1:1 to Supabase.
  components/
    Hero3D.tsx     Three.js hero (floating shapes, particles, mouse parallax, WebGL fallback)
    Mascot.tsx     Animated SVG mascot "Sparky"
  pages/
    Admin.tsx      Admin dashboard (Overview, Courses, Students, Instructors,
                   Classes/Schedule, Zoom, Announcements, Projects, Settings)
    Student.tsx    Student dashboard (My Courses, Schedule + JOIN ZOOM, Progress,
                   Notifications, Profile, Gallery, Challenge)
  App.tsx          Public site (Nav, Hero, Courses, How It Works, Experience,
                   Showcase, CTA, Footer) + Register + Login + hash router
supabase/schema.sql  Production PostgreSQL schema + RLS policies
.env.example         Supabase keys template
```

## Phase 4 — Backend / production migration
Demo mode uses a localStorage data layer so the app runs instantly with zero setup.
To go live: create a Supabase project, run `supabase/schema.sql`, set
`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, and swap the data layer
functions in `src/lib/db.ts` for Supabase queries (function signatures stay the same).
Never expose the service-role key in frontend code.

## Demo accounts
- Admin: `admin@skillsparks.id` / `admin123`
- Student: `siswa@skillsparks.id` / `siswa123` (enrolled in Scratch Coding)
- Or register a new student from the public Register form, then log in.

## Security notes
- Role checks happen in the data layer + route guards (not just hidden buttons).
- Zoom URLs are only returned for enrolled students of that class.
- Passwords are hashed in production via Supabase Auth; demo mode stores them
  locally only for evaluation — do not use demo mode with real student data.
