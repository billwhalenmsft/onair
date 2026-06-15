# SE-OS Demo Cockpit — build spec (fork of onAiR)

> **Decision (Bill, 2026-06-15):** **fork onAiR** (MIT) into **one Demo Cockpit the SE
> owns and controls** — a single surface that **orchestrates ALL demo actions live**:
> narration, live Q&A, AND Scout-driven clicks. Not separate tools.
>
> **Fork:** `billwhalenmsft/onair` (MIT, ours). Upstream: `souz4rafael/onair` (Rafael
> Souza — a Microsoft engineer; internally friendly).
>
> **Why fork (not embed-in-HTML):** Bill wants **one cockpit he controls**. The fork
> keeps onAiR's killer overlay (transparent, always-on-top, **invisible during screen
> share**) AND — being Electron — its main process can POST to Scout's sidecar
> **without the CORS limits** a browser tab has. One app, full control, real overlay.

---

## What onAiR already gives us (keep, don't rebuild)
- **Transparent always-on-top overlay**, invisible during screen share, click-through.
- **Script mode** — load `.txt`, scroll (manual / auto / voice-activated), global hotkeys.
- **Q&A mode** — `Ctrl+Alt+R` record customer question → Whisper → LLM answer in overlay.
  6 providers incl. **Azure OpenAI**; customizable system prompt + presentation context.
- **Browser mode** — embed a URL in the overlay.
- Electron: `main.js` (windows, hotkeys, IPC, AI calls) · `preload.js` · `renderer/`
  (`index.html`, `renderer.js`, `settings.html`, `settings.js`).

## What we ADD to make it the Demo Cockpit (the fork work)

### 1. Cockpit mode (the orchestration surface) — NEW
A 4th mode beside Script/Q&A/Browser: **Cockpit**. Loads a **storyboard** (run-of-show)
and renders **step cards** — each with the narration line, the Scout action, a **Run**
button, and a fallback. The cockpit is the ONE surface the SE drives live:
- **Narration** → feeds Script mode (auto-scrolls as you advance steps).
- **Q&A** → the existing overlay Q&A, **pre-loaded with the engagement context** (scope
  tiers + honest flags) so live answers are grounded.
- **Action** → **Run in Scout** fires the click on the live app.
- **Modes:** step-gated (tap next) / auto-run (Scout clicks through).

### 2. Scout bridge (the unlock the fork enables) — NEW
In `main.js` (Electron main process — **no CORS**), add an IPC handler that POSTs the
action to **Scout's sidecar `http://localhost:19823`** (`{action:'send', prompt:'…'}`),
with reachability probe + graceful fallback to the recorded clip. The renderer's Run
button → IPC → main → sidecar. (The HTML prototype had to use `no-cors`; the Electron
main process does a clean POST and reads the response.)

### 3. Storyboard loader (driven by the Engagement Guide) — NEW
Load the cockpit's steps from a **storyboard file/URL** (the Engagement Guide exports it):
`{ meta, qa_context, steps:[{ what, say, do, fallback_clip }] }`. So every demo's cockpit
is generated from its Guide — one source, per the engagement-output standard.

### 4. Rebrand — light
`productName` → **"SE-OS Demo Cockpit"**, appId, icon, title. Keep onAiR credit (MIT +
Rafael Souza). Note the rename in README.

### 5. Q&A grounding wired to the engagement — NEW
Auto-load the storyboard's `qa_context` as onAiR's Q&A system prompt on cockpit load, so
the SE's live-answer co-pilot already knows the scope tiers (won't claim SAP is live).

---

## Architecture (one cockpit, three jobs)
```
        ENGAGEMENT GUIDE  →  storyboard.json (meta · qa_context · steps[say/do/fallback])
                                   │ loaded by
                                   ▼
                 ┌──────── SE-OS DEMO COCKPIT (forked onAiR, Electron) ────────┐
                 │  overlay: transparent, always-on-top, invisible on share    │
                 │  ┌─ Script ──┐  ┌─ Q&A ─────┐  ┌─ Cockpit (NEW) ──────────┐ │
                 │  │ narration │  │ Whisper+  │  │ step cards · Run in Scout │ │
                 │  │ scroll    │  │ Azure LLM │  │ step-gated / auto-run     │ │
                 │  └───────────┘  └───────────┘  └────────────┬─────────────┘ │
                 └───────────────────────────────────────────┼───────────────┘
                                                              │ IPC → main.js → POST (no CORS)
                                                              ▼
                                                  Scout sidecar localhost:19823
                                                              │ executes
                                                              ▼
                                                     Live demo app (D365 / web)
```

The SE drives **one cockpit**: read the line, tap "next" (or auto-run), Scout clicks,
answer a curveball via Q&A — all from the transparent overlay, invisible to the customer.

---

## Build path (suggested order)
1. **Clone the fork**, get it running (`npm install` → `start.cmd`); confirm overlay +
   Script + Q&A work as-is.
2. **Scout bridge in `main.js`** — IPC handler → POST `localhost:19823`; probe + fallback.
   *(First concrete value — proves the orchestration.)*
3. **Cockpit mode** in `renderer/` — step cards from a storyboard file; Run → IPC.
4. **Storyboard loader** — load from file/URL; auto-set Q&A context.
5. **Rebrand** + README + build the installer (`npm run build`).
6. **Tennant pilot** — generate Tennant's `storyboard.json` from the demo script; dry-run.

## The Tennant test target
The Tennant 6-stage script + scope tiers are already structured (see
`customers/tennant/demo-build/`). Generate `tennant.storyboard.json` and run it through
the cockpit for the Wed demo (or as the first real pilot after).

## Open items
1. **Scout sidecar :19823** — confirm/stabilize schema with the ClawPilot/Scout team
   (`scout-sidecar-confirm` todo).
2. **Build session:** this is a focused Electron build — best as its own session/worktree
   (like a customer build). Starter prompt + clone to follow.
3. **Distribution:** internal install of the NSIS build (or portable) for SEs.

---

## Status
- ✅ Decision: fork (Option B). Fork created: `billwhalenmsft/onair` (MIT).
- ✅ HTML prototype proved the UX (teleprompter + Q&A + Scout buttons + both modes) —
  now the reference for the cockpit mode in the fork.
- 🔴 Build the fork additions (Scout bridge → cockpit mode → loader → rebrand).
