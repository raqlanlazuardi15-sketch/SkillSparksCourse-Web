import { useCallback, useEffect, useState } from 'react';
import Mascot from '../components/Mascot';
import { supabase } from '../lib/supabase';
import {
  fetchApplications, approveApplication, rejectApplication, fetchStudents,
  fetchInstructors, fetchAdminClasses, fetchAnnouncements,
  fetchProjects, saveCourse, deleteCourse, saveClass, deleteClass, saveZoomLink,
  postAnnouncement, deleteAnnouncement, addProject, deleteProject,
  setStudentStatus, assignCourse, logout,
  type Course, type ClassSchedule, type Application, type Student,
  type Instructor, type Announcement, type Project,
} from '../lib/db';

type Tab = 'overview' | 'applications' | 'courses' | 'students' | 'instructors' | 'classes' | 'zoom' | 'announcements' | 'projects' | 'settings';

const TABS: [Tab, string, string][] = [
  ['overview', '📊', 'Overview'], ['applications', '📬', 'Student Applications'], ['courses', '🎮', 'Manage Courses'], ['students', '🎓', 'Manage Students'],
  ['instructors', '👩‍🏫', 'Instructors'], ['classes', '📅', 'Classes & Schedule'], ['zoom', '📹', 'Zoom Management'],
  ['announcements', '📢', 'Announcements'], ['projects', '🎨', 'Student Projects'], ['settings', '⚙️', 'Settings'],
];

interface Data {
  courses: Course[]; applications: Application[]; students: Student[];
  instructors: Instructor[]; classes: ClassSchedule[]; announcements: Announcement[]; projects: Project[];
}

export default function Admin({ go, refresh }: { go: (r: any) => void; refresh: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data>({ courses: [], applications: [], students: [], instructors: [], classes: [], announcements: [], projects: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [applications, students, instructors, classes, announcements, projects] = await Promise.all([
      fetchApplications(), fetchStudents(), fetchInstructors(),
      fetchAdminClasses(), fetchAnnouncements(), fetchProjects(),
    ]);
    // fetchCourses only returns published — admin needs all. Fetch all directly:
    const { data: allCourses } = await supabase.from('courses').select('*').order('created_at');
    setData({
      courses: (allCourses || []).map((r: any) => ({
        id: r.id, title: r.title, category: r.category, badge: r.badge, description: r.description,
        difficulty: r.difficulty, instructor: r.instructor, duration: r.duration, sessions: r.sessions,
        maxStudents: r.max_students, enrolled: 0, published: r.published, color: r.color, emoji: r.emoji,
      })),
      applications, students, instructors, classes, announcements, projects,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const reload = async () => { await load(); refresh(); };

  if (loading) return <div className="empty" style={{ paddingTop: 120 }}><span className="big">⚡</span>Loading admin panel…</div>;

  return (
    <div className="dash">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <a href="#home" className="logo"><span className="bolt">⚡</span>SKILL<em>SPARKS</em></a>
        {TABS.map(([t, ico, label]) => (
          <button key={t} className={`side-link ${tab === t ? 'on' : ''}`} onClick={() => { setTab(t); setOpen(false); }}>
            <span>{ico}</span>{label}
            {t === 'students' && <span className="cnt">{data.students.length}</span>}
            {t === 'courses' && <span className="cnt">{data.courses.length}</span>}
            {t === 'classes' && <span className="cnt">{data.classes.length}</span>}
            {t === 'applications' && data.applications.filter(a => a.status === 'pending').length > 0 && <span className="cnt" style={{ background: 'var(--pink)' }}>{data.applications.filter(a => a.status === 'pending').length}</span>}
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
          <span className="pill purple">🛠️ ADMIN</span>
        </div>
        {tab === 'overview' && <Overview data={data} setTab={setTab} />}
        {tab === 'applications' && <Applications data={data} reload={reload} />}
        {tab === 'courses' && <Courses data={data} reload={reload} />}
        {tab === 'students' && <Students data={data} reload={reload} />}
        {tab === 'instructors' && <Instructors data={data} reload={reload} />}
        {tab === 'classes' && <Classes data={data} reload={reload} />}
        {tab === 'zoom' && <Zoom data={data} reload={reload} />}
        {tab === 'announcements' && <Announcements data={data} reload={reload} />}
        {tab === 'projects' && <Projects data={data} reload={reload} />}
        {tab === 'settings' && <Settings data={data} />}
      </main>
    </div>
  );
}

/* ── Applications (Approval Center) ──────────────────────────────────────── */
function Applications({ data, reload }: { data: Data; reload: () => void }) {
  const [cat, setCat] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);

  const list = data.applications.filter(a => a.status === cat);
  const counts = { pending: data.applications.filter(a => a.status === 'pending').length, approved: data.applications.filter(a => a.status === 'approved').length, rejected: data.applications.filter(a => a.status === 'rejected').length };

  const approve = async (id: string) => {
    setBusy(true);
    const res = await approveApplication(id);
    setBusy(false);
    if (!res.ok) { setResult('❌ ' + (res.error || 'Failed.')); return; }
    setResult(`✅ Approved! Student account created (INVITED) and enrolled in the course.\n${res.warning ? '⚠️ ' + res.warning + '\n' : ''}${res.message || 'Activation email sent.'}`);
    reload();
  };
  const reject = async (id: string) => {
    await rejectApplication(id, reason);
    setRejectFor(null); setReason(''); setResult('❌ Application rejected. The student can submit a new application.'); reload();
  };

  return (
    <>
      <div className="show-filters" style={{ justifyContent: 'flex-start' }}>
        <button className={`chip-btn ${cat === 'pending' ? 'on' : ''}`} onClick={() => setCat('pending')}>⏳ Pending ({counts.pending})</button>
        <button className={`chip-btn ${cat === 'approved' ? 'on' : ''}`} onClick={() => setCat('approved')}>✅ Approved ({counts.approved})</button>
        <button className={`chip-btn ${cat === 'rejected' ? 'on' : ''}`} onClick={() => setCat('rejected')}>❌ Rejected ({counts.rejected})</button>
      </div>
      {result && <div className="panel" style={{ borderColor: 'rgba(34,255,136,.4)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{result}</div>}
      <div className="panel"><div className="table-wrap"><table>
        <thead><tr><th>Student</th><th>Contact</th><th>Course</th><th>Registered</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{list.map(a => (
          <tr key={a.id}>
            <td><b>{a.name}</b><br /><small style={{ color: 'var(--muted)' }}>{a.age} · {a.school || '—'}</small></td>
            <td>{a.email}<br /><small style={{ color: 'var(--muted)' }}>👨‍👩‍👦 {a.parent} · 💬 {a.whatsapp}</small></td>
            <td>{data.courses.find(c => c.id === a.courseId)?.title || '—'}<br /><small style={{ color: 'var(--muted)' }}>💻 {a.device}</small></td>
            <td>{new Date(a.createdAt).toLocaleDateString()}</td>
            <td><span className={`pill ${a.status === 'pending' ? 'yellow' : a.status === 'approved' ? 'green' : 'pink'}`}>{a.status.toUpperCase()}</span>
              {a.status === 'rejected' && a.rejectionReason && <><br /><small style={{ color: 'var(--muted)' }}>{a.rejectionReason}</small></>}</td>
            <td>{a.status === 'pending' && (
              <div className="row-actions">
                <button className="icon-btn" style={{ background: 'var(--green)', color: '#06210f', borderColor: 'var(--green)' }} disabled={busy} onClick={() => approve(a.id)}>✅ APPROVE</button>
                <button className="icon-btn red" onClick={() => setRejectFor(a.id)}>❌ REJECT</button>
              </div>
            )}</td>
          </tr>
        ))}</tbody>
      </table></div>
      {list.length === 0 && <div className="empty"><span className="big">📭</span>No {cat} applications yet.</div>}
      </div>
      {rejectFor && (
        <div className="modal-bg" onClick={() => setRejectFor(null)}><div className="modal" onClick={e => e.stopPropagation()}>
          <h3>❌ Reject Application</h3>
          <div className="field"><label>Rejection reason (optional)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Kelas penuh, coba lagi bulan depan…" /></div>
          <div className="modal-actions">
            <button className="btn ghost sm" onClick={() => setRejectFor(null)}>Cancel</button>
            <button className="btn danger sm" onClick={() => reject(rejectFor)}>Confirm Reject</button>
          </div>
        </div></div>
      )}
    </>
  );
}

/* ── Overview ────────────────────────────────────────────────────────────── */
function Overview({ data, setTab }: { data: Data; setTab: (t: Tab) => void }) {
  const upcoming = data.classes.filter(c => c.published && c.status !== 'completed').length;
  const recent = data.students.slice(-5).reverse();
  const pendingApps = data.applications.filter(a => a.status === 'pending').length;
  const byCourse = data.courses.map(c => ({ c, n: data.students.filter(s => s.courseIds.includes(c.id)).length }));
  const max = Math.max(1, ...byCourse.map(x => x.n));
  return (
    <>
      <div className="stat-grid">
        <div className="stat"><span className="ico">🎓</span><b>{data.students.length}</b><span>Total Students</span></div>
        <div className="stat"><span className="ico">🎮</span><b>{data.courses.filter(c => c.published).length}</b><span>Published Courses</span></div>
        <div className="stat"><span className="ico">📅</span><b>{data.classes.length}</b><span>Active Classes</span></div>
        <div className="stat"><span className="ico">⏰</span><b>{upcoming}</b><span>Upcoming Sessions</span></div>
        <div className="stat"><span className="ico">📬</span><b>{pendingApps}</b><span>Pending Applications</span></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 22 }}>
        <div className="panel">
          <h3>📈 Enrollments by Course</h3>
          {byCourse.length === 0 && <p style={{ color: 'var(--muted)' }}>No courses yet.</p>}
          {byCourse.map(({ c, n }) => (
            <div key={c.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
                <span>{c.emoji} {c.title}</span><b>{n} students</b>
              </div>
              <div className="progress"><i style={{ width: `${(n / max) * 100}%` }} /></div>
            </div>
          ))}
          <button className="btn ghost sm" onClick={() => setTab('courses')}>Manage Courses →</button>
        </div>
        <div className="panel">
          <h3>🆕 Recent Students</h3>
          {recent.length === 0 && <p style={{ color: 'var(--muted)' }}>No students yet. New registrations will appear here after approval.</p>}
          {recent.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <span><b>{s.name}</b><br /><small style={{ color: 'var(--muted)' }}>{s.email}</small></span>
              <span className={`pill ${s.accountStatus === 'active' ? 'green' : 'yellow'}`}>{s.accountStatus.toUpperCase()}</span>
            </div>
          ))}
          <button className="btn ghost sm" style={{ marginTop: 14 }} onClick={() => setTab('students')}>View All Students →</button>
        </div>
      </div>
    </>
  );
}

/* ── Courses ─────────────────────────────────────────────────────────────── */
const emptyCourse = (): Course => ({ id: '', title: '', category: 'CODING', badge: 'BEGINNER', description: '', difficulty: 'Beginner', instructor: '', duration: '8 weeks', sessions: 8, maxStudents: 15, enrolled: 0, published: true, color: '#a855f7', emoji: '🚀' });

function Courses({ data, reload }: { data: Data; reload: () => void }) {
  const [edit, setEdit] = useState<Course | null>(null);
  const save = async (c: Course) => { await saveCourse(c); setEdit(null); reload(); };
  const remove = async (id: string) => { if (confirm('Delete this course?')) { await deleteCourse(id); reload(); } };
  const toggle = async (c: Course) => { await saveCourse({ ...c, published: !c.published }); reload(); };

  return (
    <>
      <div className="search-row"><button className="btn sm" onClick={() => setEdit(emptyCourse())}>➕ Add New Course</button></div>
      <div className="panel"><div className="table-wrap"><table>
        <thead><tr><th>Course</th><th>Category</th><th>Instructor</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{data.courses.map(c => (
          <tr key={c.id}>
            <td><b>{c.emoji} {c.title}</b><br /><small style={{ color: 'var(--muted)' }}>{c.description.slice(0, 50)}…</small></td>
            <td><span className="badge" style={{ background: c.color }}>{c.category}</span> <span className="pill gray">{c.badge}</span></td>
            <td>{c.instructor || '—'}</td>
            <td><span className={`pill ${c.published ? 'green' : 'gray'}`}>{c.published ? 'PUBLISHED' : 'DRAFT'}</span></td>
            <td><div className="row-actions">
              <button className="icon-btn" onClick={() => setEdit({ ...c })}>✏️ Edit</button>
              <button className="icon-btn" onClick={() => toggle(c)}>{c.published ? 'Unpublish' : 'Publish'}</button>
              <button className="icon-btn red" onClick={() => remove(c.id)}>🗑️</button>
            </div></td>
          </tr>
        ))}</tbody>
      </table></div>
      {data.courses.length === 0 && <div className="empty"><span className="big">🎮</span>No courses yet.</div>}
      </div>
      {edit && <CourseModal course={edit} instructors={data.instructors} onClose={() => setEdit(null)} onSave={save} />}
    </>
  );
}

function CourseModal({ course, instructors, onClose, onSave }: { course: Course; instructors: Instructor[]; onClose: () => void; onSave: (c: Course) => void }) {
  const [c, setC] = useState(course);
  const set = (k: keyof Course, v: any) => setC({ ...c, [k]: v });
  const F = ({ k, label, type = 'text', full = false, children }: any) => (
    <div className={`field ${full ? 'full' : ''}`}><label>{label}</label>
      {children || <input type={type} value={(c as any)[k]} onChange={e => set(k, type === 'number' ? Number(e.target.value) : e.target.value)} />}
    </div>
  );
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3>{c.id ? '✏️ Edit Course' : '➕ New Course'}</h3>
      <div className="form-grid">
        <F k="title" label="Course name" full />
        <F k="category" label="Category badge"><select value={c.category} onChange={e => set('category', e.target.value)}><option>CODING</option><option>GAME DEV</option><option>DESIGN</option><option>ANIMATION</option></select></F>
        <F k="badge" label="Badge"><select value={c.badge} onChange={e => set('badge', e.target.value)}><option>BEGINNER</option><option>INTERMEDIATE</option><option>ADVANCED</option><option>ALL LEVELS</option></select></F>
        <F k="instructor" label="Instructor name"><input list="inst" value={c.instructor} onChange={e => set('instructor', e.target.value)} /><datalist id="inst">{instructors.map(i => <option key={i.id} value={i.name} />)}</datalist></F>
        <F k="difficulty" label="Difficulty"><select value={c.difficulty} onChange={e => set('difficulty', e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></F>
        <F k="duration" label="Duration" />
        <F k="sessions" label="Sessions" type="number" />
        <F k="maxStudents" label="Max students" type="number" />
        <F k="emoji" label="Emoji" />
        <F k="color" label="Accent color"><input type="color" value={c.color} onChange={e => set('color', e.target.value)} /></F>
        <F k="description" label="Description" full><textarea value={c.description} onChange={e => set('description', e.target.value)} /></F>
        <div className="field full"><label><input type="checkbox" checked={c.published} onChange={e => set('published', e.target.checked)} style={{ width: 'auto', marginRight: 8 }} />Published (visible to public)</label></div>
      </div>
      <div className="modal-actions">
        <button className="btn ghost sm" onClick={onClose}>Cancel</button>
        <button className="btn sm" onClick={() => c.title.trim() && onSave(c)}>💾 Save Course</button>
      </div>
    </div></div>
  );
}

/* ── Students ────────────────────────────────────────────────────────────── */
function Students({ data, reload }: { data: Data; reload: () => void }) {
  const [q, setQ] = useState(''); const [course, setCourse] = useState('all');
  const list = data.students.filter(s =>
    (course === 'all' || s.courseIds.includes(course)) &&
    (s.name + s.email).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="search-row">
        <input placeholder="🔍 Search name or email…" value={q} onChange={e => setQ(e.target.value)} />
        <select value={course} onChange={e => setCourse(e.target.value)}>
          <option value="all">All courses</option>
          {data.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <div className="panel"><div className="table-wrap"><table>
        <thead><tr><th>Student</th><th>Contact</th><th>Courses</th><th>XP</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{list.map(s => (
          <tr key={s.id}>
            <td><b>{s.name}</b><br /><small style={{ color: 'var(--muted)' }}>{s.age} · {s.school}</small></td>
            <td>{s.email}<br /><small style={{ color: 'var(--muted)' }}>💬 {s.whatsapp}</small></td>
            <td>{s.courseIds.map(id => data.courses.find(c => c.id === id)?.title).filter(Boolean).join(', ') || '—'}
              <br /><select style={{ marginTop: 5, background: '#0c0c11', color: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: '4px 8px', fontSize: 12.5 }} defaultValue="" onChange={async e => { if (e.target.value) { await assignCourse(s.id, e.target.value); reload(); } }}>
                <option value="">+ Assign course…</option>
                {data.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select></td>
            <td>⭐ {s.xp}</td>
            <td><span className={`pill ${s.accountStatus === 'active' ? 'green' : s.accountStatus === 'invited' ? 'yellow' : 'gray'}`}>{s.accountStatus.toUpperCase()}</span></td>
            <td><div className="row-actions">
              <button className="icon-btn" onClick={async () => { await setStudentStatus(s.id, s.accountStatus === 'suspended' ? 'active' : 'suspended'); reload(); }}>{s.accountStatus === 'suspended' ? 'Unsuspend' : 'Suspend'}</button>
            </div></td>
          </tr>
        ))}</tbody>
      </table></div>
      {list.length === 0 && <div className="empty"><span className="big">🔍</span>No students found.</div>}
      </div>
    </>
  );
}

/* ── Instructors ───────────────────────────────────────────────────────── */
function Instructors({ data, reload }: { data: Data; reload: () => void }) {
  const [name, setName] = useState(''); const [spec, setSpec] = useState(''); const [email, setEmail] = useState('');
  const add = async () => {
    if (!name.trim()) return;
    await supabase.from('instructors').insert({ name: name.trim(), specialty: spec.trim(), email: email.trim() });
    setName(''); setSpec(''); setEmail(''); reload();
  };
  const remove = async (id: string) => { await supabase.from('instructors').delete().eq('id', id); reload(); };
  return (
    <>
      <div className="panel"><h3>➕ Add Instructor</h3>
        <div className="search-row">
          <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <input placeholder="Specialty (e.g. Scratch Coding)" value={spec} onChange={e => setSpec(e.target.value)} />
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="btn sm" onClick={add}>Add</button>
        </div>
      </div>
      <div className="panel"><div className="table-wrap"><table>
        <thead><tr><th>Instructor</th><th>Specialty</th><th>Email</th><th>Classes</th><th></th></tr></thead>
        <tbody>{data.instructors.map(i => (
          <tr key={i.id}><td><b>👩‍🏫 {i.name}</b></td><td>{i.specialty}</td><td>{i.email}</td>
            <td>{data.classes.filter(c => c.instructor === i.name).length}</td>
            <td><button className="icon-btn red" onClick={() => remove(i.id)}>🗑️</button></td></tr>
        ))}</tbody>
      </table></div>
      {data.instructors.length === 0 && <div className="empty"><span className="big">👩‍🏫</span>No instructors yet.</div>}
      </div>
    </>
  );
}

/* ── Classes / Schedule ────────────────────────────────────────────────── */
const emptyClass = (): ClassSchedule => ({ id: '', courseId: '', instructor: '', title: '', date: new Date().toISOString().slice(0, 10), start: '15:30', end: '16:30', timezone: 'Asia/Jakarta', zoomUrl: '', description: '', sessionNumber: 1, status: 'upcoming', published: false, studentIds: [] });

function Classes({ data, reload }: { data: Data; reload: () => void }) {
  const [edit, setEdit] = useState<ClassSchedule | null>(null);
  const save = async (c: ClassSchedule) => { await saveClass(c); setEdit(null); reload(); };
  const remove = async (id: string) => { if (confirm('Delete this class?')) { await deleteClass(id); reload(); } };
  const sorted = [...data.classes].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  return (
    <>
      <div className="search-row"><button className="btn sm" onClick={() => setEdit(emptyClass())}>➕ Create Class Schedule</button></div>
      <div className="panel"><div className="table-wrap"><table>
        <thead><tr><th>Class</th><th>Date & Time</th><th>Zoom</th><th>Status</th><th>Published</th><th>Actions</th></tr></thead>
        <tbody>{sorted.map(c => (
          <tr key={c.id}>
            <td><b>{c.title}</b><br /><small style={{ color: 'var(--muted)' }}>{data.courses.find(x => x.id === c.courseId)?.title} · {c.instructor} · Session {c.sessionNumber}</small></td>
            <td>{c.date}<br /><small style={{ color: 'var(--muted)' }}>{c.start}–{c.end} {c.timezone}</small></td>
            <td>{c.zoomUrl ? <span className="pill green">LINK SET</span> : <span className="pill yellow">NO LINK</span>}</td>
            <td><span className={`pill ${c.status === 'live' ? 'pink' : c.status === 'completed' ? 'gray' : c.status === 'rescheduled' ? 'yellow' : 'green'}`}>{c.status.toUpperCase()}</span></td>
            <td><span className={`pill ${c.published ? 'purple' : 'gray'}`}>{c.published ? 'YES' : 'NO'}</span></td>
            <td><div className="row-actions">
              <button className="icon-btn" onClick={() => setEdit({ ...c })}>✏️ Edit</button>
              <button className="icon-btn" onClick={async () => { await saveClass({ ...c, published: !c.published }); reload(); }}>{c.published ? 'Unpublish' : 'Publish'}</button>
              <button className="icon-btn red" onClick={() => remove(c.id)}>🗑️</button>
            </div></td>
          </tr>
        ))}</tbody>
      </table></div>
      {sorted.length === 0 && <div className="empty"><span className="big">📭</span>No classes yet. Create your first schedule!</div>}
      </div>
      {edit && <ClassModal cls={edit} data={data} onClose={() => setEdit(null)} onSave={save} />}
    </>
  );
}

function ClassModal({ cls, data, onClose, onSave }: { cls: ClassSchedule; data: Data; onClose: () => void; onSave: (c: ClassSchedule) => void }) {
  const [c, setC] = useState(cls);
  const set = (k: keyof ClassSchedule, v: any) => setC({ ...c, [k]: v });
  const toggleStudent = (sid: string) => set('studentIds', c.studentIds.includes(sid) ? c.studentIds.filter(x => x !== sid) : [...c.studentIds, sid]);
  const F = ({ k, label, type = 'text', full = false, children }: any) => (
    <div className={`field ${full ? 'full' : ''}`}><label>{label}</label>
      {children || <input type={type} value={(c as any)[k]} onChange={e => set(k, type === 'number' ? Number(e.target.value) : e.target.value)} />}
    </div>
  );
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3>{c.id ? '✏️ Edit Class' : '➕ New Class Schedule'}</h3>
      <div className="form-grid">
        <F k="title" label="Class title" full />
        <F k="courseId" label="Course"><select value={c.courseId} onChange={e => set('courseId', e.target.value)}><option value="">— Select —</option>{data.courses.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></F>
        <F k="instructor" label="Instructor"><input list="inst2" value={c.instructor} onChange={e => set('instructor', e.target.value)} /><datalist id="inst2">{data.instructors.map(i => <option key={i.id} value={i.name} />)}</datalist></F>
        <F k="date" label="Date" type="date" />
        <F k="sessionNumber" label="Session number" type="number" />
        <F k="start" label="Start time" type="time" />
        <F k="end" label="End time" type="time" />
        <F k="timezone" label="Timezone"><select value={c.timezone} onChange={e => set('timezone', e.target.value)}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option><option>UTC</option></select></F>
        <F k="status" label="Status"><select value={c.status} onChange={e => set('status', e.target.value)}><option value="upcoming">Upcoming</option><option value="live">Live Now</option><option value="completed">Completed</option><option value="rescheduled">Rescheduled</option></select></F>
        <F k="zoomUrl" label="Zoom meeting URL" full />
        <F k="description" label="Description" full><textarea value={c.description} onChange={e => set('description', e.target.value)} /></F>
        <div className="field full"><label>Assign students (leave empty = all enrolled in course)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {data.students.map(s => (
              <button key={s.id} type="button" className={`chip-btn ${c.studentIds.includes(s.id) ? 'on' : ''}`} onClick={() => toggleStudent(s.id)}>{s.name}</button>
            ))}
          </div>
        </div>
        <div className="field full"><label><input type="checkbox" checked={c.published} onChange={e => set('published', e.target.checked)} style={{ width: 'auto', marginRight: 8 }} />Published — students will see this & get notified</label></div>
      </div>
      <div className="modal-actions">
        <button className="btn ghost sm" onClick={onClose}>Cancel</button>
        <button className="btn sm" onClick={() => c.title.trim() && c.courseId && onSave(c)}>💾 Save Class</button>
      </div>
    </div></div>
  );
}

/* ── Zoom ────────────────────────────────────────────────────────────────── */
function Zoom({ data, reload }: { data: Data; reload: () => void }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const save = async (c: ClassSchedule) => {
    const res = await saveZoomLink(c, (links[c.id] ?? c.zoomUrl).trim());
    setMsg(res.ok ? '✅ Zoom link saved & students notified.' : '❌ ' + res.error);
    reload();
  };
  return (
    <div className="panel" style={{ borderColor: 'rgba(0,229,255,.35)' }}>
      <h3>📹 Zoom Meeting Links</h3>
      <p style={{ color: 'var(--muted)', marginBottom: 16 }}>Each class has its own private Zoom URL. Links are only shown to enrolled students on their dashboard — never on the public site.</p>
      {msg && <p style={{ fontWeight: 700, marginBottom: 12 }}>{msg}</p>}
      {data.classes.map(c => (
        <div key={c.id} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ flex: '1 1 220px' }}><b>{c.title}</b><br /><small style={{ color: 'var(--muted)' }}>{c.date} · {c.start} {c.timezone}</small></div>
          <input style={{ flex: '2 1 280px', background: '#0c0c11', border: '1.5px solid var(--line)', borderRadius: 12, padding: '11px 14px', color: '#fff' }}
            placeholder="https://zoom.us/j/…" value={links[c.id] ?? c.zoomUrl} onChange={e => setLinks({ ...links, [c.id]: e.target.value })} />
          <button className="btn green sm" onClick={() => save(c)}>💾 Save Link</button>
        </div>
      ))}
      {data.classes.length === 0 && <div className="empty"><span className="big">📭</span>No classes yet.</div>}
    </div>
  );
}

/* ── Announcements ───────────────────────────────────────────────────────── */
function Announcements({ data, reload }: { data: Data; reload: () => void }) {
  const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const post = async () => {
    if (!title.trim()) return;
    await postAnnouncement(title.trim(), body.trim());
    setTitle(''); setBody(''); reload();
  };
  return (
    <>
      <div className="panel"><h3>📢 New Announcement</h3>
        <div className="field" style={{ marginBottom: 12 }}><label>Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Class rescheduled!" /></div>
        <div className="field" style={{ marginBottom: 14 }}><label>Message</label><textarea value={body} onChange={e => setBody(e.target.value)} /></div>
        <button className="btn sm" onClick={post}>📤 Post to All Students</button>
      </div>
      <div className="panel"><h3>History</h3>
        {data.announcements.map(a => (
          <div key={a.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ flex: 1 }}><b>{a.title}</b><p style={{ color: 'var(--muted)', fontSize: 14 }}>{a.body}</p><small style={{ color: 'var(--muted)' }}>{new Date(a.createdAt).toLocaleString()}</small></div>
            <button className="icon-btn red" onClick={async () => { await deleteAnnouncement(a.id); reload(); }}>🗑️</button>
          </div>
        ))}
        {data.announcements.length === 0 && <p style={{ color: 'var(--muted)' }}>No announcements yet.</p>}
      </div>
    </>
  );
}

/* ── Projects ────────────────────────────────────────────────────────────── */
function Projects({ data, reload }: { data: Data; reload: () => void }) {
  const [title, setTitle] = useState(''); const [name, setName] = useState(''); const [cat, setCat] = useState('Games'); const [emoji, setEmoji] = useState('🎮');
  const add = async () => {
    if (!title.trim() || !name.trim()) return;
    await addProject({ id: '', studentName: name.trim(), title: title.trim(), category: cat, description: 'Featured project from Skill Sparks.', emoji, color: '#a855f7' });
    setTitle(''); setName(''); reload();
  };
  return (
    <>
      <div className="panel"><h3>➕ Add Showcase Project</h3>
        <div className="search-row">
          <input placeholder="Project title" value={title} onChange={e => setTitle(e.target.value)} />
          <input placeholder="Student name" value={name} onChange={e => setName(e.target.value)} />
          <select value={cat} onChange={e => setCat(e.target.value)}><option>Games</option><option>Digital Art</option><option>Animations</option><option>Creative Projects</option></select>
          <input style={{ maxWidth: 80 }} value={emoji} onChange={e => setEmoji(e.target.value)} />
          <button className="btn sm" onClick={add}>Add</button>
        </div>
      </div>
      <div className="panel"><div className="table-wrap"><table>
        <thead><tr><th>Project</th><th>Student</th><th>Category</th><th></th></tr></thead>
        <tbody>{data.projects.map(p => (
          <tr key={p.id}><td><b>{p.emoji} {p.title}</b></td><td>{p.studentName}</td><td><span className="pill purple">{p.category}</span></td>
            <td><button className="icon-btn red" onClick={async () => { await deleteProject(p.id); reload(); }}>🗑️</button></td></tr>
        ))}</tbody>
      </table></div>
      {data.projects.length === 0 && <div className="empty"><span className="big">🎨</span>No showcase projects yet.</div>}
      </div>
    </>
  );
}

/* ── Settings ────────────────────────────────────────────────────────────── */
function Settings({ data }: { data: Data }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'skill-sparks-backup.json'; a.click();
  };
  return (
    <div className="panel">
      <h3>⚙️ Settings & Data</h3>
      <p style={{ color: 'var(--muted)', marginBottom: 18 }}>Connected to Supabase project <b>Skill Sparks</b> (wdugjmdoicitrsyvivmc). All data is stored in PostgreSQL with Row Level Security.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn ghost sm" onClick={exportData}>⬇️ Export Data (JSON)</button>
      </div>
      <div style={{ marginTop: 26, display: 'flex', gap: 14, alignItems: 'center' }}>
        <Mascot mood="think" size={70} />
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Sparky says: your data is backed up in Supabase. Never share your service-role key!</p>
      </div>
    </div>
  );
}
