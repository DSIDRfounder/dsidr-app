const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ymcykhleftblpxfnfqhk.supabase.co',
  process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

// ── AUTH: validate access code ──
app.post('/api/login', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Access code required' });

  const { data, error } = await supabase
    .from('trial_users')
    .select('*')
    .eq('access_code', code.toUpperCase().trim())
    .single();

  if (error || !data) return res.status(401).json({ error: 'Invalid access code' });

  // Update display name if provided
  if (req.body.name && req.body.name.trim()) {
    await supabase.from('trial_users').update({ display_name: req.body.name.trim() }).eq('id', data.id);
    data.display_name = req.body.name.trim();
  }

  res.json({ user: { id: data.id, name: data.display_name, code: data.access_code } });
});

// ── PROJECTS: list user's projects + collaborations ──
app.get('/api/projects', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  // Own projects
  const { data: owned } = await supabase
    .from('projects')
    .select('id, name, template, updated_at, created_at')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });

  // Collaborated projects
  const { data: collabs } = await supabase
    .from('project_collaborators')
    .select('project_id, role, projects(id, name, template, updated_at, owner_id, trial_users(display_name))')
    .eq('user_id', userId);

  const shared = (collabs || []).map(c => ({
    id: c.projects?.id,
    name: c.projects?.name,
    template: c.projects?.template,
    updated_at: c.projects?.updated_at,
    owner_name: c.projects?.trial_users?.display_name,
    role: c.role,
    shared: true
  })).filter(s => s.id);

  res.json({ owned: owned || [], shared });
});

// ── PROJECTS: save new project ──
app.post('/api/projects', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  const { name, template, data } = req.body;
  const { data: project, error } = await supabase
    .from('projects')
    .insert({ owner_id: userId, name, template: template || '', data: data || {} })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ project });
});

// ── PROJECTS: load project ──
app.get('/api/projects/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !project) return res.status(404).json({ error: 'Project not found' });

  // Check access: owner or collaborator
  if (project.owner_id !== userId) {
    const { data: collab } = await supabase
      .from('project_collaborators')
      .select('id')
      .eq('project_id', req.params.id)
      .eq('user_id', userId)
      .single();
    if (!collab) return res.status(403).json({ error: 'No access to this project' });
  }

  res.json({ project });
});

// ── PROJECTS: update project data ──
app.put('/api/projects/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  const { data, name } = req.body;
  const update = { data, updated_at: new Date().toISOString() };
  if (name) update.name = name;

  const { error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', req.params.id)
    .eq('owner_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── COLLABORATORS: add by access code ──
app.post('/api/projects/:id/collaborators', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  const { code, role } = req.body;

  // Find the user by access code
  const { data: invitee } = await supabase
    .from('trial_users')
    .select('id, display_name')
    .eq('access_code', code.toUpperCase().trim())
    .single();

  if (!invitee) return res.status(404).json({ error: 'No user with that code' });
  if (invitee.id === userId) return res.status(400).json({ error: 'Cannot add yourself' });

  const { error } = await supabase
    .from('project_collaborators')
    .upsert({ project_id: req.params.id, user_id: invitee.id, role: role || 'Teammate' });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ collaborator: { id: invitee.id, name: invitee.display_name, role: role || 'Teammate' } });
});

// ── COLLABORATORS: list ──
app.get('/api/projects/:id/collaborators', async (req, res) => {
  const { data } = await supabase
    .from('project_collaborators')
    .select('user_id, role, trial_users(id, display_name)')
    .eq('project_id', req.params.id);

  const list = (data || []).map(c => ({
    id: c.trial_users?.id,
    name: c.trial_users?.display_name,
    role: c.role
  }));
  res.json({ collaborators: list });
});

// ── COMMENTS: list ──
app.get('/api/projects/:id/comments', async (req, res) => {
  const { data } = await supabase
    .from('project_comments')
    .select('*')
    .eq('project_id', req.params.id)
    .order('created_at', { ascending: true });

  res.json({ comments: data || [] });
});

// ── COMMENTS: post ──
app.post('/api/projects/:id/comments', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  const { text, display_name } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });

  const { data: comment, error } = await supabase
    .from('project_comments')
    .insert({ project_id: req.params.id, user_id: userId, display_name: display_name || 'Anonymous', text: text.trim() })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ comment });
});

// ── AI PROXY ──
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });
  const { messages, system } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid request.' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400, system: system || '', messages }),
    });
    return res.json(await response.json());
  } catch (err) { return res.status(500).json({ error: 'Failed to reach AI.' }); }
});

// ── FEEDBACK ──
const feedback = [];
app.post('/api/feedback', (req, res) => {
  feedback.push({ ...req.body, date: new Date().toISOString() });
  console.log('Feedback #' + feedback.length);
  res.json({ ok: true });
});
app.get('/api/feedback', (req, res) => {
  if (req.query.key !== (process.env.FEEDBACK_KEY || 'dsidr2026')) return res.status(401).json({ error: 'Unauthorized' });
  res.json(feedback);
});

// ── ROUTES ──
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'app.html')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log('DSIDR running on port ' + PORT));
