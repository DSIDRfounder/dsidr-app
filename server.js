const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── PROXY ENDPOINT — keeps API key secret on the server ──
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request — messages array required.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: system || '',
        messages,
      }),
    });

    const data = await response.json();
    return res.json(data);

  } catch (err) {
    console.error('Anthropic API error:', err);
    return res.status(500).json({ error: 'Failed to reach AI. Please try again.' });
  }
});

// ── HEALTH CHECK ──
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'DSIDR AI Coach' }));

// ── CATCH ALL — serve the frontend ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DSIDR server running on port ${PORT}`);
});
