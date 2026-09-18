# Blocked

A 3D corporate satire game, playable in the browser.

**Play: [dumbcorporategames.com](https://dumbcorporategames.com)**

You're an earnest project manager at Alignly, trying to keep the Customer Happiness Portal Refresh on track until the 4:30 Executive Review while the office slowly becomes surreal from accumulated workplace rage. Every corporate solution technically helps the project while quietly making the humans more miserable.

Built solo with AI coding tools (Claude Code) over about five months. Third-person, WASD/arrow keys, no install.

## The four phases

| Phase | Name | What it is |
|---|---|---|
| 1 | **Pre-Standup Alignment** | Walk the office, talk to your team, manage five meters (Time, Project Status, Pissed-Off, Meeting Load, Corporate Progress) before standup starts. |
| 2 | **Jira Run** | You go to update your tickets and get pulled into the board: a three-lane 8-bit runner through an Atlassian gauntlet, depositing updates at Kanban gates. |
| 3 | **Lunch Dash** | A GTA-style driving phase disguised as a lunch break. Sixty in-game minutes to pick up lunch and get back. |
| 4 | **Performance Review** | The campaign finale: a real-time fighting game disguised as the 4:30 Executive Review. The meeting is real; the combat is how the game draws what it feels like. |

Each phase was designed as its own vertical slice — the blueprints in the repo root (`Blocked_Game_Blueprint.md`, `Blocked_Phase2_Blueprint.md`, …) are the design docs the game was built against, kept in-repo so the intent is visible next to the code.

## Repo layout

```
game/                  Vite + React + TypeScript app
  src/scene/           React Three Fiber scene, camera, characters
  src/state/           Zustand stores (meters, dialogue, achievements)
  src/jirarun/         Phase 2
  src/lunchdash/       Phase 3
  src/perfreview/      Phase 4
  src/audio/           Sound manager + radio station
  scripts/playtest/    Headless autopilot harness — bots play the game
                       thousands of times to check fairness and reachability
  scripts/press/       Puppeteer-driven screenshot/video capture
  scripts/mixamo/      FBX → GLB character pipeline
  functions/api/       Cloudflare Pages Function for the mailing-list form
Blocked_*.md           Game design blueprints, story, dialogue scripts
Playtest_Framework.md  How playtests were run and scored
```

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Three.js** via **React Three Fiber** and **Drei**
- **Zustand** for game state
- **Mixamo** characters and animations, converted to compressed GLB
- Deployed as a static site on **Cloudflare Pages**

## Run locally

```bash
cd game
npm install
npm run dev
```

Autopilot balance tests live in `game/scripts/playtest/` — see [`Playtest_Framework.md`](Playtest_Framework.md) for what they measure.
