# How I Automatically Balance-Test Games Before Shipping

*A repeatable framework for proving a game is winnable, fair, and well-balanced — with evidence instead of vibes.*

**By Rebecca Leung**

Most playtesting is a human clicking around hoping to stumble on what's broken. That works for "does it boot," but it can't *prove* a game is fair — it can't tell you whether some random level is mathematically impossible, or whether an achievement you designed can actually be earned. So I built a method where **a robot plays the game thousands of times** and reports back with hard numbers. It's caught real, ship-blocking bugs in my own game that no amount of manual play would reliably surface.

This is that framework, written so anyone can apply it to their own game.

---

## Contents
1. What it answers
2. The core principle: one brain, two bodies
3. The 5-step framework
4. Adapting by genre
5. Fair vs. hard vs. fun
6. The metrics scorecard
7. Design frameworks to measure against
8. Live-game metrics (real players)
9. The quick checklist
10. Practical tooling notes
11. Case study: catching impossible content in a real game

---

## 1. What it answers

A bot that plays the game thousands of times can answer, with evidence:

- **Is it winnable?** With what strategy, and how reliably?
- **Is it fair?** Is there ever a situation with no possible escape?
- **Is the difficulty curve healthy?** Does it ramp smoothly, or is there a cliff?
- **Is all the content reachable?** Every ending, achievement, and reward?
- **Is the risk/reward balanced?** Does greedy play pay off without being a death trap?
- **Is there a dominant strategy** that makes every other choice pointless?

Then it **classifies each failure** (a real game bug vs. the bot just playing badly), **fixes only the real bugs**, and **re-verifies**. It complements manual testing — manual answers *"does it work,"* this answers *"is it good."*

## 2. The core principle: one brain, two bodies

**Single source of truth.** The game and the test must run the *exact same rules code*. If you reimplement the rules inside your test, the two slowly drift apart and your test ends up validating a fiction.

> Extract the game's rule logic into a headless module — no graphics, no UI. The real game imports it to draw the screen; the test harness imports it to run bots. **One brain, two bodies.**

If your rules already live in a clean module (a state store, an engine), reuse it directly. If they're tangled inside the rendering loop, **refactor first** — move the per-frame/per-turn logic into a standalone module the renderer calls — then confirm the live game still plays identically before you trust any test result.

## 3. The 5-step framework

**1. Find or extract the rules engine.** Locate where state changes happen (a game loop, a state store, a turn resolver) and pull the pure logic into a headless module exposing: current state, input methods, and a `step()` / `resolve()` that returns events. No rendering, no UI framework.

**2. Make it deterministic.** Replace random calls with a *seeded* random generator so any failure replays exactly. Also expose a way to replay a seed in the live game (e.g. a `?seed=N` URL) so a human can *watch* the exact bad run.

**3. Write autopilot "personalities."** Not one optimal bot — a spread:
- **Perfect / optimal** — plays correctly. If *this* bot loses, that level is a candidate for unfairness.
- **Greedy** — chases rewards even at risk. Measures risk/reward.
- **Reckless / handicapped** — refuses one mechanic (never slides, never blocks). Measures how punishing that mechanic is, and whether it's mandatory.
- **Naive / random** — barely plays. The floor: how fast does careless play fail?

**4. Run at scale and measure.**
- *Small, discrete choice space* (decision/dialogue games): **brute-force every combination** (and every order, if order matters). This *proves* reachability rather than sampling it.
- *Large or continuous space* (reflex games): **fuzz** hundreds to thousands of random seeds × personalities.
- Collect the metrics (scorecard below) into a printed report.

**5. Classify, fix, re-verify.** *Before fixing anything,* trace the failure and decide: is it *genuine unfairness* (no sequence of inputs survives) or the *bot misplaying*? In raw stats they look identical. Improve the bot until it's genuinely competent — only failures that survive a competent bot are real.
- Genuine bug → fix the **game**, re-run, confirm the metric actually moved.
- Bot bug → fix the **bot**, re-run.
- When you can, **prove fairness with math** (an invariant), not just "the bot won 99% of the time." For example: *the minimum gap between hazards is larger than the collision window, and no single row blocks all lanes, therefore no unavoidable death can exist.*

## 4. Adapting by genre

The method is constant; only the run-strategy and the metric emphasis change.

| Genre | Engine shape | Run strategy | Headline metrics |
|---|---|---|---|
| **Reflex / real-time** (runner, driver, fighter) | fixed time-step `step(dt)`; inputs like move/jump/duck | fuzz seeds × personalities; trace deaths | win rate, **death-cause × segment**, difficulty-by-level, fairness invariant |
| **Decision / turn-based** (dialogue, strategy, cards) | apply-choice over a state store | **brute-force all combos × all orders** | winnability, ending distribution, **content reachability**, dominant-strategy check, resource/deadline fairness |
| **Hybrid** (move + decide) | drive the decision logic; **model navigation** (positions × speed) for time/resource cost | brute-force decisions, model location reachability | all decision metrics + whether the time/resource budget is beatable once movement counts |
| **Economy / progression** | resource update function | simulate long sessions; many seeds | inflation/sink balance, reward cadence, grind time, pay-to-win gap |

**In short:** reflex → *fuzz + trace*; decision → *brute-force + reachability*.

## 5. Fair vs. hard vs. fun (measure them separately)

Three different properties, three different tests. Conflating them is the single most common balance mistake.

- **Fair** = solvable; every loss is the player's fault. → *Provable by bots/math.*
- **Hard** = demands skill. → *Measurable by bots (the gap between naive and optimal play).*
- **Fun** = people enjoy it and come back. → *Not bot-measurable — needs real humans and real telemetry.*

The harness certifies the first two; the third you hand to a human along with the data and clean screenshots. A game can be fair-but-boring, fun-but-broken, or hard-but-unfair. The goal is fair **and** appropriately hard **and** fun.

## 6. The metrics scorecard (what "good" looks like)

Targets are starting points — adjust for your audience (casual vs. hardcore) and intent (a satire game might *want* a "doing it right still makes you late" tax).

- **Skilled win rate** — a competent bot completes the game. Target ~95–100% for a *fair* game. Below that only if every loss is a provably survivable skill check.
- **Naive/floor failure** — careless play should fail fast, proving the stakes are real (~0% naive win is healthy).
- **Difficulty curve** — failures by segment for the skilled bot: roughly zero early, rising gently. A spike means a difficulty cliff to smooth.
- **Skill expression** — the distance between naive and optimal outcomes. Wide = the game rewards mastery; near-zero = choices don't matter.
- **Content reachability** — the share of endings/achievements/secrets a bot can actually obtain. Must be **100%** — an unobtainable achievement is a bug.
- **Risk/reward** — greedy play should score meaningfully higher *without* a much lower win rate. Greed that wins less *and* scores less is a trap; greed that wins the same *and* scores far more is a free choice (no real decision).
- **Dominant strategy check** — is one path always best? If so, the rest is dead content.
- **No unavoidable failure** — the hard fairness floor, ideally proven by an invariant.
- **Pacing** — flag runs that are too short (trivial) or too long (a slog).

## 7. Design frameworks to measure against

- **Flow theory (Csikszentmihalyi)** — the channel between boredom (challenge below skill) and anxiety (challenge above skill). Keep challenge rising just behind the player's growing skill. The difficulty-curve metric *is* a flow check: a spike is an anxiety cliff; a long easy stretch is boredom. The primary lens for tuning difficulty.
- **MDA (Mechanics → Dynamics → Aesthetics)** — rules → emergent behavior → felt experience. Bots rigorously test Mechanics and Dynamics; Aesthetics (the feeling, whether the joke lands) is a human's call. Designers build M→D→A; players experience A→D→M.
- **Fairness vs. difficulty (Sirlin, *Playing to Win*)** — "hard" (high skill required, good) and "unfair" (outcome not determined by skill, bad) are opposites of *different* things. This is exactly the classify-the-failure step: keep hard-but-survivable, fix the impossible.
- **Bartle player types** — Achiever / Explorer / Socializer / Killer. Use them to deliberately design variety (e.g. achievements serve Achievers and Explorers). Guides what content to add.

## 8. Live-game metrics (need real players, not bots)

Bots can't measure these — they require shipping plus telemetry. The benchmarks below are mobile/free-to-play-skewed and vary hugely by genre, so treat them as ballpark. For a portfolio or showcase game, prioritize a tight, complete, fair, finishable experience (what the harness certifies) over these.

| Metric | Meaning | Rough "decent" |
|---|---|---|
| D1 / D7 / D30 retention | players returning after 1 / 7 / 30 days | ~30–40% / ~10–15% / ~5% |
| FTUE / tutorial completion | players who finish onboarding | aim >80% (the biggest early drop-off) |
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

- **Run the engine headlessly** with a TypeScript runner (e.g. `tsx`) — no full build needed to play thousands of games.
- **Stub timers in big batches** so per-run cleanup timers don't pile up across 100k+ runs.
- **Drive a state store directly** (read state, call actions, reset between runs) — no UI framework required to exercise the rules.
- **Replay a flagged seed live** by exposing the engine in dev builds and accepting a `?seed=N` URL, so a human can watch the exact bad run.
- **Headless-browser caveat:** a backgrounded browser tab pauses the animation loop, freezing rendering — don't judge "it's broken" from a frozen screenshot. Verify via the harness plus a clean build.
- **Always confirm parity after a refactor:** build clean and spot-check that the live game still plays identically before trusting any test numbers.

---

## 11. Case study: catching impossible content in a real game

I built this while making *Blocked*, a corporate-satire game with two very different modes — a reflex endless-runner and a decision/dialogue game. The framework caught ship-blocking bugs in both that manual testing had missed.

### The reflex runner
The level generator could place two full-width "jump-the-whole-screen" obstacles in a gap that was too wide for a single jump to clear, yet too tight to land and jump again — **provably impossible**. I proved it with the jump arc math (the time you spend above clearance height covers less distance than the gap between the obstacles), then fixed the generator so it never places two forced full-width obstacles back-to-back.

- **Result:** skilled-bot win rate went from **12% → ~99.6%**.
- **Verified across 4,000 automated games:** naive play fails fast, difficulty is cleanly isolated to the final (fastest) level, greedy play scores ~1.75× at the same win rate, and the checkpoint-resume is fair at every level. No unavoidable death — proven by an invariant.

### The decision game
The bot brute-forced **every one of the 122,880 possible playthroughs** (every choice combination × every order of stakeholders) and found **two achievements the design promised but the math forbade**:

- One required a meter to reach a threshold that *no possible run* could hit — it peaked one point short, every single time, because the choices that raised it also burned the clock and triggered the deadline first.
- Another sat in a corridor that was a near-miss because the "good" choices quietly worked against the win condition.

Both were re-tuned to be reachable, then re-verified. Final scorecard: **81% of all strategies win, 12/12 achievements reachable, every ending reachable**, no dominant strategy — and the "play it perfectly honest" path still lands you eight minutes late, which is the intended joke.

The lesson: an unobtainable achievement or an impossible level is a *bug*, and it's exactly the kind of bug humans almost never find by hand — but a bot finds it on run number 40,000 without complaint.

---

*Framework and case study by Rebecca Leung. Free to share and adapt.*
