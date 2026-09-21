# Search Dev GitHub (PivotalStacks Careers)

Next.js app to search GitHub developers, validate emails, generate personalized outreach, and send via Resend.

## Run on another PC (quick start)

### 1. Requirements

- **Node.js 20+** (LTS): https://nodejs.org
- **npm** (comes with Node)
- Windows: if `better-sqlite3` fails to install, install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (“Desktop development with C++”)

### 2. Copy the project

**Option A — USB / zip (no Git)**

On this PC, from the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\pack-for-transfer.ps1
```

Or: `npm run pack`

That creates a zip **without** `node_modules` / `.next`, and **with**:

- `.env.local` (keys — keep private)
- `data/app.db` (SQLite users / favorites)
- `data/*.json` (contacts, sent history, templates)

On the other PC: unzip → double-click `run.bat` → open http://localhost:3000

To zip **without** secrets: add `-SkipEnv`  
To zip **without** database: add `-SkipData`

**Option B — Git**

```bash
git clone <your-private-repo-url>
cd <repo>
```

Then copy `.env.local` manually (never commit secrets).

### 3. Install and run (easiest on Windows)

Double-click:

1. **`setup.bat`** — once (creates `.env.local` if missing + `npm install`)
2. **`run.bat`** — every time you want the app (stops any old server on 3000/3001 first)
3. **`stop.bat`** — if you need to stop the server without Ctrl+C

If you see “Port 3000 is in use” or “Another next dev server is already running”, run **`stop.bat`**, then **`run.bat`** again. Or just run **`run.bat`** — it clears the old process first.

```powershell
# From the project root
copy .env.example .env.local
# Edit .env.local and paste your real keys (or use the file you transferred)

npm install
npm run dev
```

Open **http://localhost:3000**

`run.bat` will also run `npm install` automatically the first time if `node_modules` is missing.

### 4. Required keys in `.env.local`

| Variable | Needed for |
|----------|------------|
| `GITHUB_TOKEN` | Search / rate limits |
| `NEXTAUTH_URL` | `http://localhost:3000` on local |
| `NEXTAUTH_SECRET` | Auth (any long random string) |
| `RESEND_API_KEY` | Sending email |
| `MINIMAX_API_KEY` | AI-written message copy |

Optional: `GITHUB_ID` / `GITHUB_SECRET` (OAuth), `HUNTER_API_KEY`, `MINIMAX_*` overrides.

Generate a secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Full template: see `.env.example`.

### 5. Sign in

Create an account / sign in via the app’s auth screen (credentials stored in local SQLite under `data/`).

If you want the **same users and history** on the new PC, also copy:

- `data/app.db` (if present)
- `data/*.json` (contacts, sent history, etc.)
- `data/templates.json` (email chrome templates)

### Common issues

| Problem | Fix |
|---------|-----|
| `better-sqlite3` build error | Install VS Build Tools, then `npm rebuild better-sqlite3` |
| Port 3000 in use | `npx next dev -p 3001` and set `NEXTAUTH_URL=http://localhost:3001` |
| AI messages say “Template” | Set `MINIMAX_API_KEY` and regenerate |
| No GitHub results | Check `GITHUB_TOKEN` (comma-separated PATs OK) |
| Emails not sending | Check `RESEND_API_KEY` and domain DNS in Resend |

### Scripts

| Command | What it does |
|---------|----------------|
| `run.bat` | Stop old server if needed + start http://localhost:3000 |
| `stop.bat` | Stop server on ports 3000/3001 |
| `setup.bat` | Create `.env.local` + `npm install` |
| `npm run dev` | Local development |
| `npm run build` / `npm start` | Production mode |
| `npm test` | Unit tests |
| `npm run setup` | Copy `.env.example` → `.env.local` if missing |

### Why is `.next` so large?

`.next` is **not your source code**. Next.js writes compiled pages, Turbopack/webpack cache, and logs there so reloads stay fast. It grows after you run `run.bat` / `npm run dev`.

- Safe to delete anytime (use **`clear-cache.bat`**)
- Recreated automatically on the next start
- Already excluded from the transfer zip and from git

`node_modules` is the big dependency folder; `.next` is just the build cache on top of that.
