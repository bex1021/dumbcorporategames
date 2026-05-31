# Game Playtest Framework — Autopilot Balance Testing

*A repeatable method for proving a game is winnable, fair, and balanced — with evidence instead of vibes.*

**Status:** Also installed as a Claude skill (`autopilot-playtest`) at `~/.claude/skills/autopilot-playtest/`, so it can be invoked on any game. This file is the standalone, shareable copy.
**Last updated:** 2026-05-30
**Proven on:** Blocked — Phase 1 (Standup, a decision game) and Phase 2 (Jira Run, a reflex runner).

---

## Contents
1. What it does
2. The core principle: one brain, two bodies
3. The 5-step framework
4. Adapting by genre
5. Fair vs hard vs fun
6. The metrics scorecard
7. Design frameworks to measure against
8. Live-game metrics (real players)
9. The quick checklist
10. Practical tooling notes
11. The report format
12. Appendix: applied results on Blocked

---

## 1. What it does

Builds a **robot that plays the game thousands of times** so you can answer, with evidence:

- Is it **winnable**? With what strategy, and how reliably?
- Is it **fair** — is there ever a situation with no possible escape?
- Is the **difficulty curve** healthy (ramps smoothly, no cliffs)?
- Is all the **content reachable** (every ending, achievement, reward)?
- Is the **risk/reward** balanced (does greedy play pay off without being a death trap)?
- Is there a **dominant strategy** that makes every other choice pointless?

Then it **classifies each failure** (real game bug vs the bot just playing badly), **fixes only the real bugs**, and **re-verifies**.

> This is different from a manual "does it boot / does it work" smoke test. This is a mathematical balance audit run by bots. Use both: smoke test for *"does it work,"* autopilot for *"is it good."*

## 2. The core principle: one brain, two bodies

**Single source of truth.** The game and the test must run the *exact same rules code*. If you reimplement the rules in the test, the two drift and your test validates a fiction.

> Extract the game's rule logic into a headless module (no graphics, no UI). The real game imports it to draw the screen; the test harness imports it to run bots. **One brain, two bodies.**

If the rules already live in a clean module (a state store, an engine), reuse it directly. If they're tangled inside the rendering loop, **refactor first** — move the per-frame/per-turn logic into a standalone module the renderer calls — then confirm the live game still plays identically before testing.

## 3. The 5-step framework

**1. Find or extract the rules engine.** Locate where state changes happen (a game loop, a Zustand/Redux store, a turn resolver). Pull the pure logic into a headless module exposing: current state, input methods, and a `step()`/`resolve()` that returns events. No `window`, no 3D, no React.

**2. Make it deterministic.** Replace `Math.random()` with a **seeded RNG** so any failure replays exactly. Also expose a way to replay a seed in the *live* game so a human can watch the exact bad run (e.g. read `?seed=N` from the URL).

**3. Write autopilot "personalities."** Not one optimal bot — a spread:
- **perfect / optimal** — plays correctly. If *this* bot loses, the seed is a candidate for unfairness.
- **greedy** — chases rewards even at risk. Measures risk/reward.
- **reckless / handicapped** — refuses one mechanic (never slides, never blocks). Measures how punishing that mechanic is.
- **naive / random** — barely plays. The floor: how fast does careless play fail?

**4. Run at scale + measure.**
- *Small/discrete choice space* (decision games): **brute-force every combination** (and every order if order matters). This *proves* reachability, not samples it.
- *Large/continuous space* (reflex games): **fuzz** hundreds–thousands of seeds × personalities.
- Collect the metrics (scorecard below) into a printed report.

**5. Classify, fix, re-verify.** *Before fixing anything*, trace the failure: is it *genuine unfairness* (no input survives) or the *bot misplaying*? They look identical in the stats. Improve the bot until it's competent; only failures that survive a competent bot are real.
- Genuine bug → fix the **game**, re-run, confirm the metric moves.
- Bot bug → fix the **bot**, re-run.
- When possible, **prove fairness with math** (an invariant), not just "the bot won 99%." Example: *min gap between hazards (12u) > collision window (1.4u) AND no row blocks all lanes ⇒ no unavoidable death.*

## 4. Adapting by genre

The method is constant; only the run-strategy and the metric emphasis change.

| Genre | Rules engine shape | Run strategy | Headline metrics |
|---|---|---|---|
| **Reflex / real-time** (runner, driver, fighter) | fixed time-step `step(dt)`; inputs like move/jump/duck | fuzz seeds × personalities; trace deaths | win rate, **death-cause × segment**, difficulty-by-level, fairness invariant |
| **Decision / turn-based** (dialogue, strategy, cards) | `applyChoice()` over a state store | **brute-force all combos × all orders** | winnability, ending distribution, **content reachability**, dominant-strategy check, resource/deadline fairness |
| **Hybrid** (walk + decide) | drive the decision store; **model navigation** (positions × move-speed) for time/resource cost | brute-force decisions, model location reachability | all decision metrics + whether the time/resource budget is beatable once movement counts |
| **Economy / progression** | resource update function | simulate long sessions; many seeds | inflation/sink balance, reward cadence, grind time, pay-to-win gap |

**In short:** reflex → *fuzz + trace*; decision → *brute-force + reachability*.

## 5. Fair vs hard vs fun (measure them separately)

Three different properties, three different tests. Conflating them is the #1 balance mistake.

- **Fair** = solvable; every loss is the player's fault. → *Provable by bots/math.*
- **Hard** = demands skill. → *Measurable by bots (the gap between naive and optimal play).*
- **Fun** = people enjoy it and come back. → *NOT bot-measurable — needs humans + real telemetry.*

The harness certifies the first two; hand the third back to a human with data + clean screenshots. A game can be fair-but-boring, fun-but-broken, or hard-but-unfair. Aim for fair AND appropriately hard AND fun.

## 6. The metrics scorecard (what "good" looks like)

Targets are starting points — adjust for audience (casual vs hardcore) and intent (a satire game *wants* a "doing it right still makes you late" tax).

- **Skilled win rate** — competent bot completes the game. Target ~95–100% for a *fair* game. Below that only if every loss is a provably-survivable skill check.
- **Naive/floor failure** — careless play should fail fast (proves stakes are real). Naive bot ~0% win is healthy.
- **Difficulty curve** — failures by segment for the skilled bot: ~0 early, rising gently. A spike = a difficulty cliff to smooth.
- **Skill expression / ceiling gap** — distance between naive and optimal outcomes. Wide = rewards mastery; near-zero = choices don't matter.
- **Content reachability** — % of endings/achievements/secrets a bot can actually obtain. Must be **100%** — an unobtainable achievement is a bug.
- **Risk/reward** — greedy should score meaningfully higher *without* a much lower win rate. Greed that wins less AND scores less = a trap; greed that wins the same AND scores way more = a free choice (no real decision).
- **Dominant strategy check** — is one path always best? If yes, the rest is dead content.
- **No unavoidable failure** — the hard fairness floor. Ideally proven by an invariant.
- **Pacing / time-to-complete** — flag too-short (trivial) or too-long (slog).

## 7. Design frameworks to measure against

- **Flow theory (Csikszentmihalyi)** — the channel between boredom (challenge < skill) and anxiety (challenge > skill). Keep challenge rising just behind the player's growing skill. The difficulty-curve metric *is* a flow check: a spike = anxiety cliff; a flat-easy stretch = boredom. The primary lens for difficulty tuning.
- **MDA (Mechanics → Dynamics → Aesthetics)** — rules → emergent behavior → felt experience. Bots rigorously test Mechanics + Dynamics; Aesthetics (the feeling, whether the joke lands) is the human's call. Designers build M→D→A; players feel A→D→M.
- **Fairness vs difficulty (Sirlin, "Playing to Win")** — "hard" (high skill required = good) and "unfair" (outcome not skill-determined = bad) are opposites of *different* things. This is exactly the classify-the-failure step.
- **Bartle player types** — Achiever / Explorer / Socializer / Killer. Use to deliberately design variety (e.g. achievements serve Achievers + Explorers). Guides what content to add.

## 8. Live-game metrics (need real players, not bots)

Bots can't measure these — they require shipping + telemetry. Benchmarks are mobile/free-to-play-skewed and vary hugely by genre; treat as ballpark. For a portfolio/showcase game, prioritize a tight, complete, fair, finishable experience (what the harness certifies) over these.

| Metric | Meaning | Rough "decent" |
|---|---|---|
| D1 / D7 / D30 retention | return after 1 / 7 / 30 days | ~30–40% / ~10–15% / ~5% |
| FTUE / tutorial completion | finish onboarding | aim >80% (biggest early drop-off) |
| Funnel / drop-off | where players quit | find the cliff, fix it |
| Session length & frequency | how long / how often | genre-dependent; watch the trend |
| Stickiness (DAU/MAU) | daily ÷ monthly active users | ~20% decent, ~50%+ great |

## 9. The quick checklist (run before calling any game "done")

- [ ] Skilled bot win rate ≥ ~95% (and every loss provably survivable)
- [ ] Clueless/naive bot fails fast (the stakes are real)
- [ ] Difficulty failures rise *gently* by segment — no cliff
- [ ] **100%** of endings / achievements / secrets reachable (bot-proven)
- [ ] Greedy/risky play is a fair gamble, not a trap
- [ ] No single dominant strategy
- [ ] No unavoidable-loss situation (ideally proven by an invariant)
- [ ] Run length sits in a sensible band
- [ ] *(human, not bot)* It feels good — pacing, juice, the joke lands

## 10. Practical tooling notes

- **Run TypeScript headlessly with `npx tsx scripts/playtest/<file>.ts`** — no build needed. Run from the package dir (a stray `cd` can move your shell's cwd and break relative imports).
- **Stub timers in big batches**: `;(globalThis as any).setTimeout = () => 0` before importing the store, so per-run cleanup timers don't pile up across 100k runs.
- **localStorage**: guard or expect it absent in Node.
- **Driving a Zustand store headlessly works**: `useStore.getState().someAction()` — no React needed. Reset between runs with the store's `reset()`.
- **Replay a flagged seed live**: expose the engine on `window.__GAME__` (dev-only) and accept `?seed=N` so a human can watch the exact bad run.
- **Headless-preview caveat**: a backgrounded browser tab pauses `requestAnimationFrame`, freezing the render loop — don't judge "it's broken" from a frozen live screenshot. Verify via the harness + a clean build.
- **Always confirm parity after a refactor**: build clean + spot-check the live game still plays the same before trusting the harness.

## 11. The report format

Print a scannable report, not a wall of logs:
1. **Personality table** — each bot: outcome, key meters/score, achievements.
2. **Brute-force / fuzz summary** — win rate, outcome distribution, rating distribution.
3. **Reachability matrix** — every ending/achievement ✅/❌ (flag any ❌ as a bug).
4. **Difficulty curve** — failures by segment for the skilled bot.
5. **Flagged issues** — with repro seeds and a genuine-vs-bot classification.
6. **Recommended fixes** — smallest change that moves the metric; let the human approve balance changes (they're design calls).

---

## 12. Appendix: applied results on Blocked

The framework's first two real runs, with the bugs it caught.

### Phase 2 — Jira Run (reflex runner)
Engine: `game/src/jirarun/{simulation.ts, rng.ts}` · Harness: `game/scripts/playtest/{autopilot.ts, run.ts}`

- **Bug found & fixed:** the level generator could place two full-width "jump-the-whole-screen" blocks in a gap too wide for one jump to clear yet too tight to land-and-re-jump — **provably impossible** (jump's above-clearance window 15.2u < the 17.3u gap). Fixed the generator so it never places two forced full-width rows back-to-back. Skilled-bot win rate **12% → ~99.6%**.
- **Scorecard (4,000 games + checkpoint test):** skilled win 99.4%, naive 0%, difficulty isolated to Sprint 4, greedy = 1.75× score at the same win rate, checkpoint-resume fair at every sprint (100/100/99.7/99.7%). No unavoidable-death (proven by invariant).

### Phase 1 — Standup (decision game)
Drives the real `game/src/state/gameStore.ts` + `content/dialogue.ts` · Harness: `game/scripts/playtest/{phase1.ts, phase1_recovery.ts}`

- **Two bugs found & fixed** — both *unreachable achievements* (the design promised them; the math forbade them):
  - *"Aligned but Hated"* — the calming +alignment choices also lowered anger, so the corridor was a near-miss. Re-tuned to be reachable.
  - *"Calendar Apocalypse"* — meeting-load maxed at **79** across all 122,880 possible plays; the trigger was **80**. Lowered the trigger to 75 (still needs ~4 of 5 stakeholders as meetings). Now reachable.
- **Scorecard (1,024 dialogue combos + 122,880 order×combo plays):** 81.3% of all strategies win, **12/12 achievements reachable**, all endings reachable, Gold rating reachable, and the "all-honest" path lands 8 minutes late by design (the intended satire). No dominant strategy.
