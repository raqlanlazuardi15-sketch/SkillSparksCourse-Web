// Supabase Edge Function: approve-student
// Approves a student application: creates the auth user via the Admin API,
// creates the profile + enrollment, and sends an activation email.
// Deploy: supabase functions deploy approve-student
// Secrets required (server-side only): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// The caller must be an authenticated admin (verified below).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey);

    // 1. Verify caller is an admin
    const authHeader = req.headers.get('Authorization')!;
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return json({ error: 'Forbidden: admin only' }, 403);

    // 2. Load the pending application
    const { applicationId } = await req.json();
    const { data: app } = await admin.from('student_applications').select('*').eq('id', applicationId).single();
    if (!app || app.status !== 'pending') return json({ error: 'Application not found or already decided' }, 400);

    // 3. Create auth user (invited — must set password via activation link)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: app.email,
      email_confirm: true,
      user_metadata: { name: app.name },
    });
    if (createErr) return json({ error: createErr.message }, 400);

    // 4. Profile + enrollment + mark approved
    await admin.from('profiles').insert({
      id: created.user.id, role: 'student', name: app.name, email: app.email,
      age: app.age, school: app.school, parent_name: app.parent_name,
      whatsapp: app.whatsapp, device: app.device, notes: app.notes,
      account_status: 'invited',
    });
    if (app.course_id) {
      await admin.from('course_enrollments').insert({ student_id: created.user.id, course_id: app.course_id });
    }
    await admin.from('student_applications').update({ status: 'approved', decided_at: new Date().toISOString() }).eq('id', applicationId);

    // 5. Send activation email (requires SMTP configured in Supabase Auth settings)
    const { error: mailErr } = await admin.auth.admin.generateLink({
      type: 'recovery', email: app.email,
      options: { redirectTo: `${Deno.env.get('SITE_URL')}/#/activate` },
    });
    if (mailErr) {
      // Email not configured — return a clear warning + manual activation path
      return json({ ok: true, warning: 'Account created but email delivery is not configured. Send the student a manual activation link or configure SMTP in Supabase Auth settings.', userId: created.user.id });
    }
    return json({ ok: true, message: 'Approved. Activation email sent.' });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
