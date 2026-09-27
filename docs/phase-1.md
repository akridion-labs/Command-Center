---
title: VYOM COMMAND CENTER — PHASE 1
audience: the Dev Agent, and Deepak
authority: This is the BRIEF. The ORDER lives in EXECUTION_ORDER.md; the HOW for
  the brain lives in Vyom_Final_v98.docx. This file covers the CONSOLE only.
date: 25 September 2026
training_allowed: no
---

# Vyom Command Center — Phase 1

**Copy this file to `<project>/docs/phase-1.md`.** That is the exact path
`project_init.py` looks for, so the Dev Agent can adopt the folder and, on a
return visit, work out where it stopped.

```
/project        <- point the agent at the folder. First visit: adopt it.
```

---

## 1 · What this is, and what it is not

**IS:** a static front end for six panels that already exist as HTTP endpoints
on the Vyom deck. It renders state and asks questions. It is the *face* of the
brain, not part of it.

**IS NOT:** a second brain, an API, or anything that holds state. Every number
it shows comes from `/vyom/*`, and every panel already declares whether it is
`built: true|false` — so the console never has to guess.

🚨 **The console must never compute a fact the server could give it.** The
moment it does, there are two answers to "how many chunks" and no way to tell
which is right. That failure has its own runbook rows (88, 90, 94).

---

## 1b · Before the agent starts: software, files, models (26 Sep 2026)

**One command checks the software:** `ojas devcheck`. It never installs anything;
it prints each tool, the version it found, and the exact fix (runbook 114).

| tool | version | why | if missing |
|---|---|---|---|
| Ubuntu (WSL2) | the server's | where the code, Node and the agent run | - |
| git | 2.30+ | the project is a git repo, no remote | `sudo apt-get install -y git` |
| Python | 3.10+ | the deck, `ojas`, the dev agent's tools | already there |
| **Node** | **24** (Active LTS); floor 20.19 for Vite 7 | build only, never runtime. **On the host**: the dev agent runs `npm` itself (116) | nodesource `setup_24.x` (5.0) |
| Docker + compose v2 | 24+ / 2.x | **optional**: reproducible builds (5.0b) | Docker Desktop, WSL integration ON |
| **To HOST the console** | nothing new | the deck (Python, already running) serves `~/vyom/console/`; a systemd service keeps it up (STEP 3b). No nginx, no Node at runtime, no .NET | - |
| Browser (Windows) | Chrome or Edge | the app window at logon (`vyom_deck_app.ps1`) | Edge ships with Windows |
| Ollama | running on 127.0.0.1:11434 | the brain's models | `ojas brain --fix` |
| Claude Code + dev agent | agent **1.95+** | drives the build | STEP 5, from the v1.95 zip |
| VS Code + Remote-WSL | current | where you edit | open Ubuntu once from VS Code |
| **.NET** | **not needed** | nothing in this build is .NET | if a .NET project comes later: **.NET 10 LTS** (supported to Nov 2028), in a container: `mcr.microsoft.com/dotnet/sdk:10.0`. .NET 11 (10 Nov 2026) is short-term support |
| Kubernetes | **not used** | static files need no scheduler (runbook 113) | - |

### The files the agent needs, and what happens to each

The design is **read where it landed**, never copied into another folder (runbook 116).
Only the logo goes into the project:

```bash
ls "/mnt/c/Users/akrid/Downloads/Vyom Command Deck Console"      # .dc.html, support.js, uploads/
cp "/mnt/c/Users/akrid/Downloads/Vyom Command Deck Console/uploads/logo.jpeg" \
   ~/Projects/command-center/src/assets/
```

| file | what it is | into the app? |
|---|---|---|
| `Vyom Command Deck.dc.html` (120 KB) | **THE design**: a Claude Design export. Read it as SOURCE (5.7) | ✅ mirrored into React components, never copied as-is |
| `support.js` (64 KB) | the Claude Design **runtime** (`dc-runtime`, generated) | ⛔ **never shipped** - it runs the design tool, not our app |
| `uploads/logo.jpeg` | the Akridion logo (= `Akridion labs LLP logo.jpeg`) | ✅ `src/assets/logo.jpeg`, imported so Vite bundles it |
| `uploads/*.png`, `pasted-*.jpeg`, `Image 1*.jpeg` | Gemini/reference images (~7.5 MB) | ⛔ reference only - look, don't bundle |
| `uploads/sample-*.html` | an earlier sample page | ⛔ reference only |

### Which models help, and for what

| who | model | use it for | never for |
|---|---|---|---|
| **Drives the build** | Claude, via the VS Code extension + dev agent | the whole story: plan, code, tests, review | - |
| Local, private | the `code_generation` chain in `model_registry.yaml` (today `qwen2.5-coder:7b`) | Ojas code answers over our repo (`ojas repo`) | driving the full protocol: a 7-9B model cannot hold it (`provider_router.py` refuses) |
| Local candidates (fit 12 GB) | **`qwen3.5:9b-q4_K_M`** (6.6 GB, reads images) · **`gemma4:12b-it-q4_K_M`** (7.6 GB, reads images) | can LOOK at the design images; promote only after `ojas benchmark` (STEP 6) | - |
| Local, Meta | **`muse-glimmer:30b-q4_K_M`** (18 GB, Meta's current open model) | dev help: tools, vision, 128K. ⚠️ does NOT fit 12 GB, part runs on the CPU; measure with `ollama ps` + `ojas benchmark` | a brain lane, until it passes the 100%-GPU rule (114b) |
| ⛔ too big for 12 GB | `qwen3-coder-next` (52 GB), `qwen3-coder:30b`, `qwen3.5:27b` coding tags | - | - |
| Cloud, FREE, via the Service Hub (122e) | **Kimi K2.6** - built for coding-driven UI/UX - from `nvidia_nim` (`moonshotai/kimi-k2.6`) or `openrouter_free` (`moonshotai/kimi-k2.6:free`, your existing key) | `ojas route --class PUBLIC --cap design "…"` for layout/UX ideas; `--cap coding` for React/three.js snippets | vault text or company data - LOCAL_ONLY never leaves (runbook 110) |

**Binding a model to this project** uses the dev agent's own tool (no new tool):
`python3 ~/.claude/tools/model_setup.py --probe` (what Ollama really serves), then
`--setup --repo ~/Projects/command-center`.

**Removing old models safely:** `ojas models --unused` prints `ollama rm` lines
only for models NOTHING references (registry, providers.yaml, scripts,
config.env, the dev agent's binding). It never deletes, and it never lists
`qwen2.5-coder:7b` or `qwen3:14b` while the registry uses them. The registry's
own rule, *keep the previous model for one cycle*, still applies after a promotion.

---

## 2 · The endpoints — what is REAL today

Verified on the running deck. `ojas sweep` and `deck_panels.py --self-test`
both cover these.

| endpoint | state | what it returns |
|---|---|---|
| `GET /vyom/me` | ✅ real | who is logged in, their `options`, `verified`, `config_problem` |
| `GET /vyom/health` | ✅ real | model, index freshness, answer quality, attention items |
| `GET /vyom/tasks` | ✅ real | document jobs + research packets + deferred archive copies |
| `GET /vyom/agents` | ✅ real | reads `~/.claude/agents` — **the same folder VS Code reads** |
| `GET /vyom/quota` | 🔶 partial | storage REAL; **usage explicitly `built: false`** — no telemetry yet |
| `GET /vyom/containers` | ⛔ `built: false` | nothing is containerised. **Returns no empty list, by design** |
| `POST /vyom/act` | ⛔ `501` | refuses everything until each action is named, role-checked, audited |
| `POST /vyom/ask` | ✅ real | the chat path. `{question, mode}` → `{answer, sources}` |

⚠️ **A panel whose `built` is `false` must render the words NOT BUILT.** An
empty list reads as *"nothing is running"*; the truth is *"this was never
written"*. Opposite facts, identical pixels — that is runbook 87, and it is the
single rule this console exists to respect.

---

## 2b · IT IS A DESKTOP APP, NOT A URL YOU TYPE

> *"as soon as I log on it needs to open, instead of a web application… so I can
> minimise and check the other access as well… a console application as a
> service."*

⭐ **The load-bearing fact: the React app is IDENTICAL in all three options
below.** Only the WRAPPER differs. So this is a **reversible decision** — ship
the app, wrap it in the cheapest thing that works, and upgrade the wrapper later
without touching a line of the UI.

| option | what you get | cost | reversible? |
|---|---|---|---|
| **A. Chrome/Edge `--app` window** ⭐ | Own window, no browser chrome, taskbar icon, minimises, opens at logon | **zero new toolchain** | ✅ trivially |
| **B. Tauri 2** | A real `.exe`, ~3 MB, uses the OS webview, system-tray support | Rust toolchain + a build step | ✅ the UI is unchanged |
| **C. Electron** | A real `.exe`, tray, deepest OS integration | ~150 MB bundle, bundles its own Chromium | ✅ the UI is unchanged |

### ⭐ Recommended for Phase 1: option A — and say plainly why

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --app=http://localhost:8765/console/ ^
  --window-size=1400,900 ^
  --user-data-dir="%LOCALAPPDATA%\VyomDeck"
```

Save that as `Vyom Deck.lnk` and add it to the **existing** `VyomDeckAutostart`
logon task (runbook 95). **It gets you everything described** — its own window
with no address bar, a taskbar entry you can minimise, and it opens at logon.

📌 **Why this and not Tauri now** (the trade-off, stated rather than implied):
Tauri gives you a genuine binary and a tray icon, which you may well want. It
also adds a Rust toolchain, a second build pipeline, and a signing question — on
a machine whose **actual constraint is 12 GB of VRAM and a GPU connector that
has caused five crashes.** Option A is **the boring solution, chosen
deliberately**: it is one shortcut file, it is reversible in a minute, and it
proves the UI before any of that is worth paying for.

⚠️ **`--user-data-dir` is not optional.** Without it the app window shares a
profile with your normal browsing — so signing out of Vyom, or a cleared cookie,
affects both. A separate profile keeps the deck session its own.

### When to move to Tauri (option B)

Move when **one of these becomes true**, not before:

- You want a **system-tray icon** with the brain's status at a glance
- You want the app to survive without Chrome installed
- You want native notifications when a crawl finishes or a gate fails

🚨 **And the UI does not change when you do.** Tauri loads the same `dist/`.
That is the whole reason this decision is safe to defer.

### ⛔ The Hostinger question — a real trap, flagged early

> *"if possible we can use the Hostinger business account, I can host this UI if
> I want to access this on the web."*

⚠️ **Hosting the UI publicly does NOT give you the brain.** The deck binds
`127.0.0.1` and the vault is on an encrypted drive in your office. A Hostinger-
hosted console would load, render its shell, and **fail every single `/vyom/*`
call** — because there is no route from the public internet to a loopback port,
by design.

To actually reach the brain remotely you need one of:

1. **Tailscale + the deck bound to the tailnet IP** — private, already installed, the intended path (v98 §4.84.1)
2. A reverse tunnel to the server — which **publishes the brain**, and needs its own security review before anything else

📌 **So Hostinger is a route for a PUBLIC site, not for this console.** Worth
keeping for a marketing page; it is not an access path for the vault. That is
not a limitation to work around — **it is the security model doing its job.**

---

## 3 · Tech stack, decided

| | choice | why this |
|---|---|---|
| **Build** | **Vite 7** | The deck serves static files. Vite emits a plain `dist/` — no second runtime on a box that already runs one |
| **UI** | **React 19 + TypeScript** | Six HTML pages already share copy-pasted CSS. TS catches a renamed endpoint at *build* time instead of as a blank panel at 2am |
| **Styling** | **Tailwind v4** + the existing CSS variables | Compiles to a static stylesheet at build time. Keep the palette from `command_center.html` as CSS vars and have Tailwind reference them, so the deck stays ONE product |
| **Fonts** | **`@fontsource/<family>`** | The same Google fonts, shipped as woff2 inside the bundle |
| **Data** | `fetch` + a tiny `useEndpoint` hook | Six read-only reads. **No state library** — add one when there is state to share |
| **Router** | none in Phase 1 | One page of tiles. Add a router when there are routes |
| **Tests** | **Vitest** + one render test per panel | The panel that matters is the one that renders `NOT BUILT` correctly |

⛔ **Not in Phase 1:** a component library, Redux/Zustand, SSR, a router, i18n,
or a chart library. Each is a dependency on a machine that must keep working
offline, and none is needed to draw six panels.

### 3D (three.js): Phase 1b, after the six panels render (26 Sep 2026)

Deepak wants a three.js visual layer, with the library chosen by asking a
cloud coding model (Kimi / GLM through the Ollama API). Both are fine, in this order:

| | |
|---|---|
| **Library** | `three` + **`@react-three/fiber`** (React renderer for three.js) + `@react-three/drei` (helpers). Check peers before installing: `npm view @react-three/fiber peerDependencies` must accept the installed React |
| **Install** | `npm i three @react-three/fiber @react-three/drei` + `npm i -D @types/three`: **build-time**, bundled into `dist/`. Never a `<script src>` from a CDN (same rule as Tailwind). Docker route: prefix with `docker compose run --rm dev` |
| **⚠️ The React-version trap** | R3F caps the React versions it accepts. **9.7 refused React 19.3**, which is npm's default now, and 9.8.0 (22 Sep 2026) lifted the cap to `<19.4`. So a fresh `npm create vite` + an older R3F fails with `ERESOLVE`. Check first: `npm view @react-three/fiber peerDependencies`. ⛔ **Never `--force` or `--legacy-peer-deps`.** They hide the incompatibility until it breaks at runtime. Bump R3F and React TOGETHER |
| **Load** | `React.lazy(() => import('./Scene'))` so the ~600 KB of three.js never delays the panels. The panels are the product; the 3D is decoration |
| **Fallback** | No WebGL, or `prefers-reduced-motion` → render nothing. **The deck must be fully usable with the scene absent** |

🚨 **Two constraints specific to THIS machine:**

1. **The console is viewed over RDP.** Remote sessions often fall back to
   software WebGL, so a scene that is smooth on a laptop can crawl in the
   session. Check it in the RDP window before calling it done.
2. **If the browser runs ON the server, WebGL shares the RTX 5070 with Ollama**,
   and 12 GB holds one model (row 11a). Keep the scene light (low poly count, no
   post-processing), and **pause it when the window is hidden**
   (`frameloop="demand"` in R3F).

📌 **Asking Kimi/GLM which library is fine: it's a public-knowledge question.**
**Pasting deck code that contains company data or vault text into it is not**
(RUNBOOK_07 START.MODELS, runbook 110).

📌 **`<script src="https://cdn.tailwindcss.com">` is the one genuine "never".**
That build compiles Tailwind **in the browser on every load** — Tailwind's own
docs say not to ship it. `npm i -D tailwindcss` is the shipped path.

---

## 4 · The skeleton

```
command-center/
  docs/
    phase-1.md                 <- THIS FILE. project_init.py reads it
  .github/agents/              <- written by: python3 ~/.claude/tools/ide_agents.py
  .vscode/settings.json        <- committed: interpreter, test command
  src/
    main.tsx                   <- font imports live here
    App.tsx                    <- the tile grid + the ask box
    api.ts                     <- ONE fetch wrapper. Every call goes through it
    endpoints.ts               <- the endpoint list + their TS types
    panels/
      Health.tsx  Tasks.tsx  Agents.tsx  Quota.tsx  Containers.tsx
      NotBuilt.tsx             <- the shared "this was never written" panel
    components/
      Tile.tsx  AskBox.tsx
    index.css                  <- @import "tailwindcss" + the Vyom palette vars
  index.html
  package.json  vite.config.ts  tsconfig.json  tailwind.config.ts
```

⭐ **`NotBuilt.tsx` is a first-class component, not an afterthought.** Three of
eight endpoints are partly or wholly unbuilt. Giving that state a real component
is what stops someone rendering `[]` and calling it done.

---

## 5 · The script — Phase 1, in order

Each step says what you should see. Stop if you do not see it.

### 5.-1 THE REAL PATHS, AND THE ONE THAT BIT US BEFORE

The files live on the **Windows** side. In Ubuntu they appear under `/mnt/c/`:

| | |
|---|---|
| **Windows** | `C:\Users\akrid\Downloads\Akeidion labs papers-20260814T115015Z-1-001\Akeidion labs papers\Server Setup Documents` |
| **In Ubuntu** | `/mnt/c/Users/akrid/Downloads/Akeidion labs papers-20260814T115015Z-1-001/Akeidion labs papers/Server Setup Documents` |
| **Design** | `C:\Users\akrid\Downloads\Vyom Command Deck Console` → `/mnt/c/Users/akrid/Downloads/Vyom Command Deck Console` |

#### 🚨 NEVER use a wildcard in that `cd`. This exact thing cost four days.

**Runbook 56:** `cd Downloads/*/Server\ Setup\ Documents` matched **TWO**
folders — the live one and an August archive — and silently used the archive.
**49 files were replaced with old code and runbook 33 through Phase 4 D0 was
undone in one command.**

⚠️ **And the name you now have makes that MORE likely, not less.**
`Akeidion labs papers-20260814T115015Z-1-001` is a Google-Takeout export name,
which means a plain `Akeidion labs papers` folder very probably also exists.
**Two folders whose names both start the same way is the precondition.**

✅ **The deploy script itself is safe** — it uses
`SRC="$(cd "$(dirname "$0")" && pwd)"`, its own location, with no glob. So the
risk is **entirely in the `cd` you type.**

#### Prove you are in the LIVE folder before deploying

```bash
cd "/mnt/c/Users/akrid/Downloads/Akeidion labs papers-20260814T115015Z-1-001/Akeidion labs papers/Server Setup Documents"

pwd                        # read it back. Is it the timestamped one?
ls vyom_deck_app.ps1       # exists ONLY in the current version
grep -c "runbook" test_regressions.py    # marker count - CONTENT, not a date
```

#### ⛔ Do NOT use `ls -t` on `/mnt/c`. It lies, and it lied on 25 Sep.

A real run returned `weekly_discovery.py, web_scout.py, vyom_uninstall.py` —
**reverse alphabetical**, which looks like a sort bug and is not one.

⭐ **On a drvfs mount, mtimes record the COPY, not the authoring.** The files
were written to Windows in alphabetical order a fraction of a second apart, so
"newest first" returns them backwards. **Every timestamp on `/mnt/c` is the
moment it was transferred**, so a stale folder copied yesterday looks newer than
the live folder copied last week.

✅ **Use CONTENT, not dates.** The marker count in `test_regressions.py` only
ever goes up, so it is a version number that cannot be faked by a file copy:

```bash
python3 test_regressions.py | grep -E "✅ all|🚩"   # expect: ✅ all 384 ... (0 skipped)
```

🚨 **If that number is far below what the runbook records, you are in an old
tree** — regardless of what any timestamp says.

🚨 **If `vyom_deck_app.ps1` is missing, you are in a STALE folder. STOP.**
That is the cheapest possible canary: one file that only the live tree has.
Deploying from the wrong folder is silent and it looks like success.

📌 **Quote the whole path.** It contains spaces in two places; an unquoted `cd`
will fail confusingly or land somewhere else entirely.

#### ⚠️ The project itself must NOT live on `/mnt/c`

`/mnt/c` is a **drvfs** mount — Windows files seen through a translation layer.

- `npm install` there is typically **5–10× slower**, because it writes thousands of small files across that layer
- **File watchers are unreliable**, so `npm run dev` may not reload on save
- It is the same mount whose stale state has already caused incidents (57, 86)

✅ **So: Windows Downloads is the TRANSFER location. The project lives in the
Linux filesystem.** The design is only READ, so it stays in Downloads; no
extra folder is made for it (runbook 116):

```bash
ls "/mnt/c/Users/akrid/Downloads/Vyom Command Deck Console"   # expect: Vyom Command Deck.dc.html, support.js, uploads/
```

⭐ **The `.dc.html` is the design SOURCE, not a picture of the design.** Mirror
its actual markup, spacing and layout primitives — do not eyeball the render and
approximate. That is what makes it a specification rather than a mood board.

### 5.-0 WHERE THE PROJECT LIVES — not the vault, not a database

> *"the project folder — are you creating in vault or in the Ubuntu database?"*

**Neither. It is a plain folder on the Linux filesystem, under git.**

| | location | what goes there | why |
|---|---|---|---|
| 💻 **CODE** | `~/Projects/command-center` | the React project, `.git/`, `docs/phase-1.md` | You must be able to `git diff` it. This is `/home/akridion/Projects/` — **inside Linux**, not `/mnt/c`, not M: |
| 📄 **DOCUMENTS** | `/mnt/m/MyCompanyVault/` | runbooks, contracts, research | Encrypted, and it is what Vyom *ingests* |
| 🧠 **THE INDEX** | `~/vyom/vault.sqlite` | the searchable brain | **Derived** from the vault. Rebuilt by `ojas refresh` |
| 🚀 **THE RUNNING INSTALL** | `~/vyom/` | deployed code + `~/vyom/console/` | The deploy target. Byte-verified by `ojas verify` |

#### 🚨 There is no "Ubuntu database" — and the distinction matters

`vault.sqlite` is an **INDEX**, not a store. It is **derived** from the vault
and can be rebuilt from scratch in ~95 seconds. **Nothing is ever the only copy
inside it.** That is why the uninstaller rescues it rather than treating it as
precious, and why losing it is an inconvenience rather than a loss.

#### ⛔ Why the project must NOT go in the vault

You settled this yourself on 22 Sep: *"maintain the code in a secure folder in
the brain or vault — but NOT the code, because the vault is offline, I can't
check the repo."*

- **M: is dismounted more often than it is mounted.** A git repo there has no `diff`, no `log` and no rollback exactly when you need them
- **`ojas refresh` would try to INGEST your source** as if it were company documents — thousands of junk chunks, and the brain's answers get worse
- ⭐ **The vault protects documents by SECRECY. Git protects code by HISTORY.** Different jobs, different homes

📌 **And `move_docs_to_vault.py` already enforces this** — it refuses to move
`.py`, `.ts`, `.html` or `.json`, so a stray command cannot put code in there
by accident.

```bash
mkdir -p ~/Projects
cd ~/Projects          # /home/akridion/Projects — confirm with: pwd
```

### 5.0 Check Node exists FIRST

🚨 **§5.1 runs `npm create vite` and would fail with `npm: command not found`.**
Vyom is Python + stdlib only; **nothing in the brain needed Node**, so it may
never have been installed on this box.

```bash
node --version      # want v24 (Active LTS, Sep 2026); v20.19+ is the Vite 7 floor
npm --version
```

**If either is missing**, on Ubuntu inside WSL:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version && npm --version
```

⚠️ **Do NOT `apt install nodejs` on its own** — Ubuntu's default repo ships a
version too old for Vite 7, and the failure arrives later as a confusing build
error rather than as "wrong Node".

📌 **Node lives on the Linux side, with the code.** It is a build-time tool: it
produces `dist/` and is not needed to *run* the console. That keeps the runtime
surface unchanged.

### 5.0b Or develop in DOCKER — Deepak's choice, 26 Sep 2026

This follows the plan's own line (EXECUTION_ORDER, *THEN Docker for development*):
**the code runs in the container; Ollama, the vault and the deck stay on the HOST.**
Node then lives in the container, so a host Node install is optional.

#### Check what is actually installed (paste the output into `ojas log`)

`ojas devcheck` covers every tool at once (1b). The lines below add the two
Docker-specific proofs it cannot make: the image runs, and a container reaches the deck.

```bash
node -v 2>/dev/null || echo "no host node - fine for the Docker route"
docker version --format 'docker {{.Server.Version}}'
docker info --format '{{.OperatingSystem}}'   # "Docker Desktop" or an Ubuntu docker-ce
kubectl config current-context 2>/dev/null || echo "no kubernetes context"
id -u                                          # want 1000 = the node image's user
docker run --rm node:24-slim node -v           # want v24.x
# Can a container reach the deck? (needs STEP 3b: the deck must be running)
docker run --rm node:24-slim node -e "fetch('http://host.docker.internal:8765/vyom/health').then(r=>console.log('deck',r.status)).catch(e=>console.log('FAIL',e.cause?.code))"
```
*You should see:* `v24.x` twice and `deck 200`. 🚨 **If the last line says FAIL,
read the proxy trap below before going any further.**

#### `compose.yaml`, in the project root

```yaml
services:
  dev:
    image: node:24-slim           # Active LTS. Pin the major version, never `latest`
    user: node                    # uid 1000 - files you create stay yours on the host
    working_dir: /app
    volumes: ["./:/app"]
    ports: ["127.0.0.1:5173:5173"]   # 🚨 the 127.0.0.1 is NOT optional
    environment:
      VYOM_DECK: http://host.docker.internal:8765
    extra_hosts: ["host.docker.internal:host-gateway"]
    command: npm run dev -- --host 0.0.0.0
```

```bash
docker compose run --rm dev npm install        # any npm command, same shape
docker compose up                              # dev server -> http://localhost:5173/console/
docker compose run --rm dev npm run build      # dist/ lands on the HOST
cp -r dist/* ~/vyom/console/                   # the deck serves it; no container at runtime
```

#### The four traps, each one real

1. 🚨 **`-p 5173:5173` publishes on EVERY interface.** On docker-ce it also
   skips past ufw, and with mirrored networking "every interface" includes the
   LAN and the tailnet. `127.0.0.1:5173:5173` keeps the dev server on this machine, the same
   rule as the deck binding loopback.
2. ⚠️ **Inside a container, `127.0.0.1` is the CONTAINER, not the server.** So
   the proxy target comes from `VYOM_DECK` (5.2). The deck binds loopback, and
   whether `host.docker.internal` reaches a loopback-bound service depends on the
   Docker flavour. **Medium confidence it works on Docker Desktop, so the `fetch`
   check above decides, not this paragraph.** If it FAILs, either enable host
   networking in Docker Desktop and use `network_mode: host` with
   `VYOM_DECK=http://127.0.0.1:8765`, or run just `npm run dev` natively (5.0).
   ⛔ **Never rebind the deck to 0.0.0.0 to make the container happy.** That
   would publish the brain.
3. ⚠️ **The node image runs as ROOT by default.** Then `package-lock.json`, `dist/`
   and `node_modules` come out root-owned, and your next host-side edit fails with
   EACCES. `user: node` (uid 1000) prevents it. `id -u` must print 1000.
4. ⚠️ **Keep VS Code on Remote-WSL, NOT "Reopen in Container".** The dev agent
   lives in `~/.claude` on the WSL side. Inside a dev container it disappears
   (no protocol, no lessons), and so does STEP 5c, which indexes those lessons
   into the brain. **Edit on the host, run Node in the container.**

📌 **If `npm run dev` does not reload on save**, add `watch: { usePolling: true }`
under `server` in `vite.config.ts`. File events do not always cross into a
container. It costs some CPU, so only add it if you see the problem.

#### Kubernetes — deliberately NOT for this (26 Sep 2026)

⛔ **The console is static files that the deck serves.** Kubernetes would add a
control plane running around the clock, on a single 12 GB machine whose recorded
constraint is **stability** (five crashes, GPU connector). It would also add a
second service model beside the systemd unit Phase 4 already proved (P4.1). That's
cost with nothing to show for it.
✅ **Revisit when there is more than one machine, or more than one long-running
service that must be scheduled.** Neither is true today.
📌 If Docker Desktop's built-in Kubernetes is switched on and unused, switching
it off returns its memory to Ollama. That's your call; nothing here needs it.

### 5.1 Scaffold

```bash
mkdir -p ~/Projects && cd ~/Projects
npm create vite@latest command-center -- --template react-ts   # answer NO to "install and start now"
cd command-center
npm install
npm i -D tailwindcss @tailwindcss/vite vitest @testing-library/react jsdom @types/three
npm i three @react-three/fiber @react-three/drei @fontsource/rajdhani @fontsource/jetbrains-mono
mkdir -p docs src/assets
```
*You should see:* `added N packages`, and `npm run dev` starts on :5173.

🐳 **Docker route:** scaffold with a throwaway container, then add `compose.yaml` (5.0b)
and run every `npm` above as `docker compose run --rm dev npm ...`:

```bash
docker run --rm -it -u node -v ~/Projects:/w -w /w node:24-slim \
  npm create vite@latest command-center -- --template react-ts
```

### 5.2 `vite.config.ts` — the proxy is the important line

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/console/',                    // the deck serves it from ~/vyom/console/
  server: {
    // DEV ONLY. VYOM_DECK is set by compose.yaml (5.0b); natively it is unset.
    proxy: { '/vyom': process.env.VYOM_DECK ?? 'http://127.0.0.1:8765' },
  },
  test: { environment: 'jsdom' },
})
```

📌 **Why the proxy:** `npm run dev` on :5173 forwards `/vyom/*` to the live deck
on :8765. No CORS problem, no second copy of the API, and you are developing
against **real** data from the first minute.

⚠️ **`base: '/console/'` matters.** Without it the built asset paths are absolute
and the page loads blank when served from a subfolder — with no console error
that points at the cause.

### 5.3 `src/api.ts` — one wrapper, and it respects `built`

```ts
export type Panel<T> =
  | ({ built: true } & T)
  | { built: false; why: string; unblocked_by?: string }

export async function get<T>(path: string): Promise<Panel<T>> {
  const r = await fetch(path, { credentials: 'same-origin' })
  if (r.status === 401) { location.href = '/vyom/login'; throw new Error('login') }
  if (r.status === 403) return { built: false, why: 'not permitted for your role' }
  if (r.status === 501) return { built: false, why: 'not implemented yet' }
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}
```

🚨 **The `Panel<T>` union is the point.** TypeScript will not let a panel read
`data.chunks` without first checking `data.built === true`. The compiler enforces
the one rule this console exists for — it is not left to anyone remembering.

### 5.4 Build, CHECK, ship

```bash
npm run build
ojas assets ~/Projects/command-center/dist        # MUST print: no runtime external references
mkdir -p ~/vyom/console && cp -r dist/* ~/vyom/console/
```
*You should see:* `✅ No runtime external references.`

⛔ **If `ojas assets` finds anything, fix it before shipping.** It names the npm
package to install instead. An `import` in source is **not** a finding — that is
the solution.

### 5.5 Serve it from the deck

The deck already serves static files from `~/vyom`. Confirm:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8765/console/
```
*You should see:* `200`.

### 5.6 Make it a desktop app that opens at logon

```powershell
powershell -ExecutionPolicy Bypass -File vyom_deck_app.ps1 -Install
powershell -ExecutionPolicy Bypass -File vyom_deck_app.ps1 -Status
```
*You should see:* `OK shortcut installed`, then `Deck : OK - answering on 8765`.

⚠️ **The shortcut is PER WINDOWS USER** (it goes in *your* Startup folder).
The COO and CTO sign in with their own Windows accounts over RDP, so the app
window will NOT open for them. Until that's decided, they use
`http://localhost:8765` in a browser (PARTNER_02 STEP 2), which gives the same
deck. An all-users install is a later, admin-level decision: it needs the
profile path resolved per user at LAUNCH, not baked in at install (row 112).

📌 **`-Status` tells the two failures APART.** "The launcher is fine; the
service is not" versus "no browser found" — different fixes, and a blank app
window with no explanation is how someone concludes the console is broken when
the *service* is down.

🚨 **This launcher does NOT start the brain.** The deck runs as a systemd
service inside WSL (`ojas service install`), and WSL must wake at logon
(`vyom_autostart.ps1`). Three separate things, each with its own check.

### 5.7 The design source

| | |
|---|---|
| **Design export** | `~/Downloads/Vyom Command Deck Console/Vyom Command Deck.dc.html` |
| updated | 25 Sep 2026 · 120 KB · `support.js` alongside it |
| endpoints it calls | the **same six** — `/vyom/{health,tasks,agents,quota,containers,act}`, all of which now exist |
| ⚠️ | **3 runtime CDN references across 2 hosts** — `ojas assets` names them and the npm package to use instead |

⭐ **Read the `.dc.html` as SOURCE, not as a screenshot of itself.** Mirror its
actual markup structure, spacing and layout primitives into components — do not
eyeball the render and approximate it. It is a Claude Design export, so the
structure in the file *is* the specification.

#### 🚨 Five things in the design that must NOT be copied (runbook 114)

| in the design | why it breaks | do this instead |
|---|---|---|
| `<script src="…cdnjs…/three.js/r128/three.min.js">` | **the deck's own CSP blocks it**: `script-src 'self'`. And r128 is from 2021; current three has renamed APIs (e.g. `outputEncoding` → `outputColorSpace`) | `npm i three @react-three/fiber @react-three/drei` (§3); port the background, don't paste it |
| Google Fonts `<link>` (Rajdhani, JetBrains Mono) | **CSP blocks it too**: no `font-src`, so `default-src 'self'` applies | `npm i @fontsource/rajdhani @fontsource/jetbrains-mono` |
| `http://brain-api:8000` | a hostname that does not exist here | relative `/vyom/...` through `api.ts` (the Vite proxy in dev) |
| `ojas-coder:v1` | a placeholder model name | bind `model` to `/vyom/health` → `.model` |
| `support.js` | the design tool's runtime | nothing - React replaces it |

⚠️ **This refines runbook 98, it does not reverse it.** 98 rightly retracted
"loopback breaks the CDN". But **our own security header does**: served from
`:8765/console/`, the CSP blocks every external script, stylesheet and font. The
Vite dev server sends no CSP, so it all works on `:5173` and fails on `:8765`.
**Always check the built app at `:8765/console/` with DevTools open.**

#### What each live value binds to (never invent one)

| design binding | real source | if absent |
|---|---|---|
| `model` | `/vyom/health` → `.model` | - |
| `chunks` | `/vyom/health` → `.vault.total_chunks` (or `/vyom/quota` → `.storage.chunks`) | - |
| `quota` | `/vyom/quota` → `.storage` (size on disk, index age) | - |
| `spend` | `/vyom/quota` → `.usage` is **`built: false`** | **NOT BUILT** panel with its `why` |
| `vram`, `ram` | **no endpoint** (the T2 collector is not exposed) | **NOT BUILT** |
| `latency` | **not measured** (`ask.py` does not log duration yet) | **NOT BUILT** |
| `brief` | **no endpoint** | **NOT BUILT** |

🚨 **Five of eight headline numbers have no source today.** Showing a plausible
number there is the exact failure runbook 87 exists to prevent. NOT BUILT is the
correct, honest render.

#### Design props that need a decision, not a guess

| prop | design default | decision needed |
|---|---|---|
| `defaultRole` | `cto` (`cto` \| `coo`) | take the role from `/vyom/me`; the prop is only a preview control |
| `nodeCount` | 55 (0-90) | the three.js background; lower it if the RDP window stutters (§3 3D) |
| `bootSound` | `true` | ⚠️ browsers **block audio before a click**, so a sound at logon will silently not play. **Deepak decides:** play on first click (recommended, boring) or off |

---

## 6 · Definition of done for Phase 1

- [ ] Six panels render, each from its real endpoint
- [ ] Every `built: false` panel shows **NOT BUILT** and its `why` — never an empty list
- [ ] The ask box posts to `/vyom/ask` and shows `sources` under the answer
- [ ] Tiles respect `options` from `/vyom/me` (**convenience, not security** — the server still decides)
- [ ] `config_problem` from `/vyom/me` is displayed when present
- [ ] `ojas assets ~/Projects/command-center/dist` → clean
- [ ] `npm test` → one render test per panel, including the NOT BUILT case
- [ ] Served at `http://localhost:8765/console/` → 200 **AND zero CSP errors in DevTools** (a 200 does not prove it rendered)
- [ ] Every value with no endpoint (`vram`, `ram`, `latency`, `spend`, `brief`) renders **NOT BUILT**, never a number
- [ ] `ojas devcheck` → ready, before the first story
- [ ] Opens as its **own app window at logon** (`vyom_deck_app.ps1 -Status` → both lines OK)
- [ ] **Founder and COO/CTO see different tiles** — proven by logging in as each, not by reading `ROLE_OPTIONS`

⚠️ **Not in scope:** `/vyom/act` stays 501. Making the console *act* is Phase 2
and needs a named action list, a role check and an audit line **before** it runs.

---

## 7 · How to drive the Dev Agent through this

```
/project                     # first visit: adopt the folder
/start-story                 # then: "implement docs/phase-1.md section 5.3"
```

Four sentences that keep it on the rails:

1. **"Read `docs/phase-1.md`, then do §5.N."** The brief carries the expected output of every command.
2. **"Check `RUNBOOK_07` for this error before diagnosing it."** 100+ incident rows; `ojas fix` does it automatically.
3. **"Run the self-test BEFORE you commit."** A passing regression scan proves the intent lines are present, not that the code works.
4. **"`ojas assets ~/Projects/command-center/dist` before you call it done."**

📌 **Standing rules from the agent's own protocol:** never push, never open a PR,
and no commit without explicit confirmation of that specific change.

---

*If this file and `EXECUTION_ORDER.md` ever disagree about ORDER, the plan wins.
If this file and the running deck disagree about an ENDPOINT, the deck wins.*
