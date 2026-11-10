-- SKILL SPARKS 2.0 — Supabase / PostgreSQL schema (v2: approval workflow)
-- Run in Supabase SQL Editor. Auth: Supabase Auth (email/password).
-- profiles.id = auth.users.id. Admin actions go through Edge Functions
-- using the service-role key (server-side ONLY).

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','student')),
  name text not null,
  email text unique not null,
  age text, school text, parent_name text, whatsapp text, device text, notes text,
  account_status text not null default 'invited' check (account_status in ('invited','active','suspended')),
  xp int not null default 0,
  created_at timestamptz default now()
);

-- Student self-registration applications (PENDING → APPROVED/REJECTED)
create table public.student_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  age text, school text, parent_name text, whatsapp text, device text, notes text,
  course_id uuid references public.courses(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text default '',
  created_at timestamptz default now(),
  decided_at timestamptz
);
create index idx_applications_status on public.student_applications(status);
create index idx_applications_email on public.student_applications(email);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'CODING',
  badge text not null default 'BEGINNER',
  description text not null,
  difficulty text not null default 'Beginner',
  instructor text not null default '',
  duration text not null default '8 weeks',
  sessions int not null default 8,
  max_students int not null default 15,
  published boolean not null default true,
  color text not null default '#A855F7',
  emoji text not null default '🚀',
  created_at timestamptz default now()
);

create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  status text not null default 'active',
  progress int not null default 0,
  unique(student_id, course_id)
);

create table public.instructors (
  id uuid primary key default gen_random_uuid(),
  name text not null, specialty text default '', email text default ''
);

create table public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  instructor text not null default '',
  title text not null,
  class_date date not null,
  start_time time not null, end_time time not null,
  timezone text not null default 'Asia/Jakarta',
  zoom_url text default '',
  description text default '',
  session_number int not null default 1,
  status text not null default 'upcoming' check (status in ('upcoming','live','completed','rescheduled')),
  published boolean not null default false,
  created_at timestamptz default now()
);

create table public.class_students (
  class_id uuid references public.class_schedules(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  primary key (class_id, student_id)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null, body text not null,
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  title text not null, body text default '',
  is_read boolean default false,
  created_at timestamptz default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  title text not null, description text default '', due_date date
);

create table public.student_projects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete set null,
  student_name text not null,
  title text not null, category text not null default 'Games',
  description text default '', emoji text default '🎮',
  color text default '#A855F7',
  created_at timestamptz default now()
);

create table public.student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  completed_lessons int not null default 0,
  attendance int not null default 0,
  unique(student_id, course_id)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  code text not null, name text not null, emoji text not null,
  earned_at timestamptz default now(),
  unique(student_id, code)
);

-- Seed the 3 real course offerings (from the original website)
insert into public.courses (title, category, badge, description, difficulty, duration, sessions, color, emoji) values
('Scratch Coding','CODING','BEGINNER','Learn to create your own games, animations, and interactive projects.','Beginner','8 weeks',8,'#FF8A00','🧩'),
('Canva Design','DESIGN','BEGINNER','Learn to design posters, social media content, and creative graphics.','Beginner','6 weeks',6,'#00E5FF','🎨'),
('Roblox Game Development','GAME DEV','BEGINNER','Learn to create your own games using Roblox Studio.','Beginner','10 weeks',10,'#FF4F7B','🎮')
on conflict do nothing;

-- ── Storage buckets ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('course-images','course-images', true),
  ('student-projects','student-projects', true),
  ('instructor-avatars','instructor-avatars', true),
  ('website-assets','website-assets', true)
on conflict (id) do nothing;

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.student_applications enable row level security;
alter table public.courses enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.instructors enable row level security;
alter table public.class_schedules enable row level security;
alter table public.class_students enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.assignments enable row level security;
alter table public.student_projects enable row level security;
alter table public.student_progress enable row level security;
alter table public.achievements enable row level security;

-- Public: read published courses, showcase projects, announcements
create policy "public read published courses" on public.courses for select using (published = true);
create policy "public read projects" on public.student_projects for select using (true);
create policy "public read announcements" on public.announcements for select using (true);
-- Public: submit registration applications (INSERT only, no read)
create policy "public submit applications" on public.student_applications for insert with check (status = 'pending');
-- Students: own data only
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own enrollments" on public.course_enrollments for select using (auth.uid() = student_id);
create policy "own notifications" on public.notifications for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
create policy "own achievements" on public.achievements for select using (auth.uid() = student_id);
create policy "own progress" on public.student_progress for select using (auth.uid() = student_id);
-- Students: schedules for their enrolled courses (zoom_url included ONLY here)
create policy "enrolled schedules" on public.class_schedules for select using (
  published = true and exists (
    select 1 from public.course_enrollments e
    where e.student_id = auth.uid() and e.course_id = class_schedules.course_id
  )
);
-- NOTE: Admin operations (approve/reject, course & schedule management,
-- Zoom URL writes) run through Edge Functions / server API routes using the
-- service-role key after verifying profiles.role = 'admin'. The service-role
-- key must NEVER appear in frontend code.

-- ── First admin setup (run once, after creating the user in Auth dashboard) ─
-- 1. Supabase Dashboard → Authentication → Users → Add user (email + password)
-- 2. Run this (replace the email):
--    insert into public.profiles (id, role, name, email, account_status)
--    select id, 'admin', 'Admin', email, 'active' from auth.users where email = 'you@email.com';
-- Only this initial admin can promote others (via Edge Function).
