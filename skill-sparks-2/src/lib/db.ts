// ─────────────────────────────────────────────────────────────────────────────
// SKILL SPARKS 2.0 — Supabase data layer (production)
// Project: wdugjmdoicitrsyvivmc (ap-southeast-2)
// All data comes from Supabase. No mock data. RLS enforced server-side.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase, SUPABASE_URL } from './supabase';

export interface Course {
  id: string; title: string; category: string; badge: string;
  description: string; difficulty: string; instructor: string;
  duration: string; sessions: number; maxStudents: number;
  enrolled: number; published: boolean; color: string; emoji: string;
}
export type AppStatus = 'pending' | 'approved' | 'rejected';
export interface Application {
  id: string; name: string; email: string; age: string; school: string;
  parent: string; whatsapp: string; device: string; notes: string;
  courseId: string; status: AppStatus; rejectionReason: string;
  createdAt: string; decidedAt: string | null;
}
export interface Student {
  id: string; name: string; email: string; age: string; school: string;
  parent: string; whatsapp: string; device: string; notes: string;
  courseIds: string[]; accountStatus: 'invited' | 'active' | 'suspended';
  xp: number; completedLessons: number; attendance: number;
}
export interface Instructor { id: string; name: string; specialty: string; email: string; }
export interface ClassSchedule {
  id: string; courseId: string; instructor: string; title: string;
  date: string; start: string; end: string; timezone: string;
  zoomUrl: string; description: string; sessionNumber: number;
  status: 'upcoming' | 'live' | 'completed' | 'rescheduled';
  published: boolean; studentIds: string[];
}
export interface Announcement { id: string; title: string; body: string; createdAt: string; }
export interface AppNotification { id: string; studentId: string; title: string; body: string; read: boolean; createdAt: string; }
export interface Project { id: string; studentName: string; title: string; category: string; description: string; emoji: string; color: string; studentId?: string; }

export const LEGACY_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwFu0IG2EF0QJoR4o_7S3LBrCuYewdW05nA3zBg-nk1MID7wxfncjf7NwXjXkjAkuD4UA/exec';

// ── Row mappers ─────────────────────────────────────────────────────────────
const mapCourse = (r: any): Course => ({
  id: r.id, title: r.title, category: r.category, badge: r.badge, description: r.description,
  difficulty: r.difficulty, instructor: r.instructor, duration: r.duration, sessions: r.sessions,
  maxStudents: r.max_students, enrolled: r.enrolled_count ?? 0, published: r.published,
  color: r.color, emoji: r.emoji,
});
const mapApp = (r: any): Application => ({
  id: r.id, name: r.name, email: r.email, age: r.age || '', school: r.school || '',
  parent: r.parent_name || '', whatsapp: r.whatsapp || '', device: r.device || '',
  notes: r.notes || '', courseId: r.course_id, status: r.status,
  rejectionReason: r.rejection_reason || '', createdAt: r.created_at, decidedAt: r.decided_at,
});
const mapClass = (r: any, studentIds: string[] = []): ClassSchedule => ({
  id: r.id, courseId: r.course_id, instructor: r.instructor, title: r.title,
  date: r.class_date, start: r.start_time?.slice(0, 5), end: r.end_time?.slice(0, 5),
  timezone: r.timezone, zoomUrl: r.zoom_url || '', description: r.description || '',
  sessionNumber: r.session_number, status: r.status, published: r.published, studentIds,
});
const mapProject = (r: any): Project => ({
  id: r.id, studentName: r.student_name, title: r.title, category: r.category,
  description: r.description || '', emoji: r.emoji, color: r.color, studentId: r.student_id || undefined,
});

// ── Public data ─────────────────────────────────────────────────────────────
export async function fetchCourses(): Promise<Course[]> {
  const { data } = await supabase.from('courses').select('*').eq('published', true).order('created_at');
  return (data || []).map(mapCourse);
}
export async function fetchProjects(): Promise<Project[]> {
  const { data } = await supabase.from('student_projects').select('*').order('created_at', { ascending: false });
  return (data || []).map(mapProject);
}
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  return (data || []).map(r => ({ id: r.id, title: r.title, body: r.body, createdAt: r.created_at }));
}
export async function fetchPublicClasses(): Promise<ClassSchedule[]> {
  const { data } = await supabase.from('class_schedules').select('*').eq('published', true).order('class_date');
  return (data || []).map(r => mapClass({ ...r, zoom_url: '' })); // Zoom URLs never public
}

// ── Registration → PENDING application ──────────────────────────────────────
export async function submitApplication(d: Omit<Application, 'id' | 'status' | 'rejectionReason' | 'createdAt' | 'decidedAt'>): Promise<{ ok: boolean; error?: string }> {
  const email = d.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Format email belum benar.' };
  const { error } = await supabase.from('student_applications').insert({
    name: d.name.trim(), email, age: d.age.trim(), school: d.school.trim(),
    parent_name: d.parent.trim(), whatsapp: d.whatsapp.trim(), device: d.device,
    notes: d.notes.trim(), course_id: d.courseId, status: 'pending',
  });
  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') return { ok: false, error: 'Email ini sudah terdaftar. Cek status pendaftaranmu di bawah.' };
    return { ok: false, error: 'Gagal mengirim pendaftaran. Coba lagi.' };
  }
  // Dual-write to original Google Sheet (best-effort)
  try {
    const { data: course } = await supabase.from('courses').select('title').eq('id', d.courseId).single();
    await fetch(LEGACY_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({
      kelas: course?.title || '', nama: d.name, usia: d.age, sekolah: d.school,
      ortu: d.parent, wa: d.whatsapp, email, perangkat: d.device, catatan: d.notes,
    }) });
  } catch { /* offline — application already saved */ }
  return { ok: true };
}

export async function checkApplicationStatus(email: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('check-status', { body: { email } });
  if (error || !data) return 'Tidak bisa memeriksa status. Coba lagi.';
  if (data.status === 'none') return 'Belum ada pendaftaran dengan email ini.';
  if (data.status === 'pending') return '⏳ PENDING — Pendaftaranmu sedang menunggu persetujuan guru.';
  if (data.status === 'approved') return '✅ APPROVED — Akunmu sudah dibuat! Cek email untuk link aktivasi, lalu login.';
  return `❌ REJECTED — ${data.rejection_reason || 'Pendaftaran ditolak.'} Kamu bisa mengajukan lagi.`;
}

// ── Auth ────────────────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<{ ok: boolean; role?: 'admin' | 'student'; error?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user) return { ok: false, error: 'Email atau password salah.' };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
  if (!profile) { await supabase.auth.signOut(); return { ok: false, error: 'Profil tidak ditemukan. Hubungi admin.' }; }
  if (profile.role === 'student') {
    if (profile.account_status === 'invited') { await supabase.auth.signOut(); return { ok: false, error: 'Akunmu belum diaktifkan. Gunakan link aktivasi dari email/guru.' }; }
    if (profile.account_status === 'suspended') { await supabase.auth.signOut(); return { ok: false, error: 'Akunmu sedang ditangguhkan. Hubungi admin Skill Sparks.' }; }
  }
  return { ok: true, role: profile.role };
}
export async function logout() { await supabase.auth.signOut(); }
export async function getProfile(): Promise<any | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data || null;
}

// ── Admin ───────────────────────────────────────────────────────────────────
export async function fetchApplications(): Promise<Application[]> {
  const { data } = await supabase.from('student_applications').select('*').order('created_at', { ascending: false });
  return (data || []).map(mapApp);
}
export async function approveApplication(appId: string): Promise<{ ok: boolean; message?: string; warning?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('approve-student', { body: { applicationId: appId } });
  if (error || data?.error) return { ok: false, error: data?.error || 'Approval failed. Check Edge Function logs.' };
  return { ok: true, message: data.message, warning: data.warning };
}
export async function rejectApplication(appId: string, reason: string): Promise<{ ok: boolean }> {
  await supabase.from('student_applications').update({ status: 'rejected', rejection_reason: reason.trim(), decided_at: new Date().toISOString() }).eq('id', appId);
  return { ok: true };
}
export async function fetchStudents(): Promise<Student[]> {
  const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'student').order('created_at');
  const { data: enrollments } = await supabase.from('course_enrollments').select('*');
  const { data: progress } = await supabase.from('student_progress').select('*');
  return (profiles || []).map((p: any) => ({
    id: p.id, name: p.name, email: p.email, age: p.age || '', school: p.school || '',
    parent: p.parent_name || '', whatsapp: p.whatsapp || '', device: p.device || '', notes: p.notes || '',
    courseIds: (enrollments || []).filter((e: any) => e.student_id === p.id).map((e: any) => e.course_id),
    accountStatus: p.account_status, xp: p.xp || 0,
    completedLessons: (progress || []).find((x: any) => x.student_id === p.id)?.completed_lessons || 0,
    attendance: (progress || []).find((x: any) => x.student_id === p.id)?.attendance || 0,
  }));
}
export async function fetchInstructors(): Promise<Instructor[]> {
  const { data } = await supabase.from('instructors').select('*').order('name');
  return (data || []).map(r => ({ id: r.id, name: r.name, specialty: r.specialty || '', email: r.email || '' }));
}
export async function fetchAdminClasses(): Promise<ClassSchedule[]> {
  const { data } = await supabase.from('class_schedules').select('*').order('class_date');
  const { data: links } = await supabase.from('class_students').select('*');
  return (data || []).map((r: any) => mapClass(r, (links || []).filter((l: any) => l.class_id === r.id).map((l: any) => l.student_id)));
}
export async function saveCourse(c: Course): Promise<void> {
  const row = {
    title: c.title, category: c.category, badge: c.badge, description: c.description,
    difficulty: c.difficulty, instructor: c.instructor, duration: c.duration,
    sessions: c.sessions, max_students: c.maxStudents, published: c.published,
    color: c.color, emoji: c.emoji,
  };
  if (c.id) await supabase.from('courses').update(row).eq('id', c.id);
  else await supabase.from('courses').insert(row);
}
export async function deleteCourse(id: string) { await supabase.from('courses').delete().eq('id', id); }
export async function saveClass(c: ClassSchedule): Promise<void> {
  const row = {
    course_id: c.courseId, instructor: c.instructor, title: c.title, class_date: c.date,
    start_time: c.start, end_time: c.end, timezone: c.timezone, zoom_url: c.zoomUrl,
    description: c.description, session_number: c.sessionNumber, status: c.status, published: c.published,
  };
  let id = c.id;
  if (id) await supabase.from('class_schedules').update(row).eq('id', id);
  else { const { data } = await supabase.from('class_schedules').insert(row).select('id').single(); id = data?.id; }
  if (id && c.studentIds.length) {
    await supabase.from('class_students').delete().eq('class_id', id);
    await supabase.from('class_students').insert(c.studentIds.map(sid => ({ class_id: id, student_id: sid })));
  }
  if (c.published) {
    const targets = c.studentIds.length ? c.studentIds : (await fetchStudents()).filter(s => s.courseIds.includes(c.courseId)).map(s => s.id);
    if (targets.length) await supabase.from('notifications').insert(targets.map(sid => ({
      student_id: sid, title: '📅 Class scheduled!', body: `${c.title} — ${c.date} at ${c.start} (${c.timezone})`,
    })));
  }
}
export async function deleteClass(id: string) { await supabase.from('class_schedules').delete().eq('id', id); }
export async function saveZoomLink(c: ClassSchedule, url: string): Promise<{ ok: boolean; error?: string }> {
  if (url && !/^https:\/\/(www\.)?zoom\.us\//.test(url)) return { ok: false, error: 'Please enter a valid Zoom URL (https://zoom.us/…)' };
  await supabase.from('class_schedules').update({ zoom_url: url }).eq('id', c.id);
  const targets = c.studentIds.length ? c.studentIds : (await fetchStudents()).filter(s => s.courseIds.includes(c.courseId)).map(s => s.id);
  if (targets.length) await supabase.from('notifications').insert(targets.map(sid => ({
    student_id: sid, title: '📹 Zoom link updated!', body: `New meeting link for "${c.title}".`,
  })));
  return { ok: true };
}
export async function postAnnouncement(title: string, body: string): Promise<void> {
  await supabase.from('announcements').insert({ title, body });
  const students = await fetchStudents();
  const active = students.filter(s => s.accountStatus === 'active');
  if (active.length) await supabase.from('notifications').insert(active.map(s => ({ student_id: s.id, title, body })));
}
export async function deleteAnnouncement(id: string) { await supabase.from('announcements').delete().eq('id', id); }
export async function addProject(p: Project): Promise<void> {
  await supabase.from('student_projects').insert({
    student_name: p.studentName, title: p.title, category: p.category,
    description: p.description, emoji: p.emoji, color: p.color, student_id: p.studentId || null,
  });
}
export async function deleteProject(id: string) { await supabase.from('student_projects').delete().eq('id', id); }
export async function setStudentStatus(id: string, status: 'active' | 'suspended') {
  await supabase.from('profiles').update({ account_status: status }).eq('id', id);
}
export async function assignCourse(studentId: string, courseId: string) {
  await supabase.from('course_enrollments').insert({ student_id: studentId, course_id: courseId });
}

// ── Student ─────────────────────────────────────────────────────────────────
export async function fetchMyData(profileId: string) {
  const { data: enrollments } = await supabase.from('course_enrollments').select('course_id').eq('student_id', profileId);
  const courseIds = (enrollments || []).map((e: any) => e.course_id);
  const { data: courses } = await supabase.from('courses').select('*').in('id', courseIds.length ? courseIds : ['00000000-0000-0000-0000-000000000000']);
  const { data: classes } = await supabase.from('class_schedules').select('*').eq('published', true).in('course_id', courseIds.length ? courseIds : ['00000000-0000-0000-0000-000000000000']).order('class_date');
  const { data: links } = await supabase.from('class_students').select('*').eq('student_id', profileId);
  const { data: notifs } = await supabase.from('notifications').select('*').eq('student_id', profileId).order('created_at', { ascending: false });
  const { data: projects } = await supabase.from('student_projects').select('*').eq('student_id', profileId);
  const { data: progress } = await supabase.from('student_progress').select('*').eq('student_id', profileId);
  const myClassIds = new Set((links || []).map((l: any) => l.class_id));
  return {
    courses: (courses || []).map(mapCourse),
    classes: (classes || []).filter((c: any) => myClassIds.size === 0 || myClassIds.has(c.id) || true).map((r: any) => mapClass(r)),
    notifications: (notifs || []).map((n: any) => ({ id: n.id, studentId: n.student_id, title: n.title, body: n.body, read: n.is_read, createdAt: n.created_at })),
    projects: (projects || []).map(mapProject),
    progress: progress || [],
  };
}
export async function markNotificationRead(id: string) {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}
export async function addXP(profileId: string, amount: number) {
  const { data } = await supabase.from('profiles').select('xp').eq('id', profileId).single();
  await supabase.from('profiles').update({ xp: (data?.xp || 0) + amount }).eq('id', profileId);
}
export async function updateProfile(profileId: string, name: string, school: string) {
  await supabase.from('profiles').update({ name, school }).eq('id', profileId);
}

// ── Helpers (unchanged) ─────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { code: 'first-class', name: 'First Class', emoji: '🎓', xp: 50 },
  { code: 'creative-explorer', name: 'Creative Explorer', emoji: '🎨', xp: 100 },
  { code: 'coding-beginner', name: 'Coding Beginner', emoji: '💻', xp: 100 },
  { code: 'project-creator', name: 'Project Creator', emoji: '🚀', xp: 150 },
  { code: 'consistent-learner', name: 'Consistent Learner', emoji: '⭐', xp: 200 },
];
export function levelFor(xp: number) { return Math.floor(xp / 200) + 1; }
export function classStatus(c: ClassSchedule): 'upcoming' | 'live' | 'completed' | 'rescheduled' {
  const now = new Date();
  const start = new Date(`${c.date}T${c.start}:00`);
  const end = new Date(`${c.date}T${c.end}:00`);
  if (c.status === 'completed') return 'completed';
  if (now >= start && now <= end) return 'live';
  if (now > end) return 'completed';
  return c.status === 'rescheduled' ? 'rescheduled' : 'upcoming';
}
export function countdownTo(c: ClassSchedule): string {
  const start = new Date(`${c.date}T${c.start}:00`).getTime() - Date.now();
  if (start <= 0) return 'Starting now!';
  const h = Math.floor(start / 3600000), m = Math.floor((start % 3600000) / 60000), s = Math.floor((start % 60000) / 1000);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}
export const DAILY_CHALLENGES = [
  'Draw your dream game character and give it a superpower!',
  'Make a Scratch sprite that dances when you press SPACE.',
  'Design a poster for a party that does not exist yet.',
  'Build a tiny Roblox obstacle course with 5 jumps.',
  'Create a story with 3 scenes using Scratch costumes.',
];
export function dailyChallenge(): string {
  const day = Math.floor(Date.now() / 86400000);
  return DAILY_CHALLENGES[day % DAILY_CHALLENGES.length];
}
export { SUPABASE_URL };
