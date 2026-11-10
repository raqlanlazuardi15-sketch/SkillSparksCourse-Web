import { useEffect, useState } from 'react';
import Hero3D from './components/Hero3D';
import Mascot from './components/Mascot';
import Admin from './pages/Admin';
import Student from './pages/Student';
import { supabase } from './lib/supabase';
import {
  fetchCourses, fetchProjects, fetchAnnouncements, fetchPublicClasses,
  submitApplication, checkApplicationStatus, login, logout, getProfile,
  type Course, type Project, type Announcement, type ClassSchedule,
} from './lib/db';

type Route = 'home' | 'courses' | 'schedule' | 'about' | 'register' | 'login' | 'activate' | 'admin' | 'student';

function useRoute(): [Route, (r: Route) => void] {
  const parse = (): Route => {
    const h = location.hash.replace('#', '').split('?')[0] as Route;
    return ['home', 'courses', 'schedule', 'about', 'register', 'login', 'activate', 'admin', 'student'].includes(h) ? h : 'home';
  };
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [route, (r) => { location.hash = r; }];
}

export default function App() {
  const [route, go] = useRoute();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);

  const loadPublic = async () => {
    const [c, p, a, k] = await Promise.all([fetchCourses(), fetchProjects(), fetchAnnouncements(), fetchPublicClasses()]);
    setCourses(c); setProjects(p); setAnnouncements(a); setClasses(k);
  };
  const loadProfile = async () => setProfile(await getProfile());

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1400);
    loadPublic(); loadProfile();
    const { data: sub } = supabase.auth.onAuthStateChange(() => loadProfile());
    return () => { clearTimeout(t); sub.subscription.unsubscribe(); };
  }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [route]);

  const refresh = () => { loadPublic(); loadProfile(); };

  if (route === 'admin') {
    if (!profile || profile.role !== 'admin') return <Guard go={go} msg="Area admin khusus. Silakan login sebagai admin." />;
    return <Admin go={go} refresh={refresh} />;
  }
  if (route === 'student') {
    if (!profile || profile.role !== 'student' || profile.account_status !== 'active')
      return <Guard go={go} msg="Silakan login sebagai siswa untuk membuka dashboard." />;
    return <Student go={go} refresh={refresh} />;
  }

  return (
    <>
      <div className={`loader ${loading ? '' : 'hide'}`} aria-hidden={loading ? undefined : true}>
        <div className="spark">⚡</div>
        <p>SKILL <b>SPARKS</b></p>
        <div className="bar"><i /></div>
      </div>

      <Nav route={route} go={go} profile={profile} />
      {route === 'home' && <Home go={go} courses={courses} projects={projects} announcements={announcements} />}
      {route === 'courses' && <CoursesPage go={go} courses={courses} />}
      {route === 'schedule' && <SchedulePage classes={classes} courses={courses} />}
      {route === 'about' && <AboutPage go={go} />}
      {route === 'register' && <RegisterPage go={go} courses={courses} />}
      {route === 'login' && <LoginPage go={go} refresh={refresh} />}
      {route === 'activate' && <ActivatePage go={go} refresh={refresh} />}
      <Footer go={go} />
    </>
  );
}

function Guard({ go, msg }: { go: (r: Route) => void; msg: string }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 60 }}>🔒</div>
        <h2 style={{ margin: '14px 0 8px' }}>Oops!</h2>
        <p style={{ color: 'var(--muted)' }}>{msg}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}>
          <button className="btn purple" onClick={() => go('login')}>Login</button>
          <button className="btn ghost" onClick={() => go('home')}>Ke Beranda</button>
        </div>
      </div>
    </div>
  );
}

/* ── Nav ─────────────────────────────────────────────────────────────────── */
function Nav({ route, go, profile }: { route: Route; go: (r: Route) => void; profile: any }) {
  const [open, setOpen] = useState(false);
  const link = (r: Route, label: string) => (
    <a key={r} href={`#${r}`} className={route === r ? 'on' : ''} onClick={() => setOpen(false)}>{label}</a>
  );
  return (
    <nav className="nav">
      <a href="#home" className="logo"><span className="bolt">⚡</span>SKILL<em>SPARKS</em></a>
      <button className="burger" aria-label="Menu" onClick={() => setOpen(!open)}>☰</button>
      <div className={`nav-links ${open ? 'open' : ''}`}>
        {link('home', 'Home')}
        {link('courses', 'Explore Courses')}
        {link('schedule', 'Schedule')}
        {link('about', 'About Us')}
        {profile?.role === 'student' && link('student', 'My Dashboard')}
        {profile?.role === 'admin' && link('admin', 'Admin Panel')}
        {!profile && link('login', 'Student Login')}
        {profile ? (
          <button className="btn ghost sm" onClick={async () => { await logout(); location.hash = 'home'; location.reload(); }}>Logout</button>
        ) : (
          <button className="btn sm" onClick={() => go('register')}>Register Now</button>
        )}
      </div>
    </nav>
  );
}

/* ── Home ────────────────────────────────────────────────────────────────── */
function Home({ go, courses, projects, announcements }: { go: (r: Route) => void; courses: Course[]; projects: Project[]; announcements: Announcement[] }) {
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    return () => io.disconnect();
  });
  return (
    <>
      <header className="hero">
        <div className="hero-glow" />
        <Hero3D />
        <div className="hero-inner">
          <span className="kicker">✨ ONLINE LEARNING FOR KIDS & TEENS</span>
          <h1><span className="l1">Turn Your Imagination</span><span className="l2">Into Something Amazing!</span></h1>
          <p>Learn coding, game development, and digital design through fun and interactive online classes.</p>
          <div className="hero-cta">
            <button className="btn purple" onClick={() => go('courses')}>🚀 Explore Courses</button>
            <button className="btn" onClick={() => go('register')}>⚡ Join Skill Sparks</button>
          </div>
          <div className="hero-stats">
            <div className="hstat"><b>{courses.length}+</b><span>Fun Courses</span></div>
            <div className="hstat"><b>15</b><span>Max / Class</span></div>
            <div className="hstat"><b>100%</b><span>Online</span></div>
            <div className="hstat"><b>Live</b><span>On Zoom</span></div>
          </div>
        </div>
        <div className="hero-mascot"><Mascot mood="wave" size={130} /></div>
        <div className="scroll-hint">SCROLL ▼</div>
      </header>

      {announcements.length > 0 && (
        <section className="section reveal" style={{ paddingBottom: 0 }}>
          <div className="panel" style={{ borderColor: 'rgba(255,210,31,.4)' }}>
            <h3>📢 {announcements[0].title}</h3>
            <p style={{ color: 'var(--muted)' }}>{announcements[0].body}</p>
          </div>
        </section>
      )}

      <section className="section reveal">
        <div className="sec-head">
          <span className="tag" style={{ background: 'rgba(168,85,247,.18)', color: '#d8b4fe' }}>🎮 OUR CLASSES</span>
          <h2>Pick Your Adventure</h2>
          <p>Small classes, big creativity. Every class is live, interactive, and project-based.</p>
        </div>
        <CourseGrid courses={courses} go={go} />
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <button className="btn ghost" onClick={() => go('courses')}>See All Courses →</button>
        </div>
      </section>

      <section className="section reveal">
        <div className="sec-head">
          <span className="tag" style={{ background: 'rgba(34,255,136,.15)', color: 'var(--green)' }}>🗺️ HOW IT WORKS</span>
          <h2>Your Learning Journey</h2>
        </div>
        <div className="steps">
          {[
            ['🎯', 'Choose Your Course', 'Pick Scratch, Canva, or Roblox — whatever sparks your curiosity.'],
            ['📝', 'Register & Get Approved', 'Submit your application. Your teacher reviews and approves it.'],
            ['💻', 'Activate & Join Class', 'Set your password from the activation email, then join live on Zoom.'],
            ['🏆', 'Create & Showcase', 'Build projects, earn XP, and show them off in the gallery!'],
          ].map(([ico, t, p], i) => (
            <div className="step" key={t}>
              <span className="num" style={{ background: ['var(--purple)', 'var(--cyan)', 'var(--yellow)', 'var(--pink)'][i] }}>{i + 1}</span>
              <span className="ico">{ico}</span><h3>{t}</h3><p>{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section reveal">
        <div className="sec-head">
          <span className="tag" style={{ background: 'rgba(0,229,255,.14)', color: 'var(--cyan)' }}>🌟 THE EXPERIENCE</span>
          <h2>Not Just Classes. An Adventure.</h2>
        </div>
        <div className="feat-grid">
          {[
            ['📹', 'Live Online Learning', 'Real instructors, real friends, real-time feedback on every project.'],
            ['🛠️', 'Interactive Projects', 'You build something every single session — games, posters, worlds.'],
            ['😊', 'Friendly Instructors', 'Patient mentors who speak kid-friendly language and celebrate progress.'],
            ['🎲', 'Creative Challenges', 'Weekly missions and a daily challenge to keep your brain buzzing.'],
            ['🏅', 'Student Achievements', 'Earn XP, level up, and unlock badges as you learn.'],
          ].map(([ico, t, p]) => (
            <div className="feat" key={t}><span className="ico">{ico}</span><h3>{t}</h3><p>{p}</p></div>
          ))}
        </div>
      </section>

      <Showcase projects={projects} />

      <section className="section reveal">
        <div className="cta">
          <span className="deco" style={{ top: 24, left: 30 }}>⭐</span>
          <span className="deco" style={{ bottom: 24, right: 30, animationDelay: '1s' }}>🚀</span>
          <span className="deco" style={{ top: 30, right: 60, animationDelay: '2s' }}>🎮</span>
          <h2>Ready to Create<br />Something Awesome?</h2>
          <p>Your idea. Your code. Your design. Seats are limited to 15 per class!</p>
          <button className="btn big" onClick={() => go('register')}>⚡ Register Now — It's Fun!</button>
        </div>
      </section>
    </>
  );
}

/* ── Course cards (shared) ───────────────────────────────────────────────── */
export function CourseGrid({ courses, go }: { courses: Course[]; go: (r: Route) => void }) {
  if (!courses.length) return <div className="empty"><span className="big">🌙</span>No courses open right now. Check back soon!</div>;
  return (
    <div className="course-grid">
      {courses.map(c => {
        const full = c.enrolled >= c.maxStudents;
        const pct = Math.min(100, Math.round((c.enrolled / c.maxStudents) * 100));
        return (
          <article className="course-card" key={c.id}>
            <div className="course-art" style={{ background: `linear-gradient(135deg, ${c.color}, #111)` }}><span>{c.emoji}</span></div>
            <div className="course-body">
              <div className="badges">
                <span className="badge" style={{ background: c.color }}>{c.category}</span>
                <span className="badge" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>{c.badge}</span>
              </div>
              <h3>{c.title}</h3>
              <p className="desc">{c.description}</p>
              <div className="meta">
                <span>📊 Level: <b>{c.difficulty}</b></span>
                <span>👩‍🏫 <b>{c.instructor || 'Skill Sparks Team'}</b></span>
                <span>⏱️ <b>{c.duration}</b></span>
                <span>📅 <b>{c.sessions} sessions</b></span>
              </div>
              <div className="seats"><i style={{ width: `${pct}%` }} /></div>
              <span className="seats-label">{full ? '⛔ Class full' : `🔥 ${c.enrolled}/${c.maxStudents} seats taken`}</span>
              <div className="course-actions">
                <button className="btn ghost sm" onClick={() => go('courses')}>View Details</button>
                <button className="btn sm" disabled={full} onClick={() => { sessionStorage.setItem('ss-course', c.id); go('register'); }}>{full ? 'Full' : 'Register'}</button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ── Showcase ────────────────────────────────────────────────────────────── */
const SHOW_CATS = ['All', 'Games', 'Digital Art', 'Animations', 'Creative Projects'];
function Showcase({ projects }: { projects: Project[] }) {
  const [cat, setCat] = useState('All');
  const list = projects.filter(p => cat === 'All' || p.category === cat);
  return (
    <section className="section reveal">
      <div className="sec-head">
        <span className="tag" style={{ background: 'rgba(255,79,123,.15)', color: 'var(--pink)' }}>🎨 STUDENT SHOWCASE</span>
        <h2>Made by Our Students</h2>
        <p>Real projects from real Skill Sparks creators.</p>
      </div>
      <div className="show-filters">
        {SHOW_CATS.map(c => <button key={c} className={`chip-btn ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      {list.length === 0 && <div className="empty"><span className="big">🎨</span>No projects yet — be the first to create something awesome!</div>}
      <div className="show-grid">
        {list.map(p => (
          <div className="show-card" key={p.id} style={{ background: `linear-gradient(150deg, ${p.color}33, #111)`, borderColor: `${p.color}66` }}>
            <span className="emoji">{p.emoji}</span>
            <span className="cat">{p.category.toUpperCase()}</span>
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <span className="by">by {p.studentName} ✨</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Courses page ────────────────────────────────────────────────────────── */
function CoursesPage({ go, courses }: { go: (r: Route) => void; courses: Course[] }) {
  const [q, setQ] = useState('');
  const list = courses.filter(c => (c.title + c.category + c.description).toLowerCase().includes(q.toLowerCase()));
  return (
    <section className="section" style={{ paddingTop: 130 }}>
      <div className="sec-head">
        <span className="tag" style={{ background: 'rgba(168,85,247,.18)', color: '#d8b4fe' }}>🎮 EXPLORE COURSES</span>
        <h2>Choose Your Class</h2>
        <p>All classes are live on Zoom, max 15 students per class.</p>
      </div>
      <div className="search-row" style={{ maxWidth: 520, margin: '0 auto 36px' }}>
        <input placeholder="🔍 Search courses…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <CourseGrid courses={list} go={go} />
    </section>
  );
}

/* ── Public schedule ─────────────────────────────────────────────────────── */
function SchedulePage({ classes, courses }: { classes: ClassSchedule[]; courses: Course[] }) {
  const upcoming = [...classes].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  return (
    <section className="section" style={{ paddingTop: 130 }}>
      <div className="sec-head">
        <span className="tag" style={{ background: 'rgba(0,229,255,.14)', color: 'var(--cyan)' }}>📅 CLASS SCHEDULE</span>
        <h2>Upcoming Classes</h2>
        <p>Zoom links are shared privately with enrolled students after login.</p>
      </div>
      {upcoming.length === 0 && <div className="empty"><span className="big">📭</span>No classes scheduled yet.</div>}
      {upcoming.map(c => {
        const course = courses.find(x => x.id === c.courseId);
        return (
          <div className="class-card" key={c.id}>
            <div className="when"><b>{c.date.slice(8)}</b><span>{new Date(c.date + 'T00:00').toLocaleDateString('en', { month: 'short' })}</span></div>
            <div className="info">
              <h4>{c.title}</h4>
              <p>{course?.emoji} {course?.title} · 👩‍🏫 {c.instructor} · 🕒 {c.start}–{c.end} ({c.timezone}) · Session {c.sessionNumber}</p>
            </div>
            <span className={`pill ${c.status === 'live' ? 'pink' : c.status === 'completed' ? 'gray' : 'green'}`}>{c.status.toUpperCase()}</span>
          </div>
        );
      })}
    </section>
  );
}

/* ── About ───────────────────────────────────────────────────────────────── */
function AboutPage({ go }: { go: (r: Route) => void }) {
  return (
    <section className="section" style={{ paddingTop: 130 }}>
      <div className="sec-head">
        <span className="tag" style={{ background: 'rgba(255,210,31,.15)', color: 'var(--yellow)' }}>💜 ABOUT US</span>
        <h2>We Help Kids Create<br />The Future</h2>
        <p>Skill Sparks is an online learning studio where children and teenagers learn coding, game development, and digital design by actually making things — not just watching videos.</p>
      </div>
      <div className="feat-grid">
        {[
          ['🎯', 'Our Mission', 'Make technology creative, friendly, and accessible for every young learner in Indonesia.'],
          ['👥', 'Small Classes', 'Maximum 15 students per class so every child gets attention and feedback.'],
          ['🛡️', 'Safe & Kid-Friendly', 'Live supervised Zoom classes, minimal personal data, and parent communication via WhatsApp.'],
          ['🚀', 'Project-Based', 'Every session ends with something you built yourself — a game, a poster, a world.'],
        ].map(([ico, t, p]) => (
          <div className="feat" key={t}><span className="ico">{ico}</span><h3>{t}</h3><p>{p}</p></div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 48 }}>
        <Mascot mood="cheer" size={110} />
        <h3 style={{ fontSize: 28, margin: '10px 0 18px' }}>Your Idea. Your Code. Your Design.</h3>
        <button className="btn" onClick={() => go('register')}>Join Skill Sparks ⚡</button>
      </div>
    </section>
  );
}

/* ── Register → PENDING application ──────────────────────────────────────── */
function RegisterPage({ go, courses }: { go: (r: Route) => void; courses: Course[] }) {
  const [form, setForm] = useState(() => ({
    courseId: sessionStorage.getItem('ss-course') || '',
    name: '', age: '', school: '', parent: '', whatsapp: '', email: '', device: '', notes: '', website: '',
  }));
  const [bad, setBad] = useState<Record<string, boolean>>({});
  const [alert, setAlert] = useState('');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [checkEmail, setCheckEmail] = useState('');
  const [checkResult, setCheckResult] = useState('');
  const set = (k: string, v: string) => { setForm({ ...form, [k]: v }); setBad({ ...bad, [k]: false }); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website) return;
    const b: Record<string, boolean> = {};
    if (!form.courseId) b.courseId = true;
    if (!form.name.trim()) b.name = true;
    if (!form.age.trim()) b.age = true;
    if (!form.parent.trim()) b.parent = true;
    if (!/^(\+?62|0)8\d{7,12}$/.test(form.whatsapp.replace(/[\s-]/g, ''))) b.whatsapp = true;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) b.email = true;
    if (!form.device) b.device = true;
    setBad(b);
    if (Object.values(b).some(Boolean)) return;
    setSending(true); setAlert('');
    const res = await submitApplication({
      name: form.name, email: form.email, age: form.age, school: form.school,
      parent: form.parent, whatsapp: form.whatsapp, device: form.device,
      notes: form.notes, courseId: form.courseId,
    });
    setSending(false);
    if (!res.ok) { setAlert(res.error || 'Gagal mendaftar.'); return; }
    setDone(true);
  };

  const F = ({ k, label, req, type = 'text', ph = '', full = false, children }: any) => (
    <div className={`field ${full ? 'full' : ''} ${bad[k] ? 'bad' : ''}`}>
      <label>{label} {req && <em>*</em>}</label>
      {children || <input type={type} placeholder={ph} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />}
      <div className="err">Periksa kembali kolom ini.</div>
    </div>
  );

  return (
    <section className="section" style={{ paddingTop: 130 }}>
      <div className="sec-head">
        <span className="tag" style={{ background: 'rgba(255,210,31,.15)', color: 'var(--yellow)' }}>📝 REGISTER</span>
        <h2>Formulir Pendaftaran</h2>
        <p>Isi data di bawah ini. Pendaftaranmu akan <b>ditinjau guru</b> terlebih dahulu — setelah disetujui, kamu akan menerima link aktivasi akun lewat email. Kuota maks. 15 siswa per kelas.</p>
      </div>
      <div className="form-panel">
        {done ? (
          <div className="success-box">
            <div className="big">📬</div>
            <h2 style={{ fontSize: 30, margin: '10px 0' }}>Registration submitted!</h2>
            <p style={{ color: 'var(--muted)' }}>Your application is waiting for teacher approval.</p>
            <span className="pill yellow" style={{ marginTop: 14, fontSize: 14 }}>⏳ STATUS: PENDING</span>
            <p style={{ color: 'var(--muted)', marginTop: 16, maxWidth: 480, marginInline: 'auto' }}>
              Terima kasih, <b>{form.name}</b>! Tim Skill Sparks akan meninjau pendaftaranmu.
              Setelah disetujui, kamu akan menerima email berisi link untuk mengaktifkan akun dan membuat password.
              Kamu <b>belum bisa login</b> sampai pendaftaran disetujui.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
              <button className="btn purple" onClick={() => go('home')}>Kembali ke Beranda</button>
              <button className="btn ghost" onClick={() => { setDone(false); setForm({ ...form, name: '', whatsapp: '', email: '' }); }}>Daftar peserta lain</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="hp"><label>Jangan diisi<input name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => set('website', e.target.value)} /></label></div>
            <div className="form-grid">
              <F k="courseId" label="Kelas yang dipilih" req full>
                <select value={form.courseId} onChange={e => set('courseId', e.target.value)}>
                  <option value="">— Pilih kelas —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </F>
              <F k="name" label="Nama siswa/siswi" req ph="Nama lengkap" />
              <F k="email" label="Email" req type="email" ph="nama@email.com" />
              <F k="age" label="Usia / kelas sekolah" req ph="mis. 12 tahun / kelas 6 SD" />
              <F k="school" label="Asal sekolah" ph="Opsional" />
              <F k="parent" label="Nama orang tua / wali" req />
              <F k="whatsapp" label="Nomor WhatsApp aktif" req type="tel" ph="08xxxxxxxxxx" />
              <F k="device" label="Perangkat yang akan dipakai" req>
                <select value={form.device} onChange={e => set('device', e.target.value)}>
                  <option value="">— Pilih perangkat —</option>
                  <option>Laptop / PC</option><option>Tablet</option><option>HP</option><option>Belum punya</option>
                </select>
              </F>
              <F k="notes" label="Catatan (opsional)" full>
                <textarea maxLength={500} value={form.notes} onChange={e => set('notes', e.target.value)} />
              </F>
            </div>
            <div className={`alert ${alert ? 'show' : ''}`}>{alert}</div>
            <button className="btn" style={{ marginTop: 22, width: '100%', justifyContent: 'center' }} disabled={sending}>
              {sending ? 'Mengirim…' : 'Kirim Pendaftaran ⚡'}
            </button>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
              Dengan mengirim formulir, kamu setuju datamu dipakai untuk keperluan pendaftaran kelas Skill Sparks.
            </p>
          </form>
        )}
      </div>

      <div className="form-panel" style={{ marginTop: 26 }}>
        <h3 style={{ fontSize: 20, marginBottom: 12 }}>🔍 Cek Status Pendaftaran</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input style={{ flex: 1, minWidth: 220, background: '#0c0c11', border: '1.5px solid var(--line)', borderRadius: 14, padding: '12px 16px', color: '#fff' }}
            type="email" placeholder="Email yang kamu daftarkan…" value={checkEmail} onChange={e => setCheckEmail(e.target.value)} />
          <button className="btn ghost sm" onClick={async () => setCheckResult(await checkApplicationStatus(checkEmail))}>Cek Status</button>
        </div>
        {checkResult && <p style={{ marginTop: 14, fontWeight: 700 }}>{checkResult}</p>}
      </div>
    </section>
  );
}

/* ── Login ───────────────────────────────────────────────────────────────── */
function LoginPage({ go, refresh }: { go: (r: Route) => void; refresh: () => void }) {
  const [tab, setTab] = useState<'student' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) { setErr(res.error || 'Login gagal.'); return; }
    if (tab === 'admin' && res.role !== 'admin') { await logout(); setErr('Akun ini bukan admin. Gunakan tab Student.'); return; }
    if (tab === 'student' && res.role !== 'student') { await logout(); setErr('Akun ini adalah admin. Gunakan tab Admin.'); return; }
    refresh(); go(res.role === 'admin' ? 'admin' : 'student');
  };

  return (
    <div className="auth-wrap">
      <div className="hero-glow" />
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Mascot mood="wave" size={90} />
          <h2 style={{ fontSize: 30, marginTop: 8 }}>Welcome Back!</h2>
          <p style={{ color: 'var(--muted)' }}>Login to continue your adventure.</p>
        </div>
        <div className="auth-tabs">
          <button className={tab === 'student' ? 'on' : ''} onClick={() => setTab('student')}>🎓 Student</button>
          <button className={tab === 'admin' ? 'on' : ''} onClick={() => setTab('admin')}>🛠️ Admin</button>
        </div>
        <form onSubmit={submit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className={`alert ${err ? 'show' : ''}`}>{err}</div>
          <button className="btn purple" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={busy}>
            {busy ? 'Logging in…' : tab === 'admin' ? 'Login as Admin' : 'Login as Student'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--muted)', fontSize: 14 }}>
          Belum punya akun? <a href="#register" style={{ color: 'var(--yellow)', fontWeight: 700 }}>Daftar di sini</a>
          {' '}·{' '}<a href="#register" style={{ color: 'var(--cyan)', fontWeight: 700 }}>Cek status pendaftaran</a>
        </p>
      </div>
    </div>
  );
}

/* ── Account activation (Supabase recovery link → set password) ──────────── */
function ActivatePage({ go, refresh }: { go: (r: Route) => void; refresh: () => void }) {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState(''); const [ok, setOk] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setReady(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { setMsg('Password tidak sama. Coba lagi.'); return; }
    if (pw.length < 8) { setMsg('Password minimal 8 karakter.'); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setMsg(error.message); return; }
    // Flip INVITED → ACTIVE now that the password is set
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').update({ account_status: 'active' }).eq('id', user.id);
    setOk(true); refresh();
  };

  return (
    <div className="auth-wrap">
      <div className="hero-glow" />
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Mascot mood="cheer" size={90} />
          <h2 style={{ fontSize: 28, marginTop: 8 }}>Activate Your Account 🎉</h2>
          <p style={{ color: 'var(--muted)' }}>Buat password untuk mulai belajar!</p>
        </div>
        {ok ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, color: 'var(--green)', fontSize: 18 }}>✅ Akun aktif! Sekarang login ya.</p>
            <button className="btn purple" style={{ marginTop: 18 }} onClick={() => go('login')}>Login Sekarang</button>
          </div>
        ) : !ready ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)' }}>⏳ Menunggu link aktivasi…<br />Klik link di email aktivasi kamu untuk membuka halaman ini.</p>
        ) : (
          <form onSubmit={submit}>
            <div className="field" style={{ marginBottom: 12 }}><label>Password baru (min. 8 karakter)</label>
              <input type="password" required value={pw} onChange={e => setPw(e.target.value)} /></div>
            <div className="field" style={{ marginBottom: 12 }}><label>Ulangi password</label>
              <input type="password" required value={pw2} onChange={e => setPw2(e.target.value)} /></div>
            {msg && <p style={{ color: 'var(--pink)', fontWeight: 700, marginBottom: 10 }}>{msg}</p>}
            <button className="btn" style={{ width: '100%', justifyContent: 'center' }}>Aktifkan Akun ⚡</button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
function Footer({ go }: { go: (r: Route) => void }) {
  void go;
  return (
    <footer>
      <div className="foot-grid">
        <div>
          <a href="#home" className="logo"><span className="bolt">⚡</span>SKILL<em>SPARKS</em></a>
          <p style={{ color: 'var(--muted)', marginTop: 12, maxWidth: 320 }}>Your Idea. Your Code. Your Design.<br />Fun online classes in coding, game dev & design for kids and teens.</p>
          <div className="socials" style={{ marginTop: 16 }}>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">📸</a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">🎵</a>
            <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" aria-label="WhatsApp">💬</a>
          </div>
        </div>
        <div>
          <h4>Explore</h4>
          <a href="#courses">Explore Courses</a><a href="#schedule">Schedule</a><a href="#about">About Us</a><a href="#register">Register</a>
        </div>
        <div>
          <h4>Account</h4>
          <a href="#login">Student Login</a><a href="#login">Admin Login</a><a href="#student">My Dashboard</a><a href="#admin">Admin Panel</a>
        </div>
        <div>
          <h4>Contact</h4>
          <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer">💬 WhatsApp: 0812-3456-7890</a>
          <a href="mailto:hello@skillsparks.id">✉️ hello@skillsparks.id</a>
          <a href="#home">📍 Bogor, Indonesia</a>
        </div>
      </div>
      <div className="foot-bottom">
        <span>© {new Date().getFullYear()} Skill Sparks. All rights reserved.</span>
        <span>Your Idea. Your Code. Your Design. ⚡</span>
      </div>
    </footer>
  );
}
