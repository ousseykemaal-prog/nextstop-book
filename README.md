# Nextstop Book — Setup Guide

## Stack

| Layer     | Choice        | Why |
|-----------|---------------|-----|
| Frontend  | Vanilla HTML/CSS/JS (ES Modules) | No build step, works on any server |
| Database  | **Supabase**  | Free tier, SQL, great JS ESM client, easy dashboard |
| PDF       | **jsPDF 2.5** | Client-side, no server needed, CDN (certificat only) |
| Server    | Python `http.server` or any static host | |

---

## 1. Run locally

```bash
cd nextstop-book
python -m http.server 3000
# open http://localhost:3000
```

---

## 2. Set up Supabase

### 2a. Create a project

1. Go to [app.supabase.com](https://app.supabase.com) → **New project**
2. Choose a name (e.g. `nextstop-book`), set a DB password, pick region **EU West**
3. Wait ~2 minutes for provisioning

### 2b. Create tables

In the Supabase dashboard → **SQL Editor** → **New query**, paste and run:

```sql
-- Pre-orders table
CREATE TABLE precommandes (
  id          BIGSERIAL PRIMARY KEY,
  reference   TEXT NOT NULL,
  prenom      TEXT NOT NULL,
  nom         TEXT NOT NULL,
  email       TEXT NOT NULL,
  telephone   TEXT,
  ville       TEXT,
  code_postal TEXT,
  situation   TEXT,
  volume      TEXT,
  message     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Global stats (single row, edited manually)
CREATE TABLE stats (
  id               INTEGER PRIMARY KEY DEFAULT 1,
  livres_collectes INTEGER DEFAULT 0,
  kg_papier        INTEGER DEFAULT 0,
  ecoles_aidees    INTEGER DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the single stats row
INSERT INTO stats (id, livres_collectes, kg_papier, ecoles_aidees)
VALUES (1, 0, 0, 0);

-- Certificates table (filled manually after each real collection)
CREATE TABLE certificats (
  id                BIGSERIAL PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  prenom            TEXT,
  nom               TEXT,
  date_collecte     DATE,
  livres_collectes  INTEGER DEFAULT 0,
  kg_papier         NUMERIC(6,2) DEFAULT 0,
  pct_associations  INTEGER DEFAULT 0,
  pct_revente       INTEGER DEFAULT 0,
  pct_recyclage     INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 2c. Enable RLS policies

```sql
-- Allow anyone to insert pre-orders (public form)
CREATE POLICY "Allow public insert" ON precommandes
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anyone to read stats
CREATE POLICY "Allow public read stats" ON stats
  FOR SELECT TO anon USING (true);

-- Allow anyone to read certificates (lookup by email)
CREATE POLICY "Allow public read certificats" ON certificats
  FOR SELECT TO anon USING (true);

-- Enable RLS on all tables
ALTER TABLE precommandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificats  ENABLE ROW LEVEL SECURITY;
```

### 2d. Get your API keys

**Project Settings → API**:
- `URL` → copy the **Project URL**
- `anon public` → copy the **anon key**

### 2e. Add keys to config.js

Open `js/config.js` and replace:

```js
const SUPABASE_URL      = 'https://xxxx.supabase.co';  // ← your URL
const SUPABASE_ANON_KEY = 'eyJhbGci...';               // ← your anon key
```

---

## 3. Setup Telegram notifications

Each form submission triggers a Telegram message to your account.

**Step 1** — Create a bot
1. Open Telegram, search for **@BotFather**
2. Send `/newbot` and follow the instructions
3. Copy the **TOKEN** (looks like `123456:ABC-DEF...`)

**Step 2** — Get your Chat ID
1. Search for **@userinfobot** on Telegram
2. Send any message (e.g. `hi`)
3. It replies with your **Chat ID** (a number like `123456789`)

**Step 3** — Add to config.js
```js
export const TELEGRAM_BOT_TOKEN = '123456:ABC-DEF...';  // ← your token
export const TELEGRAM_CHAT_ID   = '123456789';           // ← your chat ID
```

> If either value is left as the placeholder, Telegram notifications are silently skipped — the form still works normally.

---

## 4. Update live stats

The homepage counters are fetched live from the `stats` table.

**Option A — Supabase dashboard (easiest)**
1. Go to **Table Editor → stats**
2. Click the row → edit `livres_collectes`, `kg_papier`, `ecoles_aidees`
3. Save → the website reflects the new values immediately

**Option B — SQL**
```sql
UPDATE stats
SET livres_collectes = 523,
    kg_papier        = 214,
    ecoles_aidees    = 8,
    updated_at       = NOW()
WHERE id = 1;
```

---

## 5. Add a certificate after a collection

After you complete a real collection, add a row in the `certificats` table.

**Via Supabase Table Editor → certificats → Insert row:**

| Column | Example | Notes |
|--------|---------|-------|
| `email` | `marie@exemple.be` | Must match exactly what the client used |
| `prenom` | `Marie` | |
| `nom` | `Dupont` | |
| `date_collecte` | `2025-04-10` | Format: YYYY-MM-DD |
| `livres_collectes` | `247` | Total books collected |
| `kg_papier` | `98.5` | Weight of paper saved |
| `pct_associations` | `45` | % donated to schools/NGOs |
| `pct_revente` | `35` | % resold second-hand |
| `pct_recyclage` | `20` | % recycled (must sum to 100) |

The client then visits **nextstopbook.be/certificat.html**, enters their email, and their certificate appears with a PDF download button.

**Via SQL:**
```sql
INSERT INTO certificats
  (email, prenom, nom, date_collecte, livres_collectes, kg_papier,
   pct_associations, pct_revente, pct_recyclage)
VALUES
  ('marie@exemple.be', 'Marie', 'Dupont', '2025-04-10',
   247, 98.5, 45, 35, 20);
```

---

## 6. View pre-orders

In **Table Editor → precommandes** — all submissions appear here with timestamps.

Export as CSV: **Table Editor → Export**.

---

## 7. Deploy (optional)

Works on any static host:
- **Netlify**: drag & drop the `nextstop-book/` folder
- **Vercel**: `vercel --cwd nextstop-book`
- **GitHub Pages**: push to a `gh-pages` branch

> Supabase CORS is open to all origins by default for the anon key.

---

## File structure

```
nextstop-book/
├── index.html           Landing page (7 sections + live stats)
├── precommande.html     Pre-order form → Supabase + Telegram
├── certificat.html      Certificate lookup + PDF download
├── css/
│   └── style.css        All styles (all pages)
├── js/
│   ├── config.js        Supabase + Telegram keys (⚠️ do not commit)
│   ├── main.js          Entry point for index.html
│   ├── animations.js    Canvas, scroll reveals, counters, carousel
│   ├── form.js          Form validation, DB save, Telegram notify
│   └── certificat.js    Certificate lookup, render, PDF export
└── README.md
```

---

## Demo mode (no Supabase / no Telegram)

If `config.js` still has placeholder values:
- Form still validates and submits (DB save + Telegram silently skipped)
- Stats show demo values (1 234 livres, 567 kg, 12 écoles)
- Certificate page: enter any email containing `demo` to see a sample certificate
