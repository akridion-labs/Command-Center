# command-center

Part of **Akridion Labs**. Built on the Vyom server (`AKRIDION-AI-01`), versioned at
[https://github.com/akridion-labs/Command-Center](https://github.com/akridion-labs/Command-Center). The brief the agent builds against is **[docs/phase-1.md](docs/phase-1.md)** - read it first.

## Stack

@react-three/fiber, react, tailwindcss, three, typescript, vite, vitest

## Run it

```bash
npm install
npm run dev        # vite
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run preview    # vite preview
```

## Open it

- On the server: `ojas open command-center` - VS Code on Windows, connected to Ubuntu (WSL).
- From another machine: clone `https://github.com/akridion-labs/Command-Center.git`, or Remote-SSH to the server over Tailscale.

## How we work

| rule | why |
|---|---|
| `main` is always releasable; work happens on branches (`feat/...`, `fix/...`, `try/...` for model experiments) | a broken experiment never blocks anyone |
| small commits, messages that say WHY (`fix: panel shows NOT BUILT instead of []`) | the weekly engineering digest quotes them to the brain |
| pushing is a person's act - the dev agent commits locally only | nothing reaches GitHub unreviewed |
| libraries come from npm into the build - never a CDN `<script>`; never `npm i --force` | `ojas assets` checks the first; `--force` hides real conflicts |
| no keys, tokens or passwords in the repo - ever | server secrets live in `~/.vyom/secrets.env`; the scanner flags leaks |

## The dev agent and the brain

- Build with the dev agent: `claude` (your Claude plan) or `ojas claude --local` (local models, Muse first),
  then `/start-story implement docs/phase-1.md`.
- The brain reads this repo daily (`repo:command-center`); ask it: `ojas repo command-center "where is X?"`.
- Which model built what: `ojas devlog`. This week's decisions: `ojas thinking --print`.
