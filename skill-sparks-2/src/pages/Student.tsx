import { useCallback, useEffect, useState } from 'react';
import Mascot from '../components/Mascot';
import { supabase } from '../lib/supabase';
import {
  getProfile, fetchMyData, logout, classStatus, countdownTo, dailyChallenge,
  levelFor, ACHIEVEMENTS, addXP, markNotificationRead, addProject, updateProfile,
  type Course, type ClassSchedule, type AppNotification, type Project,
} from '../lib/db';

type Tab = 'home' | 'courses' | 'schedule' | 'progress' | 'gallery' | 'profile';

export default function Student({ go, refresh }: { go: (r: any) => void; refresh: () => void }) {
  const [tab, setTab] = useState<Tab>('home');
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const load = useCallback(async () => {
    const p = await getProfile();
    setProfile(p);
    if (!p) return;
    const d = await fetchMyData(p.id);
    setCourses(d.courses); setClasses(d.classes); setNotifications(d.notifications);
    setProjects(d.projects); setProgress(d.progress);
    const { data: ann } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3);
    setAnnouncements(ann || []);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1000); return () => clearInterval(t); }, []);
  void tick;

  if (!profile) return <div className="empty" style={{ paddingTop: 120 }}><span className="big">⚡</span>Loading your dashboard…</div>;

  const me = profile;
  const unread = notifications.filter(n => !n.read).length;
  const level = levelFor(me.xp || 0);
  const xpInLevel = (me.xp || 0) % 200;
  const completedLessons = progress.reduce((s, p) => s + (p.completed_lessons || 0), 0);
  const attendance = progress.length ? Math.round(progress.reduce((s, p) => s + (p.attendance || 0), 0) / progress.length) : 0;

  const TABS: [Tab, string, string][] = [
    ['home', '🏠', 'Home'], ['courses', '🎮', 'My Courses'], ['schedule', '📅', 'My Schedule'],
    ['progress', '📈', 'My Progress'], ['gallery', '🎨', 'My Gallery'], ['profile', '👤', 'My Profile'],
  ];

  const reload = async () => { await load(); refresh(); };

  return (
    <div className="dash">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <a href="#home" className="logo"><span className="bolt">⚡</span>SKILL<em>SPARKS</em></a>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <Mascot mood="cheer" size={76} />
          <div style={{ fontWeight: 800, marginTop: 4 }}>{me.name}</div>
          <span className="level-chip" style={{ marginTop: 8 }}>⭐ Level {level} · {me.xp || 0} XP</span>
        </div>
        {TABS.map(([t, ico, label]) => (
          <button key={t} className={`side-link ${tab === t ? 'on' : ''}`} onClick={() => { setTab(t); setOpen(false); }}>
            <span>{ico}</span>{label}
            {t === 'home' && unread > 0 && <span className="cnt" style={{ background: 'var(--pink)' }}>{unread}</span>}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="side-link" onClick={() => go('home')}>🏠 View Website</button>
        <button className="side-link" onClick={async () => { await logout(); refresh(); go('home'); }}>🚪 Logout</button>
      </aside>

      <main className="main">
        <div className="main-head">
          <button className="burger" style={{ display: 'block' }} onClick={() => setOpen(!open)}>☰</button>
          <h1>{TABS.find(t => t[0] === tab)?.[2]}</h1>
          <div className="spacer" />
          <span className="pill green">🎓 STUDENT</span>
        </div>

        {tab === 'home' && (
          <>
            <div className="welcome">
              <Mascot mood="wave" size={100} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <h2>Hey, {me.name.split(' ')[0]}! Ready to learn something awesome? 🚀</h2>
                <p>Your next class is waiting. Keep the spark alive!</p>
                <span className="level-chip">⭐ Level {level} · {xpInLevel}/200 XP to next level</span>
                <div className="progress" style={{ marginTop: 12, maxWidth: 360 }}><i style={{ width: `${(xpInLevel / 200) * 100}%` }} /></div>
              </div>
            </div>

            <div className="challenge" style={{ marginBottom: 22 }}>
              <span className="big">🎲</span>
              <div style={{ flex: 1, minWidth: 220 }}>
                <b>Daily Learning Challenge</b>
                <p style={{ color: 'var(--muted)' }}>{dailyChallenge()}</p>
              </div>
              <button className="btn sm" onClick={async () => { await addXP(me.id, 20); reload(); alert('🎉 +20 XP! Challenge accepted. Show your teacher next class!'); }}>Accept (+20 XP)</button>
            </div>

            <div className="panel">
              <h3>🔔 Notifications {unread > 0 && <span className="pill pink">{unread} new</span>}</h3>
              {notifications.slice(0, 6).map(n => (
                <div key={n.id} className={`notif ${n.read ? 'read' : ''}`}>
                  <span className="dot" />
                  <div style={{ flex: 1 }}><b>{n.title}</b><p>{n.body}</p><time>{new Date(n.createdAt).toLocaleString()}</time></div>
                  {!n.read && <button className="icon-btn" onClick={async () => { await markNotificationRead(n.id); reload(); }}>Mark read</button>}
                </div>
              ))}
              {notifications.length === 0 && <p style={{ color: 'var(--muted)' }}>No notifications yet. When your teacher schedules a class, you'll see it here!</p>}
            </div>

            <div className="panel">
              <h3>📢 Announcements</h3>
              {announcements.map((a: any) => (
                <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <b>{a.title}</b><p style={{ color: 'var(--muted)', fontSize: 14 }}>{a.body}</p>
                </div>
              ))}
              {announcements.length === 0 && <p style={{ color: 'var(--muted)' }}>No announcements yet.</p>}
            </div>
          </>
        )}

        {tab === 'courses' && (
          <>
            {courses.length === 0 && <div className="empty"><span className="big">🎒</span>You are not enrolled in any course yet. Ask your teacher!</div>}
            <div className="course-grid">
              {courses.map(c => {
                const pct = Math.min(100, Math.round((completedLessons / Math.max(1, c.sessions)) * 100));
                const next = classes.find(x => x.courseId === c.id && classStatus(x) !== 'completed');
                return (
                  <article className="course-card" key={c.id}>
                    <div className="course-art" style={{ background: `linear-gradient(135deg, ${c.color}, #111)` }}><span>{c.emoji}</span></div>
                    <div className="course-body">
                      <div className="badges"><span className="badge" style={{ background: c.color }}>{c.category}</span></div>
                      <h3>{c.title}</h3>
                      <p className="desc">👩‍🏫 {c.instructor || 'Skill Sparks Team'} · {c.duration}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 700 }}>
                        <span>Progress</span><span>{pct}%</span>
                      </div>
                      <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                      {next && <p style={{ fontSize: 14, color: 'var(--cyan)', fontWeight: 700 }}>⏭️ Next: {next.title} — {next.date} {next.start}</p>}
                      <div className="course-actions">
                        <button className="btn ghost sm" onClick={() => setTab('schedule')}>View Course</button>
                        <button className="btn sm" onClick={async () => { await addXP(me.id, 10); reload(); alert('📚 +10 XP! Keep studying!'); }}>Mark Lesson Done (+10 XP)</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {tab === 'schedule' && <Schedule classes={classes} courses={courses} />}
        {tab === 'progress' && <Progress me={me} completedLessons={completedLessons} attendance={attendance} projects={projects} />}
        {tab === 'gallery' && <Gallery me={me} projects={projects} reload={reload} />}
        {tab === 'profile' && <Profile me={me} reload={reload} go={go} />}
      </main>
    </div>
  );
}

/* ── Schedule + JOIN ZOOM ────────────────────────────────────────────────── */
function Schedule({ classes, courses }: { classes: ClassSchedule[]; courses: Course[] }) {
  const [month, setMonth] = useState(() => new Date());
  const y = month.getFullYear(), m = month.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const hasClass = (d: number) => classes.some(c => c.date === `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

  return (
    <>
      <div className="panel">
        <h3>🗓️ {month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
          <span style={{ float: 'right', display: 'flex', gap: 8 }}>
            <button className="icon-btn" onClick={() => setMonth(new Date(y, m - 1, 1))}>←</button>
            <button className="icon-btn" onClick={() => setMonth(new Date(y, m + 1, 1))}>→</button>
          </span>
        </h3>
        <div className="cal-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="cal-head">{d}</div>)}
          {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} className="cal-day dim">·</div>)}
          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1; const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            return <div key={d} className={`cal-day ${iso === today ? 'today' : ''} ${hasClass(d) ? 'has' : ''}`}>{d}</div>;
          })}
        </div>
      </div>

      <div className="panel">
        <h3>⏰ Upcoming & Past Classes</h3>
        {classes.length === 0 && <div className="empty"><span className="big">📭</span>No classes assigned yet. Your teacher will schedule them soon!</div>}
        {classes.map(c => {
          const st = classStatus(c);
          const course = courses.find(x => x.id === c.courseId);
          return (
            <div className="class-card" key={c.id}>
              <div className="when"><b>{c.date.slice(8)}</b><span>{new Date(c.date + 'T00:00').toLocaleDateString('en', { month: 'short' })}</span></div>
              <div className="info">
                <h4>{c.title}</h4>
                <p>{course?.emoji} {course?.title} · 👩‍🏫 {c.instructor} · 🕒 {c.start}–{c.end} ({c.timezone}) · Session {c.sessionNumber}</p>
                <p>{c.description}</p>
                {st === 'upcoming' && <span className="countdown">⏳ Starts in {countdownTo(c)}</span>}
                {st === 'rescheduled' && <span className="countdown" style={{ color: 'var(--yellow)' }}>🔄 Rescheduled — check the new time above!</span>}
              </div>
              <span className={`pill ${st === 'live' ? 'pink' : st === 'completed' ? 'gray' : st === 'rescheduled' ? 'yellow' : 'green'}`}>
                {st === 'live' ? '🔴 LIVE NOW' : st.toUpperCase()}
              </span>
              {st === 'completed' ? (
                <span className="pill gray">✅ Completed</span>
              ) : c.zoomUrl ? (
                <a className={`zoom-btn ${st === 'live' ? 'live' : ''}`} href={c.zoomUrl} target="_blank" rel="noreferrer">📹 JOIN ZOOM</a>
              ) : (
                <span className="pill yellow">⏳ Zoom link coming soon</span>
              )}
            </div>
          );
        })}
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>🔒 Zoom links are private — only enrolled students can see them. Never share your link publicly!</p>
      </div>
    </>
  );
}

/* ── Progress ────────────────────────────────────────────────────────────── */
function Progress({ me, completedLessons, attendance, projects }: { me: any; completedLessons: number; attendance: number; projects: Project[] }) {
  const level = levelFor(me.xp || 0);
  return (
    <>
      <div className="stat-grid">
        <div className="stat"><span className="ico">⭐</span><b>{me.xp || 0}</b><span>Total XP</span></div>
        <div className="stat"><span className="ico">📈</span><b>Level {level}</b><span>Current Level</span></div>
        <div className="stat"><span className="ico">📚</span><b>{completedLessons}</b><span>Lessons Done</span></div>
        <div className="stat"><span className="ico">✅</span><b>{attendance}%</b><span>Attendance</span></div>
      </div>
      <div className="panel">
        <h3>🏅 Achievements</h3>
        <div className="ach-grid">
          {ACHIEVEMENTS.map(a => {
            const has = (a.code === 'first-class' && completedLessons >= 1)
              || (a.code === 'coding-beginner' && (me.xp || 0) >= 100)
              || (a.code === 'project-creator' && projects.length >= 1)
              || (a.code === 'consistent-learner' && attendance >= 90)
              || (a.code === 'creative-explorer' && completedLessons >= 3);
            return (
              <div key={a.code} className={`ach ${has ? '' : 'locked'}`}>
                <span className="emoji">{has ? a.emoji : '🔒'}</span><b>{a.name}</b><span>+{a.xp} XP {has ? '· Unlocked!' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="panel">
        <h3>🎯 Learning Milestones</h3>
        {[
          ['Join your first class', completedLessons >= 1],
          ['Complete 3 lessons', completedLessons >= 3],
          ['Reach 100 XP', (me.xp || 0) >= 100],
          ['Reach Level 2', level >= 2],
          ['Showcase a project', projects.length >= 1],
        ].map(([label, done]: any) => (
          <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 20 }}>{done ? '✅' : '⬜'}</span><span style={{ color: done ? '#fff' : 'var(--muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Gallery ─────────────────────────────────────────────────────────────── */
function Gallery({ me, projects, reload }: { me: any; projects: Project[]; reload: () => void }) {
  const [title, setTitle] = useState(''); const [cat, setCat] = useState('Games'); const [emoji, setEmoji] = useState('🎮'); const [desc, setDesc] = useState('');
  const add = async () => {
    if (!title.trim()) return;
    await addProject({ id: '', studentName: me.name, title: title.trim(), category: cat, description: desc.trim() || 'My awesome Skill Sparks project!', emoji, color: '#22ff88', studentId: me.id });
    await addXP(me.id, 30); reload(); setTitle(''); setDesc('');
    alert('🎉 Project added to the showcase! +30 XP');
  };
  return (
    <>
      <div className="panel"><h3>➕ Share a New Project</h3>
        <div className="search-row">
          <input placeholder="Project title" value={title} onChange={e => setTitle(e.target.value)} />
          <select value={cat} onChange={e => setCat(e.target.value)}><option>Games</option><option>Digital Art</option><option>Animations</option><option>Creative Projects</option></select>
          <input style={{ maxWidth: 80 }} value={emoji} onChange={e => setEmoji(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 12 }}><input placeholder="Short description…" value={desc} onChange={e => setDesc(e.target.value)} /></div>
        <button className="btn sm" onClick={add}>🚀 Publish to Showcase (+30 XP)</button>
      </div>
      <div className="show-grid">
        {projects.map(p => (
          <div className="show-card" key={p.id} style={{ background: `linear-gradient(150deg, ${p.color}33, #111)`, borderColor: `${p.color}66` }}>
            <span className="emoji">{p.emoji}</span><span className="cat">{p.category.toUpperCase()}</span>
            <h3>{p.title}</h3><p>{p.description}</p><span className="by">by {p.studentName} ✨</span>
          </div>
        ))}
      </div>
      {projects.length === 0 && <div className="empty"><span className="big">🎨</span>No projects yet — create something awesome and share it!</div>}
    </>
  );
}

/* ── Profile ─────────────────────────────────────────────────────────────── */
function Profile({ me, reload, go }: { me: any; reload: () => void; go: (r: any) => void }) {
  const [name, setName] = useState(me.name);
  const [school, setSchool] = useState(me.school || '');
  const [pw, setPw] = useState(''); const [msg, setMsg] = useState('');
  const save = async () => {
    await updateProfile(me.id, name.trim() || me.name, school.trim());
    if (pw.trim()) {
      const { error } = await supabase.auth.updateUser({ password: pw.trim() });
      if (error) { setMsg('❌ ' + error.message); return; }
    }
    reload(); setMsg('✅ Profile updated!'); setPw('');
  };
  return (
    <div className="panel" style={{ maxWidth: 560 }}>
      <h3>👤 My Profile</h3>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
        <Mascot mood="idle" size={70} />
        <div><b style={{ fontSize: 20 }}>{me.name}</b><br /><small style={{ color: 'var(--muted)' }}>{me.email}</small><br />
          <span className="pill green" style={{ marginTop: 6 }}>{(me.account_status || '').toUpperCase()}</span></div>
      </div>
      <div className="field" style={{ marginBottom: 12 }}><label>Full name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field" style={{ marginBottom: 12 }}><label>School</label><input value={school} onChange={e => setSchool(e.target.value)} /></div>
      <div className="field" style={{ marginBottom: 12 }}><label>New password (leave blank to keep)</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" /></div>
      <button className="btn sm" onClick={save}>💾 Save Changes</button>
      {msg && <p style={{ marginTop: 12, color: 'var(--green)', fontWeight: 700 }}>{msg}</p>}
      <hr style={{ border: '1px solid var(--line)', margin: '24px 0' }} />
      <button className="btn danger sm" onClick={async () => { await logout(); reload(); go('home'); }}>🚪 Logout</button>
    </div>
  );
}
