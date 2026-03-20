# DSIDR · AI Project Coach

AI-powered project coaching app for young people, built on the DSIDR framework.

---

## Deploy to Railway in 5 steps

### Step 1 — Get a free Railway account
Go to **railway.app** and sign up with GitHub (free, no credit card needed).

### Step 2 — Push this folder to GitHub
1. Go to **github.com** → New repository → name it `dsidr-app`
2. Upload all these files (drag and drop the whole folder), or use Git:
```bash
git init
git add .
git commit -m "DSIDR AI Coach"
git remote add origin https://github.com/YOUR_USERNAME/dsidr-app.git
git push -u origin main
```

### Step 3 — Deploy on Railway
1. Go to **railway.app/dashboard**
2. Click **New Project → Deploy from GitHub repo**
3. Select your `dsidr-app` repository
4. Railway auto-detects Node.js and deploys — takes about 60 seconds

### Step 4 — Add your Anthropic API key
1. In Railway, click your project → **Variables** tab
2. Click **New Variable**
3. Name: `ANTHROPIC_API_KEY`
4. Value: your key from **console.anthropic.com**
5. Railway redeploys automatically

### Step 5 — Get your live URL
1. Click **Settings → Networking → Generate Domain**
2. You'll get a URL like `dsidr-app-production.up.railway.app`
3. Share this with anyone — no sign-up, no API key needed to use it

---

## How it works

```
User browser  →  Your Railway server  →  Anthropic API
                 (holds API key)
```

Users never see your API key. All AI calls go through your server.

---

## Project structure

```
dsidr-app/
├── server.js          ← Express server + API proxy
├── package.json       ← Node dependencies
├── railway.toml       ← Railway config
├── .gitignore
└── public/
    └── index.html     ← Full DSIDR frontend
```

---

## Costs

- **Railway**: Free tier includes 500 hours/month (enough for demos)
- **Anthropic**: ~$0.003 per coaching conversation (very cheap)
- A full user testing session with 50 people costs roughly $0.15 total

---

## Get an Anthropic API key

1. Go to **console.anthropic.com**
2. Sign up → go to **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-`)
4. Paste it into Railway as `ANTHROPIC_API_KEY`

New accounts include free credits.
