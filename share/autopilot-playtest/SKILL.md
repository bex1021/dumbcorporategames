---
name: autopilot-playtest
description: Automatically balance-test a game by building a headless autopilot harness — extract the game's real rules into a logic engine, drive it with bot "personalities", run thousands of plays (brute-force or fuzz), measure metrics (win rate, difficulty curve, content/achievement reachability, risk-reward, fairness), classify every failure as genuine-unfairness vs bot-mistake before fixing, then re-verify. Use when the user wants to play-test, balance, or QA a game's difficulty/fairness — e.g. "play-test this game", "is it winnable / fair / too hard", "find impossible levels", "tune difficulty", "can you beat it", "are all achievements reachable". Genre-agnostic: reflex runners, decision/dialogue games, drivers, fighters, economy/progression games. This is automated balance analysis, distinct from a manual "does it boot / does it work" smoke test.
---

# autopilot-playtest

Build a **robot that plays the game thousands of times** so you can answer, with evidence instead of vibes:

- Is it **winnable**? With what strategy, and how reliably?
- Is it **fair** — is there ever a situation with no possible escape?
- Is the **difficulty curve** healthy (ramps smoothly, no cliffs)?
- Is all the **content reachable** (every ending, achievement, reward)?
- Is the **risk/reward** balanced (does greedy play pay off without being a death trap)?
- Is there a **dominant strategy** that makes every other choice pointless?

Then **classify each failure** (real game bug vs. the bot just playing badly), **fix only the real bugs**, and **re-verify**. This complements manual testing: manual answers "does it work", this answers "is it good". It cannot judge *fun* — that needs real humans.

## The core principle (do not skip this)

**Single source of truth.** The game and the test must run the *exact same rules code*. If you reimplement the rules in the test, the two drift and the test validates a fiction.

> Extract the game's rule logic into a headless module (no rendering, no UI). The real game imports it to draw the screen; the harness imports it to run bots. **One brain, two bodies.**

If the rules already live in a clean module (a state store, an engine), reuse it directly. If they're tangled inside the rendering loop, **refactor first** — move the per-frame/per-turn logic into a standalone module the renderer calls — then verify the live game still plays identically before trusting any result.

## The 5-step framework

**1. Find or extract the rules engine.** Locate where state changes happen (a game loop, a state store, a turn resolver). Pull the pure logic into a headless module exposing: current state, input methods, and a `step()`/`resolve()` that returns events. No window, no graphics lib, no UI framework.

**2. Make it deterministic.** Replace the random source with a *seeded* RNG so any failure replays exactly. Pass the seed in. Also expose a way to replay a seed in the *live* game so a human can watch the exact bad run (e.g. a `?seed=N` URL).

**3. Write autopilot "personalities."** Not one optimal bot — a spread:
- **perfect / optimal** — plays correctly. If *this* bot loses, the seed is a candidate for unfairness.
- **greedy** — chases rewards/score even at risk. Measures risk/reward.
- **reckless / handicapped** — refuses one mechanic (never slides, never blocks). Measures how punishing that mechanic is, and whether it's mandatory.
- **naive / random** — barely plays. The floor: how fast does careless play fail?

**4. Run at scale + measure.**
- *Small/discrete choice space* (decision games): **brute-force EVERY combination** (and every order if order matters). This *proves* reachability, not samples it.
- *Large/continuous space* (reflex games): **fuzz** hundreds–thousands of seeds × personalities. Add adversarial / loop-until-dry passes for thoroughness.
- Collect the metrics (scorecard below) into a printed report.

**5. Classify, fix, re-verify.** *Before fixing anything*, trace the failure: is it *genuine unfairness* (no input sequence survives) or the *bot mistiming/misplaying*? They look identical in raw stats. Improve the bot until it's competent; only failures that survive a competent bot are real.
- Genuine bug → fix the **game** (generator/tuning), re-run, confirm the metric moves.
- Bot bug → fix the **bot**, re-run.
- When possible, **prove fairness with math** (an invariant), not just "the bot won 99%". Example: *min gap between hazards (12u) > collision window (1.4u) AND no row blocks all lanes ⇒ no unavoidable death.*

## Adapt the approach by genre

The method is constant; only the run-strategy and metric emphasis change.

| Genre | Engine shape | Run strategy | Headline metrics |
|---|---|---|---|
| **Reflex / real-time** (runner, driver, fighter) | fixed time-step `step(dt)`; inputs like move/jump/duck | fuzz seeds × personalities; trace deaths | win rate, **death-cause × segment**, difficulty-by-level, fairness invariant |
| **Decision / turn-based** (dialogue, strategy, cards) | apply-choice over a state store | **brute-force all combos × all orders** | winnability, ending distribution, **content reachability**, dominant-strategy check, resource/deadline fairness |
| **Hybrid** (move + decide) | drive the decision logic; **model navigation** (positions × move-speed) for time/resource cost | brute-force decisions, model location reachability | all decision metrics + whether the time/resource budget is beatable once movement counts |
| **Economy / progression** | resource update function | simulate long sessions; many seeds | inflation/sink balance, reward cadence, grind time, pay-to-win gap |

**In short:** reflex → *fuzz + trace*; decision → *brute-force + reachability*.

## Mental model: fair vs hard vs fun (measure them separately)

Three different properties, three different tests. Conflating them is the #1 balance mistake.

- **Fair** = solvable; every loss is the player's fault. → *Provable by bots/math.*
- **Hard** = demands skill. → *Measurable by bots (the gap between naive and optimal play).*
- **Fun** = people enjoy it and come back. → *NOT bot-measurable — needs humans + real telemetry.*

The harness certifies the first two; hand the third back to the user with data + clean screenshots. A game can be fair-but-boring, fun-but-broken, or hard-but-unfair. Aim for fair AND appropriately hard AND fun.

## Metrics scorecard (what "good" looks like)

Targets are starting points — adjust for audience (casual vs hardcore) and intent (a satire/art game may *want* a deliberate "you can't fully win" tax).

- **Skilled win rate** — competent bot completes the game. Target ~95–100% for a *fair* game. Below that only if every loss is a provably-survivable skill check.
- **Naive/floor failure** — careless play should fail fast (~0% naive win is healthy; proves stakes are real).
- **Difficulty curve** — failures by segment for the skilled bot: ~0 early, rising gently. A spike = a difficulty cliff to smooth.
- **Skill expression** — distance between naive and optimal outcomes. Wide = rewards mastery; near-zero = choices don't matter.
- **Content reachability** — share of endings/achievements/secrets a bot can obtain. Must be **100%** — an unobtainable achievement is a bug.
- **Risk/reward** — greedy should score meaningfully higher *without* a much lower win rate. Greed that wins less AND scores less = a trap; greed that wins the same AND scores far more = a free choice (no real decision).
- **Dominant strategy check** — is one path always best? If so, the rest is dead content.
- **No unavoidable failure** — the hard fairness floor; ideally proven by an invariant.
- **Pacing** — flag runs that are too short (trivial) or too long (a slog).

## Design frameworks to measure against

- **Flow theory (Csikszentmihalyi)** — the channel between boredom (challenge < skill) and anxiety (challenge > skill). Keep challenge rising just behind the player's skill. The difficulty-curve metric IS a flow check: a spike = anxiety cliff; a flat-easy stretch = boredom. Primary lens for difficulty tuning.
- **MDA (Mechanics → Dynamics → Aesthetics)** — rules → emergent behavior → felt experience. Bots test Mechanics + Dynamics; Aesthetics (the feeling, whether the joke lands) is the human's call. Designers build M→D→A; players feel A→D→M.
- **Fairness vs difficulty (Sirlin, "Playing to Win")** — "hard" (high skill required = good) and "unfair" (outcome not skill-determined = bad) are opposites of *different* things. This is the classify-the-failure step: keep hard-but-survivable, fix the impossible.
- **Bartle player types** — Achiever / Explorer / Socializer / Killer. Use to deliberately design variety (e.g. achievements serve Achievers + Explorers). Guides what content to add.

## Live-game metrics (need REAL players, not bots)

Bots can't measure these — they require shipping + telemetry. Benchmarks are mobile/free-to-play-skewed and vary hugely by genre; treat as ballpark, and for a portfolio/showcase game prioritize a tight, complete, fair, finishable experience (what the harness certifies) over these.

| Metric | Meaning | Rough "decent" |
|---|---|---|
| D1 / D7 / D30 retention | return after 1 / 7 / 30 days | ~30–40% / ~10–15% / ~5% |
| FTUE / tutorial completion | finish onboarding | aim >80% (biggest early drop-off) |
| Funnel / drop-off | where players quit | find the cliff, fix it |
| Session length & frequency | how long / how often | genre-dependent; watch the trend |
| Stickiness (DAU/MAU) | daily ÷ monthly active users | ~20% decent, ~50%+ great |

## Quick scorecard checklist (run before calling any game "done")

- [ ] Skilled bot win rate ≥ ~95% (and every loss provably survivable)
- [ ] Clueless/naive bot fails fast (the stakes are real)
- [ ] Difficulty failures rise *gently* by segment — no cliff
- [ ] **100%** of endings / achievements / secrets reachable (bot-proven)
- [ ] Greedy/risky play is a fair gamble, not a trap
- [ ] No single dominant strategy
- [ ] No unavoidable-loss situation (ideally proven by an invariant)
- [ ] Run length sits in a sensible band
- [ ] *(human, not bot)* It feels good — pacing, juice, the joke lands

## Practical tooling notes

These assume a JavaScript/TypeScript web game; adapt the specifics to your stack, but the principles hold.

- **Run the engine headlessly** with a TS runner (e.g. `npx tsx scripts/playtest/<file>.ts`) — no full build needed to play thousands of games. Run from the package dir (a stray `cd` can break relative imports).
- **Stub timers in big batches** (`globalThis.setTimeout = () => 0`) before importing the rules module so per-run cleanup timers don't pile up across 100k+ runs.
- **Drive a state store directly** — read state, call actions, `reset()` between runs. No UI framework needed to exercise the rules.
- **Replay a flagged seed live** by exposing the engine on a dev-only global and accepting a `?seed=N` URL, so a human can watch the exact bad run.
- **Headless-browser caveat:** a backgrounded tab pauses the animation loop, freezing rendering — don't judge "it's broken" from a frozen live screenshot. Verify via the harness + a clean build.
- **Always confirm parity after a refactor:** build clean and spot-check the live game still plays identically before trusting test numbers.

## Output: the report

Print a scannable report, not a wall of logs:
1. **Personality table** — each bot: outcome, key meters/score, achievements.
2. **Brute-force / fuzz summary** — win rate, outcome distribution, rating distribution.
3. **Reachability matrix** — every ending/achievement ✅/❌ (flag any ❌ as a bug).
4. **Difficulty curve** — failures by segment for the skilled bot.
5. **Flagged issues** — with repro seeds and a genuine-vs-bot classification.
6. **Recommended fixes** — the smallest change that moves the metric; let the user approve balance changes (they're design calls).

## Illustrative results (from the game this was developed on)

A two-mode game (a reflex endless-runner + a decision/dialogue game) where the framework caught ship-blocking bugs manual play had missed:

- **Reflex mode:** the level generator could place two full-width forced-jump obstacles in a gap too wide for one jump yet too tight to land and re-jump — *provably impossible* (the above-clearance window was shorter than the gap). Fixed the generator; skilled-bot win rate went **12% → ~99.6%**.
- **Decision mode:** brute-forcing all **122,880** possible playthroughs (every choice × every order) found **two achievements the design promised but the math forbade** — one needed a meter to hit 80 but it peaked at 79 in *every* possible run. Re-tuned both to be reachable; final state: 81% of all strategies win, 100% of achievements reachable, no dominant strategy.

The lesson: an unobtainable achievement or an impossible level is a *bug* — and exactly the kind a human almost never finds by hand but a bot finds on run 40,000 without complaint.

## When NOT to use this
- "Does it boot / does the build pass?" → that's a manual smoke test or a build check.
- A purely cosmetic/UX change with no rule impact.
- The user wants *feel/fun* judged — bots can't judge fun, only fairness/balance/reachability. Say so and hand back data + clean screenshots for the human call.
