const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── API PROXY ──
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
  console.log('Feedback #' + feedback.length + ':', req.body.rating + '/5');
  res.json({ ok: true, count: feedback.length });
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
