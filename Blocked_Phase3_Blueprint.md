# Blocked — Phase 3 Blueprint: Lunch Dash

> Companion to `Blocked_Game_Blueprint.md`. This doc covers the Phase 3
> vertical slice only. Phase 1 (Pre-Standup Alignment) is shipped;
> Phase 2 (Jira Run) is in development; Phase 4 (Executive Review) is
> teased here but not designed yet.
>
> **Status:** Design locked from 2026-06-02 brainstorm. Ready for content + build.

## One-line pitch

**Lunch Dash** is a 10–15 minute GTA-style driving phase disguised as
a corporate lunch break. You have 60 in-game minutes to pick up your
lunch, pick up the exec's salmon bowl from Corporate Slop Bowlz, and
make it back to your desk for the noon Architecture Sync — while a
faceless beige city does its best to eat your hour.

## Core promise

> "Phase 1 was the desk. Phase 2 was the ticket queue. Phase 3 is the
> first time all day you're alone, in a car, with a clock — and the
> corporate world is still pinging you."

If Phase 2 was the heads-down crunch of Jira Run, Phase 3 is the
**release valve that gets co-opted**. The fantasy is *I'm escaping to
my car for ten minutes of peace.* The reality is *the salmon bowl is
judging your driving and Diane is watching the corporate fleet GPS.*

## The four-phase frame

| | Time | Setting | Core verb | Length |
|---|---|---|---|---|
| Phase 1 ✓ shipped | 9:00–10:15 AM | Free-roam office | Walk + extract alignment | ~10 min |
| Phase 2 ✓ in dev | 10:15–11:00 AM | Leonard's desktop + 8-bit Jira | Run + route tickets | ~5–10 min |
| **Phase 3** | **11:00 AM–12:00 PM** | **Sprawl + downtown, third-person driving** | **Drive + errand-triage** | **~10–15 min** |
| Phase 4 (future) | 4:30–5:00 PM | Boardroom | Survive the Exec | TBD |

The four-phase day plays in roughly the length of a real workday's
*meaningful* moments. The unmodeled afternoon (12 PM–4:30 PM) is the
implied corporate void between lunch and the Exec Review.

## Player fantasy

The player is not here to enjoy driving. The player is here to **manage
their one free hour against the corporate world's encroachment**.
Every decision — what to eat, what route to take, whether to run a
red, whether to floor it through the parade crowd — is a decision
about whether to prioritize themselves or the company.

Player thought pattern:

> Phase 3: "I have 32 in-game minutes left. The bowl is wobbling, there's
> a slow Camry boxing me in, and a parade's walling off 5th. Do I wait
> behind this guy and lose time, or swing around him and risk a tight
> corner that tips the bowl into a 15-minute courier wait?"

The fun is in the **situational comedy**, not the driving simulation.
The world is the antagonist. The car is the player's only safe space.

## Phase 3 acceptance criteria

Phase 3 is playable when:

- The player can leave Alignly HQ, enter the car, complete the required
  lunch stops, and return to the office in one uninterrupted run.
- A first-time player can finish a run without verbal coaching beyond
  on-screen prompts.
- Bowl state transitions are readable and feel fair — players can tell
  *why* they moved from Stable → Wobbling → Critical → Spilled.
- At least one route hazard meaningfully changes pathing during a run.
- Moving traffic creates at least one real "wait vs. swing around it"
  decision per run, and clipping a car feels fair (bouncy, not sticky).
- At least one pedestrian-collision consequence chain works end-to-end.
- The retrospective screen correctly reflects the actual run outcome.
- The average first completion feels tense and funny, not confusing or
  punitive.

## Moment-to-moment loop (golden path)

The intended first clean run is:

1. Exit Alignly HQ and enter the beige Camry.
2. Drive downtown to **Corporate Slop Bowlz**.
3. Pull into the pickup zone and trigger a quick pickup cutaway.
4. Bowl loads into the passenger seat; bowl tutorial prompt appears.
5. Player chooses: your lunch now, optional errand now, or return route.
6. Traffic and a route hazard force live "thread-or-wait" and reroute
   decisions along the way.
7. Player completes their lunch pickup.
8. Player returns to Alignly HQ with the bowl intact.
9. Parking / return handoff resolves the run.
10. Retrospective screen writes the Phase 3 receipt for Phase 4.

## Continuity from Phase 2 (hard continuation)

Phase 3 is **gated on a Phase 2 win.** The "Start Phase 3" button is
locked until Phase 2 ends with a successful outcome.

A new state slice `phase2Final` is written when Phase 2 ends and read
by Phase 3 on mount:

```ts
type Phase2Final = {
  // Meters at end of run (carried forward, paused during Phase 3)
  projectStatus: number
  pissedOff: number
  meetingLoad: number
  alignment: number
  timeMinutes: number  // resumes ticking from here (165 → 225 = 12:00)

  // Jira Run performance — feeds into Phase 4 receipts
  ticketsCompleted: number
  ticketsBotched: number
  kanbanGatesCleared: number

  // Run-scoped flags
  runJiraRetrospectiveViewed: boolean
}
```

If `phase2Final` is missing when Phase 3 loads, redirect to landing.

The carried meters (alignment, projectStatus, pissedOff, meetingLoad)
**freeze during Phase 3** — they appear dimmed on the HUD as
read-only state. They don't update because the player isn't
interacting with humans. They resume in Phase 4.

---

# CORE DESIGN

## Core verb: **DRIVE + TRIAGE**

In Phase 1 the verb was *walk and talk*. In Phase 2 it was *run and
route*. In Phase 3 it's **drive and triage** — you're piloting a car
through a hostile world AND making moment-to-moment decisions about
which corporate intrusions to engage with.

The driving itself is **arcade-loose with weight** (see Driving Feel
below) — easy enough to forget you're driving when the situational
comedy needs your attention.

## The HUD + route readability

At all times the player sees:

```
┌─────────────────────────────────────────────────────────────┐
│  TIME: 11:23 / 12:00              📻 94.1 The Loft           │
│  ┌─────────────────────────────┐                             │
│  │ ☐ Pick up your lunch         │       🥗 Bowl: Stable      │
│  │ ☑ Pick up exec's salmon bowl │                            │
│  │ ☐ Drop Amazon returns (+)    │       💬 3                 │
│  │ ☐ Return to office           │                            │
│  └─────────────────────────────┘                             │
│                                                             │
│         [paused P1+P2 meters, dimmed:                        │
│            proj 68 · piss 42 · align 6 · meet 35 ]          │
└─────────────────────────────────────────────────────────────┘
```

**Three live HUD elements:**

- **Time** — counts down to 12:00 PM. Ticks visibly (5:1 compression
  — 1 in-game min = 12 real seconds).
- **Tasks** — checklist of stops (required ☐ + bonus (+) ☐). Items
  check off in real time as you complete them.
- **Bowl Status** — 4-state icon: 🟢 Stable / 🟡 Wobbling / 🟠 Critical /
  🔴 Spilled. The game's defining feedback loop.

**Optional 4th element: Slack badge** — small notification count in
the corner showing unread pings. For MVP this is **mostly flavor with
light tactical value**: most pings are atmospheric, but 1–2 can warn
about a route hazard or rising HR fallout.

## Navigation rules

Route-planning is only fun if the player can actually read the city.
MVP navigation support should be:

- **Minimap: yes** — bottom-left, compact, readable at a glance.
- **Active objective marker: yes** — current required destination shown
  both on minimap and as an off-screen world indicator.
- **Route line: soft yes** — a faint GPS path to the active destination.
  It can be wrong *only* in post-MVP surreal variants.
- **Rally pacenotes (REQUIRED):** the minimap is not just a dot-tracker
  — it must **telegraph sharp turns before the player reaches them**,
  the way a rally co-driver calls the next corner. As a hard turn
  approaches, the minimap flashes a directional chevron + a "sharp left
  ahead" pip a beat early. This is what lets a player drive *fast* and
  still protect the bowl — they can pre-brake for a corner they were
  warned about instead of discovering it mid-slide. Without pacenotes,
  arcade speed + a fragile bowl reads as unfair.
- **Hazard visibility:** because V1 hazards are **hardcoded into the
  map** (see Hazards & Events), every hazard can show on the minimap
  from the start. No fog-of-war discovery needed for MVP.
- **Pause map:** optional for MVP. If omitted, the minimap + objective
  marker + pacenotes must be sufficient for a first-time run.

## Slack model for MVP

- Slack remains a **single-button optional glance**, not a second game.
- Opening Slack does not pause the run.
- Most Slack messages are flavor and future receipts.
- A small minority deliver useful signal ("avoid 5th," "Diane is
  already watching," etc.) so the badge matters a little.

**Why no other meters:** The Phase 1/2 meters are **paused** (visible,
dimmed). The phase's own state is just: time, tasks, bowl. The
corporate surveillance and HR escalation are **invisible state** that
surfaces in Phase 4 — the joke is that you can't see how much trouble
you're in until you're back at your desk.

---

## THE NEW MECHANIC: **THE SALMON BOWL**

This is the load-bearing mechanic. The exec's Corporate Slop Bowlz
salmon bowl sits in the passenger seat from the moment you pick it up
until you return to the office. **Every corner is a decision.**

The bowl has four states displayed as a HUD icon next to the clock:

| State | Color | What happened | What happens next |
|---|---|---|---|
| 🟢 **Stable** | green | Driving sanely | Free state. No risk. |
| 🟡 **Wobbling** | yellow | Took one sharp corner | One more like that and it tips |
| 🟠 **Critical** | orange | Visible salmon sliding around | Any hard input will spill it |
| 🔴 **Spilled** | red | Green dressing on the passenger seat | Call it in — courier meets you halfway (15-min lock) |

**Spill triggers:**
- Hard turn above speed threshold (e.g. >40 mph + steering angle >30°)
- Hitting a curb at speed
- Hitting a pedestrian (the impact jostles the bowl — extra punishment for reckless driving)
- Slamming brakes from high speed

**Wobbling decays back to Stable** if you drive sanely for ~5 real
seconds. Critical does NOT decay — once you're critical, you're one
input from a spill until you reach the destination.

**Spill consequence — "Call It In" (the zombie-run fix):**

Driving all the way back to Corporate Slop Bowlz can make a late-run
spill **mathematically unwinnable** — the player keeps piloting a run
they've already lost, a "zombie run" with no way to know it's dead. So
a spill never sends you back across the map. Instead:

- **You Call It In via Slack.** A toast fires: *"CSB Courier dispatched.
  Sit tight."*
- **The car locks in place for 15 in-game minutes** (3 real minutes at
  5:1) while a Corporate Slop Bowlz courier — a beige blob on an e-bike
  — rides out to meet you **halfway** and hands a fresh bowl through the
  window.
- This is a **fixed, predictable time tax** the player can budget
  against from anywhere on the map. No reroute, no zombie run.
- **Repeat spills cost the same 15 minutes each.** Spilling twice is a
  self-inflicted 30-minute hole — brutal, but always *survivable math*,
  never a silent dead run.

**Tuning principle:** the bowl must feel scary but fair. A spill should
sting and probably cost you the Composed tier — but the player should
always be able to *see* whether they can still make 12:00, not discover
20 minutes later that they couldn't.

The bowl becomes the second-person passenger judging your driving.
Players will internalize the speed limit by their second run.

**Visual + audio reinforcement:** The bowl is **visible in the passenger
seat** in third-person view. As state degrades:
- Stable: bowl sits flat, lid on
- Wobbling: bowl slides slightly side-to-side on corners
- Critical: lid loose, salmon visibly piled on one side
- Spilled: lid open, green goop across passenger seat, salmon on floor mat

**The bowl wobble is hard-tied to tire-screech audio.** The instant the
car corners hard enough to push the bowl toward Wobbling, the tires
audibly chirp/screech. The screech IS the physics-limit warning — the
player learns to drive "just under the screech." This couples the
abstract bowl meter to a visceral sound they already understand from
every driving game, so they *feel* the limit instead of reading it.

---

## THE NEW LEGIBLE-STATE MECHANIC: **DAMAGE TIER**

The car visibly accumulates damage from pedestrian impacts, curb
scrapes, and head-on hits. Damage is **cosmetic only in MVP** — the car
remains fully driveable at all times. There is no engine-failure,
vehicle abandonment, or handling-degradation mechanic in the ship-first
slice. The damage IS the feedback.

| Tier | Hits | Visible state |
|---|---|---|
| **Pristine** | 0 | Showroom clean |
| **Scuffed** | 1–2 | Paint scratches, hairline dents on bumper |
| **Dinged** | 3–5 | Visible dents, bumper hanging crooked |
| **Wrecked** | 6+ | Cracked windshield, missing bumper, hood ajar, fender flapping |

**Damage resets per run.** Persistent cross-run damage is a great
post-MVP feature but out of scope for v1.

**Visual continuity:** the car's damage state **carries into the
office parking lot scene** for the rest of that playthrough. If you
park a Wrecked car, the next time the player sees the lot (Phase 4
intro, future phases), the wreck is there. Subtle continuity = big
satisfaction.

---

## THE NEW RESOURCE: **TIME**

60 in-game minutes. Compressed 5:1 to ~12 real minutes. The clock is
the universal currency — every penalty, every event, every choice
eats time.

**Real-time budget for a clean run:**

| Activity | Real time |
|---|---|
| Drive to Corporate Slop Bowlz (downtown) | ~2 min |
| Pickup beat (quick UI cutaway, not full animation) | ~20 sec |
| Drive to your lunch spot | ~1–2 min |
| Drive back to office | ~2–3 min |
| Buffer for events (parade, construction, penalties) | ~3–4 min |
| **Core run total** | **~8 min** |
| Optional errand (ShipMart *or* dry cleaning) | +1–2 min |

That puts the typical run at 10–15 min real time. The optional errand
still eats into the slack — it's a real trade-off, not a freebie.

---

# THE MAP

Phase 3 is a **two-zone open world**. Geography forces the routing
decision.

## Graybox topology (ship-first)

This does **not** need to be a full city. It needs to feel like a city
while functioning as a readable route problem.

MVP map target:

- **Spawn:** Alignly HQ underground lot in the sprawl.
- **Main artery:** one fast road from sprawl to downtown, partially
  **clogged by a hardcoded construction zone** (static — see below).
- **Bypass:** one slower side-street route that avoids the worst hazard.
- **Downtown core:** a compact 3×3-ish block grid, not a real city map.
- **Required downtown stop:** Corporate Slop Bowlz on one edge of the grid.
- **Player lunch stops:** one in the sprawl, one downtown.
- **One core errand:** exactly one errand stop — ShipMart returns *or*
  the dry cleaner — is a **built MVP feature, not a stretch item.** The
  player can still skip it for time (it's optional to *complete*), but
  it's most of what makes routing a real decision: detour for the
  Pissed-Off discount, or stay lean and fast? A *second* errand is a
  post-MVP add.

**Two kinds of traffic — on-rails moving cars (in), AI traffic (out).**
The world has both static obstructions *and* moving cars, but **none of
it is AI:**
- **Static obstructions** (hand-placed, never moving): stationary lines
  of parked cars acting as soft "cones," a parked delivery truck
  blocking a lane, the construction zone (barriers + stopped work
  vehicle + closed lane).
- **On-rails moving traffic** (the reactive layer — see Traffic): dumb
  cars looping fixed lane paths at constant speed. They move and you
  thread through them, but they do **not** pathfind, negotiate, or react
  to each other. They interact only with *you*.

What stays cut is **AI traffic** — pathfinding, traffic lights,
inter-car avoidance, lane-changing logic. That's the simulation we're
not building. On-rails cars give the road life without it.

Parking should be simplified: the player enters a pickup zone / curb
zone, not a precision parallel-parking sim.

## Zone 1: The Office Park Sprawl

**Feel:** Beige strip malls, drive-thrus, sad parking lots, wide
roads, too many traffic lights. The office is here. The dry cleaner is
here. One of two ShipMart locations is here.

| Property | Value |
|---|---|
| Speed | Fast (wide roads, few peds) |
| Pedestrian density | Sparse |
| Hazard rate | Low |
| Vibe | Suburban purgatory |

**Locations in the sprawl:**
- 🏢 **Alignly HQ** — the office. Start and end point. Underground parking lot.
- 🚗 **Your lunch spot (option A)** — a generic drive-thru. A pure
  time-sink interaction (*"Wait in Drive-Thru: 3 in-game minutes"*). No
  bag to protect, no seat used — see the asymmetry note below.
- 👔 **Suds & Fold** — small strip-mall dry cleaner. Has a hand-painted sign.
- 📦 **ShipMart (sprawl location)** — sad strip-mall shipping hub.
- ⛽ **Generic Gas** — a gas station you'll never need but it's there.

## Zone 2: Downtown

**Feel:** Denser, slower, one-way streets, lunch crowds, scooters
that come out of nowhere, parking is hell.

| Property | Value |
|---|---|
| Speed | Slow (lights, peds, narrow lanes) |
| Pedestrian density | High |
| Hazard rate | High |
| Vibe | Aspirational coastal city |

**Locations downtown:**
- 🥗 **Corporate Slop Bowlz** — *we feed the masses.* The exec's order.
  Required stop. Downtown only.
- 🍽️ **Your lunch spot (option B)** — a counter-service place. A slower
  time-sink than the drive-thru (*"Wait for your order: 5 in-game
  minutes"*), but it lets you bundle lunch with the downtown bowl
  pickup. Still no physical bag to protect.
- 📦 **ShipMart (downtown location)** — slightly nicer than the sprawl
  branch but worse parking.

## The route problem

You can't skip downtown — the salmon bowl is only there. You can't
skip the sprawl — the office is there. Every run is a route-planning
problem.

**Possible routes (player's strategic surface):**
- **Sprawl-only is impossible** (no Corporate Slop Bowlz)
- **Downtown-only is fast but means downtown lunch** (your spot B, slower pickup)
- **Mixed route** is the default — pickup downtown, eat in sprawl
- **Errand detour** — bend the route to hit the one core errand
  (ShipMart *or* the dry cleaner) for the Pissed-Off discount, trading
  minutes for mood. This is the central "is the detour worth it?" call.
- *(Post-MVP: a second errand opens multi-stop "errand-stacking" routes
  — e.g. Corporate Slop Bowlz + ShipMart + lunch in one downtown sweep.)*

The "best" route depends on the **hardcoded hazards** (see Hazards &
Events) and which optional errand, if any, you attempt.

## Your lunch vs. the company's lunch (the asymmetry)

A deliberate thematic contrast runs through the whole phase, rendered
in mechanics rather than dialogue:

- **The company's lunch (the salmon bowl)** is a *physical object*. It
  rides shotgun, it has physics, it judges your every corner, and it
  can be destroyed. The company's order demands perfection.
- **Your lunch** is *not* an object. It occupies no seat, has no
  physics, and cannot spill. Picking it up is a pure time-sink
  interaction — you pull into the drive-thru, a meter counts down
  (*"Wait in Drive-Thru: 3 in-game minutes"*), and you drive off with
  an implied paper bag tossed on the back seat that the game never
  thinks about again.

That gap is the joke: **the company's lunch is a fragile responsibility
you white-knuckle across town; yours is an afterthought you barely
register.** The player feels the difference in how much attention each
one demands. No line of dialogue required.

---

# PEDESTRIANS — THE NO-DEATH SYSTEM

The world is populated by **generic faceless beige business-casual
blobs**. The visual joke: even outside the office, the world is full
of more office workers. There is no "outside" — only more inside.

## Pedestrian design

- **Faceless** — smooth oval where the face should be. No eyes, no
  mouth, no detail above the shoulders.
- **Beige business casual** — khakis, untucked button-down, lanyard.
  Same palette as the office NPCs.
- **3–4 mesh/color variants** so a crowd isn't visibly identical, but
  always recognizable as "the same kind of being."

## Pedestrian performance — two-tier rendering (REQUIRED)

A downtown crowd cannot be hundreds of individually-rigged skeletal
characters — that would wreck the frame rate. Use a **two-tier system:**

- **Far / ambient crowd → `InstancedMesh`.** The whole background crowd
  is drawn as instanced meshes in a single draw call — cheap enough to
  render a dense, living sidewalk. These blobs cannot be hit and have no
  animation rig; they are set-dressing that reads as "the world is full
  of people."
- **Near / active blobs → `SkeletonUtils.clone`.** When the car comes
  within a **~10-meter radius**, the nearest ambient instances are
  **swapped for fully rigged skeletal clones** (same Mixamo pattern as
  the office NPCs). Only these promoted blobs can be struck and can play
  the fall → stand → phone-pull animation.
- The swap is invisible to the player (same mesh, same position) but it
  means we only ever pay skeletal-animation cost for the handful of
  pedestrians actually near the car. Promote on enter, demote back to
  instanced on exit.

This is also how downtown gets "busier" than the sprawl: **more
instanced ambient blobs**, not more cars (see Hazards & Events →
pedestrian density).

## Behavior

- **Idle:** stand on sidewalks, walk in straight lines along
  pedestrian paths.
- **Hit:** they fall over, stay down for 2–3 seconds, get up, brush
  themselves off, **pull out their phone**, and start typing.
- **No death state.** No blood. No screams. No siren response.
- The phone-pulling-out beat IS the horror: they're not hurt, they're
  *documenting you.*

## Penalty stack — the HR escalation

Each pedestrian hit triggers an escalating sequence of consequences.
None of them is "game over." All of them eat time and stack into Phase
4 receipts.

### Hit 1 — Administrative friction
- **Time penalty: −3 min.** Your character pauses briefly to "exchange info."
- Slack toast: *"Diane (HR) is typing…"* then *"Hi! Quick check-in.
  Got an alert from the company-issued GPS tracker. Everything OK?"*
- No real consequence yet. The surveillance is just announcing itself.

### Hit 2 — Form-filling mid-mission
- The game **briefly overlays a corporate Incident Report form** — but
  this is a **rapid-fire reflex tax, not a reading test.** It should
  take only **~10 real seconds of fast clicking**, never 45 seconds of
  reading. Don't kill the adrenaline of the run.
- **Real time: ~10 seconds. In-game time: −6 min.** The clock penalty,
  not the click-time, is the real cost.
- The fields fly by as **pre-filled multiple-choice you just bash
  through** — each click auto-advances to the next:
  - *"Was the pedestrian a current or former employee?"* → [No] [Unclear]
  - *"Offer a complimentary branded tote bag?"* → [Yes] [Decline]
  - *"This incident does not constitute a precedent."* → [Acknowledge]
  - *"Sign here."* → [/s/ Leonard]
- You're not *reading* the form, you're *speed-running* it while your
  lunch hour bleeds out. The comedy is the absurd questions glimpsed at
  speed; the punishment is the −6 minutes. Pure Blocked.

### Hit 3+ — Reputational escalation
- LinkedIn notification appears: *"Jeff Morrison has added you to his
  network."* — yes, the Jeff you hit.
- Slack channel #general starts buzzing — peers are quietly discussing
  "the dashcam thing."
- Carries directly into Phase 4 as an Alignment hit.

### Hit 5+ — Mandatory Sensitivity Training
- A non-dismissible modal: *"You've been auto-enrolled in mandatory
  Defensive Driving & Empathy training. Module 1 of 6. Estimated
  completion: 9 minutes."*
- The player must watch a fake training video (slides + clicks) while
  their lunch hour evaporates.
- This is a capstone fail-state gag, not a punishment the player should
  see often during normal play.

## Why this works tonally

- No death = tone protected. Blocked stays deadpan corporate satire,
  not GTA edgelord.
- The penalty is **administrative, not criminal.** The horror is HR,
  not the police.
- Each hit becomes a **Receipt** that surfaces in Phase 4's Exec
  Review — *"Item 4: I understand there was an incident on Sepulveda
  this afternoon."*

---

# DEFERRED SYSTEM: GRAND THEFT LUNCH

Car theft is a **Phase 3.5 / post-MVP** idea, not part of the ship-first
slice.

Reason for defer:

- It contradicts the cosmetic-only damage model unless a second vehicle
  failure system is introduced.
- It adds walk-mode recovery, second-car acquisition, extra Phase 4
  consequence logic, and a large new tone escalator.
- The bowl is the load-bearing mechanic; theft should not steal oxygen
  from it during MVP production.

Keep the concept in reserve for a later expansion once the base lunch
loop is fun.

---

# HAZARDS & EVENTS (HARDCODED FOR V1)

> **V1 is hardcoded, not rolled.** The original design called for a
> roll-per-run event manager that randomized hazard locations. That's
> **cut from MVP.** For V1, every hazard lives at a **fixed, hand-placed
> spot in the level** so we can tune the route puzzle precisely and ship
> without a randomization system. Random permutations are a post-MVP
> upgrade (see Optional / Post-MVP).

## Hardcoded hazards (every run, same place)

These hazards are **static and hand-placed** — distinct from the
**on-rails moving traffic** (see Traffic), which is the separate
reactive layer. Nothing here is AI-driven.

- **Highway construction (hardcoded).** A fixed closed-lane zone on the
  main artery between sprawl and downtown: barriers, a stopped work
  vehicle, a one-lane squeeze. Forces a real choice between the artery
  (fast but pinched) and the side-street bypass (slower but clear).
- **The parade (hardcoded).** A fixed downtown street is walled off by a
  generic civic parade — marching band, beige-blob crowd, one
  slow-moving float — all **on-rails or stationary** set-dressing, never
  AI traffic. Downtown always has a "you cannot go straight through
  here" street the player must learn to route around.
- **Stationary obstructions.** Hand-placed lines of parked cars acting
  as soft cones, plus a parked delivery truck blocking a lane. Thread
  through or route around.

Because these are fixed, **all hazards can show on the minimap from the
start** — the puzzle is "plan the best line around known obstacles,"
not "react to surprises." That's the right difficulty for MVP.

## Pedestrian density (NOT a traffic event)

There is **no "lunch-rush traffic spike"** in MVP — that idea is cut as
a traffic mechanic. The only thing that gets denser downtown is the
**pedestrian crowd**, handled purely as **more `InstancedMesh`
instancing** (see Pedestrians → two-tier rendering), not as cars:

- **Sprawl:** sparse ambient crowd.
- **Downtown:** dense ambient crowd — more instanced blobs on the
  sidewalks, more chances to clip one if you cut a corner onto the curb.

This gives downtown its "careful now" feel through crowd density alone
— **no timed spike event, and the traffic that *is* there is on-rails,
not AI** (see Traffic).

## Time-triggered beats

At 5:1 compression, **1 real minute = 5 in-game minutes.** Build all
timed beats off that truth table:

- **11:10 AM / 2 real min** — first Diane check-in can fire if the
  player is still dithering in the sprawl.
- **11:25 AM / 5 real min** — a Corporate Talk AM 1080 traffic report
  name-checks the parade street ("delays downtown, consider alternates").
- **11:40 AM / 8 real min** — Diane sends the "you will be at the noon
  Architecture Sync, right?" message regardless of behavior.
- **12:00 PM / 12 real min** — hard deadline.

## Why this works

The static hazards are **fixed and learnable** — they set up a route
puzzle the player solves once, then optimizes on replay. On top of that
fixed layout, the **on-rails traffic** (see Traffic) adds the *reactive*
moment-to-moment layer the static maze can't: cars to thread, gaps to
time, slow sedans to commit-or-wait around. The **time-triggered beats**
supply predictable narrative pressure. We get a tense, replayable run
with **zero randomization tech and zero traffic AI** in V1.

Replay loop: *The construction always pinches the artery and the parade
always walls off 5th, and the traffic runs the same loops every time —
but where I* meet *that traffic depends on my speed and line, so the
fast clean run is never quite the same drive twice.*

---

# TRAFFIC — ON-RAILS, MOVING, NOT AI

This is the **reactive layer** the static maze can't provide. Static
hazards generate *route* decisions (made once, at planning). Moving
traffic generates *moment-to-moment* decisions (made continuously, with
your hands) — and those are what a driving game actually runs on. It is
also what *feeds the bowl*: without traffic, the only thing forcing a
sharp, bowl-threatening input is the player's own impatience.

## What it is

- **Dumb cars on fixed lane splines.** Each car follows a hand-drawn
  path (a lane loop) at constant speed. That's the whole brain.
- **They interact only with you, never each other.** No inter-car
  collision, no avoidance, no merging. Two traffic cars can occupy
  overlapping space and neither notices — the player is never looking
  closely enough to care.
- **One optional line of "AI":** a single raycast in front of each car,
  so that if the *player* is directly ahead it eases off the gas instead
  of comically ramming you. That is the entire decision-making budget.
  Nothing else thinks.
- **Collision uses the existing bouncy-bumper** (see The Driving →
  Collision). Clipping a moving car is the same springy push-back as a
  parked one, **plus a bowl jostle** — so traffic and the bowl are
  directly wired together.

## What it is NOT (the scope line)

Explicitly **out of MVP**, deferred to post-MVP:
- Pathfinding of any kind
- Traffic lights / intersection negotiation
- Lane-changing, overtaking, or reacting to each other
- Spawn randomization

If a feature requires a car to *make a decision about the world*, it's
out. On-rails cars only follow their line.

## Density by zone

Mirrors the pedestrian-density logic — more cars where it should feel
busy:
- **Sprawl arteries:** light, fast-moving traffic. Easy to thread; the
  danger is speed, not congestion.
- **Downtown grid:** denser, slower traffic. The squeeze. This is where
  "wait behind the slow sedan vs. swing around it" lives.

## The decision it creates (why it's the point)

A single slow car ahead of you, clock ticking, is the core dilemma of
the whole phase:

> **Wait** behind it — safe bowl, lost time.
> **Swing around it** — a sharp input that threatens the bowl, and if
> you drift toward the curb, a pedestrian you might clip.

That one situation ties **time + bowl + pedestrians** into a single
continuous choice — the connective tissue that makes the three core
systems *interact* instead of sitting in separate boxes. It also quietly
kills the "just drive slow and safe" exploit: slow driving gets you
*stuck* in traffic and blows the clock, so the player is pushed to flirt
with the bowl's limit whether they want to or not.

## Determinism (consistent with the hardcoded ethos)

Traffic is **deterministic** — same cars, same lane loops, same constant
speeds, every run. This keeps the "no randomization tech" promise and
keeps runs learnable. The *variety* is emergent: because the cars run
their loops on a fixed clock, **where you meet them depends on your speed
and line** — so a faster run threads a different-looking road than a
cautious one, without a single random number. (A per-run spawn offset is
a one-line post-MVP knob if runs ever feel too samey.)

## Thematic gift — the sea of beige Camrys

Make the traffic cars **identical to the player's car**: the same beige
Camry, over and over, each driven by a faceless beige blob. Every other
car on the road is *you* — another corporate drone running the same lunch
errand at the same hour. The road is a mirror. It costs nothing (one car
model, already built) and it is the most Blocked thing in the phase.

---

# THE DRIVING

## Camera

**Third-person follow**, matching Phase 1's office camera convention.
Same camera-rig pattern, retargeted at the car instead of the PM.

- ~4m behind the car
- ~2m above
- FOV 60° (matches Phase 1)
- Soft lookahead — the camera leans into turns slightly so you can see
  what's coming

NEVER top-down. NEVER first-person. Consistency with Phase 1's visual
language is the priority.

## Handling: arcade-loose with weight

**Reference vibe:** Crazy Taxi, GTA 1/2 top-down, Mario Kart minus the
items. Drivable in 30 seconds, focus stays on the world.

| Property | Tuning |
|---|---|
| Turn radius | Generous — no drifting required |
| Cornering | Can take corners fast; car slides a little, no spinout |
| Brakes | Responsive, no ABS realism |
| Top speed | Adequate but not exciting (this isn't a racing game) |
| Bumps | Visible salmon-bowl jostle (visual gag, mechanical = bowl state) |

Going over a bump in third-person view: the bowl visibly bounces in
the passenger seat. This is the funniest single piece of feedback in
the phase.

**Telegraph every hard corner.** Because the bowl punishes sharp
high-speed turns, the player must never be *surprised* by one. Two
systems work together: the **minimap calls corners ahead like rally
pacenotes** (see Navigation), and **tire-screech audio fires the instant
cornering force starts pushing the bowl toward Wobbling** (see the
Salmon Bowl). Pre-warned by the map, then audibly told "you're at the
limit" by the tires — that's what makes driving fast *and* protecting
the bowl a fair skill instead of a guessing game.

## Collision: light raycast + "bouncy bumper" (NOT pure AABB sliding)

The office got away with AABB bounds + axis-separated sliding because
the PM walks slowly. **A car at speed needs better, or it feels awful**
— pure AABB sliding makes the car grind and stick along every wall,
which reads as broken in a driving game. So Phase 3 upgrades the
collision *response* without taking on a full physics engine:

- **Lightweight raycast / spherecast probes** from the car (forward +
  corners) detect walls, static cars, and hazards a frame ahead.
- **"Bouncy bumper" response:** on contact, the car gets a small
  **elastic push-back + slight speed scrub** rather than a dead stop or
  a sticky slide. Clipping a parked car nudges you off it with a little
  bump — springy and forgiving, not flypaper.
- Still **no Rapier / no Cannon.** This is hand-rolled response logic on
  top of cheap raycasts — far simpler than a rigid-body sim, far better
  feel than office-style AABB.
- The driving model itself (accel/decel curves, steering) stays
  hand-tuned for *feel*, exactly as planned. The bump just makes contact
  with the world feel intentional.

Tune target: a player who grazes a wall at speed should feel a
satisfying *boink* and keep moving — never a jarring halt or a slow
scrape.

## Controls spec (MVP)

- **W / Up** — accelerate
- **S / Down** — brake / reverse
- **A / D / Left / Right** — steer
- **E** — interact: pickup zone, enter car during intro, and **"wait in
  car"** at HQ to end the run early (see The Return)
- **R** — cycle radio station
- **Tab** — toggle objective / minimap emphasis
- **Hold Backspace (2 sec)** — **Call a Tow** (unstuck mechanic, below)
- **Esc** — pause
- **Space / Enter** — skip cinematic once allowed

No handbrake, no manual transmission, no free-look camera for MVP.
Driving should be readable in 30 seconds.

## Unstuck mechanic — Call a Tow

Arcade collision + a hand-built city means a player *will* eventually
wedge the car somewhere dumb (jammed between two static cars, beached on
a planter). They must never be hard-stuck:

- **Hold Backspace for 2 seconds** → a "Calling a Tow…" prompt fills.
- On release, the car is **reset to the nearest point on the main
  road**, upright and facing a sensible direction.
- **Cost: −5 in-game minutes** (the tow took a while). Enough to
  discourage using it as a fast-travel exploit, cheap enough to rescue a
  genuinely stuck player.
- Fits the fiction: it's a roadside-assistance call, narrated by a bored
  Slack toast (*"Tow dispatched. Try to stay on the road."*).

---

# RADIO

The radio is **flavor-first, low-scope in MVP**. It should deepen the
run, not become its own production project.

## MVP dial (2 stations)

| Station | Vibe | Purpose |
|---|---|---|
| **94.1 The Loft** | Chill house / smooth driving bed | Makes the car feel like temporary sanctuary |
| **Corporate Talk AM 1080** | Fake NPR-style talk radio | Delivers the strongest satire + traffic-state callouts |

## Corporate Talk AM 1080 — the killer station

The flagship satire content lives here:

- **News updates about Corporate Slop Bowlz Q3 earnings call** —
  *"analysts remain bullish on greens-as-a-service"*
- **A fake ShipMart commercial** — *"Did UPS lose your package again?
  ShipMart — we lose it differently."*
- **A traffic report that references the EXACT events in your run** —
  *"parade activity on 5th Ave is causing significant delays. Drivers
  are advised to consider alternate routes."* The radio is canonically
  aware of your game state.
- **An NPR-style human interest segment** about a guy named Jeff
  Morrison who recently went viral on LinkedIn after "a difficult
  Tuesday."
- **A live caller** who calls in to complain about an incident on
  Sepulveda. (If you hit a pedestrian, this segment appears.)

## Toggle UI

- A single button on the steering wheel HUD (default key: **R**)
- Cycles forward through the 2 MVP stations
- The station name displays briefly (~2 sec) on switch
- No volume control needed for MVP — toggle is on/off via the same key
  held (or just leave the radio always on)

## Per-station structure

Each station has:
- 1–2 looped tracks / beds
- A station ID jingle every minute
- A small fake commercial pool
- Occasional state-aware DJ / host lines

This system is **reusable across other phases.** Phase 4 could pipe a
station onto someone's Bluetooth speaker in the office. Future phases
could too.

---

# WIN / LOSE

## Win condition

The run is **won** if at 12:00 PM (in-game) the player is:

✅ Back at Alignly HQ underground parking
✅ Carrying both lunches (yours + exec's salmon bowl)
✅ Bowl status is NOT Spilled

Bonus errands (ShipMart, dry cleaning) are not required for the win
— they're a separate reward path (see Composed / Functional /
Disheveled below).

Wins promote to Phase 4 (when shipped). Until Phase 4 lands, the win
ending tells the player *"Lunch Dash complete. Awaiting Executive
Review at 4:30 PM."*

## Output state written for Phase 4

When the retrospective resolves, Phase 3 writes:

```ts
type Phase3Final = {
  timeArrivedMinutes: number
  wasLate: boolean
  latenessMinutes: number

  bowlDelivered: boolean
  bowlSpills: number
  bowlStateAtReturn: 'stable' | 'wobbling' | 'critical' | 'spilled'

  pedestrianHits: number
  incidentFormsTriggered: number
  sensitivityTrainingTriggered: boolean

  vehicleDamageTier: 'pristine' | 'scuffed' | 'dinged' | 'wrecked'

  bonusErrandsCompleted: string[]
  slackPingsIgnored: number
  radioStationsUsed: string[]

  returnTier: 'composed' | 'functional' | 'disheveled'
}
```

## Three return tiers (Receipts → Phase 4)

These are the **lunch-run-as-receipt-for-Phase-4** mapping. Same
shape as Phase 1 → Phase 2's stance system.

### Composed — *zero pedestrian hits + on time + both lunches + ≤1 spill*
- Starting Alignment **+10** going into Phase 4
- Exec opens with: *"Glad to see you back in one piece. Let's get into it."*
- **Unlocks a Phase 4 dialogue option** that doesn't otherwise exist —
  *"I'd like to address the Q2 risk proactively"* — a clean,
  in-control opener that only a clean lunch run earns
- Achievement: 🏆 **Composed Commuter**

### Functional — *typical run* (1–2 hits, on time, both lunches OR clean but late ≤5 min)
- No bonus, no penalty
- Exec opens neutrally: *"You're here. Let's begin."*
- Default Phase 4 dialogue tree

### Disheveled — *3+ hits OR late >5 min OR missing the exec's lunch*
- Pissed-Off **+20**, Alignment **−10** going into Phase 4
- Exec opens with whichever sin is loudest:
  - Late: *"Glad you could join us."*
  - Missing salmon bowl: *"Did we not get the salmon bowl?"*
  - Many hits: *"Item 4 — I understand there was an incident on Sepulveda."*
- Some Phase 4 dialogue options grayed out (you can't take the
  high-ground play if you arrived a mess)

## Tier evaluation truth table (MVP)

- **Composed** if all are true:
  - back at HQ by 12:00
  - exec bowl delivered
  - your lunch delivered
  - pedestrianHits === 0
  - bowlSpills <= 1
- **Functional** if bowl delivered and either:
  - on time with 1–2 pedestrian hits, or
  - late by 5 in-game minutes or fewer with otherwise clean delivery
- **Disheveled** otherwise

## Bonus errand effect (separate from tier)

Each bonus errand completed gives **Pissed-Off relief (−10)** that
carries into Phase 4. The joke: **corporate doesn't care that you
got your life together — only that you got the salmon bowl.** The
errand reward is personal restoration, invisible to the company.

A hidden joke: if you do the errands but FAIL the required lunches,
you arrive at Phase 4 calm and centered but professionally screwed.
Best mood, worst standing. Pure Blocked.

## Fail states

| Fail | Trigger | The moment |
|---|---|---|
| **Late** | Clock hits 12:00 PM before you park at Alignly HQ | Calendar notification: *"You missed: Architecture Sync."* Diane Slacks: *"Just a quick check-in."* |
| **Spilled and Late** | A spill (or two) — each a 15-min courier lock — pushes you past 12:00 | The courier did get you a fresh bowl, but the wait ate your buffer. You walk in late. Phase 4 opens cold. |
| **Sensitivity Training Trap** | Mandatory training modal at hit 5+ eats your remaining time | The training video plays to completion. You wake up at 12:14 PM. The fail screen is a certificate of completion. |

Three characterized fails. Each is a comedy beat. Players will want to
see all of them.

---

# THE INTRO — WALKING OUT OF THE BUILDING

Phase 3 boots from the Phase 2 retrospective screen with a short
cinematic transition:

1. **Phase 2 ending** fades out
2. **Office lobby interior** — wide shot, Leonard walks past the
   reception desk toward the glass doors
3. **Lobby pan** — fluorescent lights, generic art on walls, a single
   beige blob in the lobby waiting for an Uber
4. **Glass door opens** — bright outdoor light, brief lens flare
5. **Parking lot** — Leonard walks to his car (a beige Camry, of
   course)
6. **Car door opens** — quick interior view, key in ignition
7. **Cut to third-person follow camera** — car idling in the parking
   space, ready for input

Total transition: ~6–8 seconds. Skippable with Spacebar/Enter after
the first 2 seconds.

The transition reuses Phase 1's walking code and the existing camera
rig. No new mechanics — just camera + scene setup.

---

# THE RETURN — PARKING AT ALIGNLY HQ

The end-of-run beat mirrors the intro but in reverse, with the
**damage state visibly carried into the parking lot:**

1. Car enters Alignly HQ underground lot
2. Camera pulls back as you park
3. **If car is Pristine:** clean park, walk to elevator with bowl,
   typical ending
4. **If car is Scuffed/Dinged:** parking-lot security guard glances at
   the bumper as you walk past
5. **If car is Wrecked:** security guard does a full double-take.
   Through the building windows you can see **Tasha looking out at
   you.** Diane (HR) starts typing on Slack the moment you park.

## Wait-in-car / end run early (REQUIRED)

A skilled player will often park back at HQ with in-game time still on
the clock. They should **not** be forced to sit and watch the timer
bleed down in real time — that's dead air.

- The moment the player parks in the HQ spot with both required items
  delivered, a prompt appears: **`[E] Wait in car until 12:00 PM`**.
- Pressing **E** fast-forwards the in-game clock to 12:00 and goes
  straight to the retrospective. A few flavor beats can play during the
  skip (Leonard checks his phone, the radio murmurs, a single beige blob
  walks past the windshield).
- Arriving early is **rewarded by the time stat on the retrospective**
  (*"Time used: 41 of 60"*) and is exactly how you chase the Composed
  tier — the fast-forward just spares the player the literal waiting.
- If the player would rather keep the engine running and go attempt the
  optional errand instead, they simply don't press E and drive back out.
  Parking is not a hard commit until they confirm.

Cut to Phase 3 retrospective screen.

---

# THE PHASE 3 RETROSPECTIVE SCREEN

Mirrors the Phase 2 Jira-board retrospective format (matching the
existing `JiraRun.tsx:472` style).

The format is a **fake Jira ticket** titled **LUNCH-471: Pre-Sync
Nourishment Acquisition.** Field values are filled in based on the
run:

```
┌──────────────────────────────────────────────────────────┐
│ Projects › Personal › Lunch Dash › Retrospective         │
├──────────────────────────────────────────────────────────┤
│ LUNCH-471                                                │
│ Pre-Sync Nourishment Acquisition                         │
├──────────────────────────────────────────────────────────┤
│ Status:           ✓ Done                                 │
│ Assignee:         Leonard                                │
│ Resolution:       Composed                               │
├──────────────────────────────────────────────────────────┤
│ Subtasks:                                                │
│   ✓ LUNCH-471.1  Pick up your lunch                      │
│   ✓ LUNCH-471.2  Pick up exec's salmon bowl              │
│   ☐ LUNCH-471.3  Drop Amazon returns                     │
│   ✓ LUNCH-471.4  Return to office                        │
├──────────────────────────────────────────────────────────┤
│ Comments:                                                │
│   Time used: 49 min of 60                                │
│   Pedestrians injured: 0                                 │
│   Vehicle damage: Pristine                               │
│   Bowl status at delivery: Stable                        │
│   Vehicle: Personal                                      │
│   Slack pings ignored: 2 of 4                            │
│   Stations listened to: 2                                │
├──────────────────────────────────────────────────────────┤
│ ─────────────────────────────────────────────            │
│ Actual Business Value Generated: $0.00                   │
└──────────────────────────────────────────────────────────┘

           [ Phase 4 · coming soon ]
```

The final **$0.00 line is hardcoded** — same thesis as Phase 2.
Whether you ran a clean Composed sweep or wrecked three cars, the
business value generated is identical.

---

# ACHIEVEMENTS

Phase 3 adds to the existing `ACHIEVEMENTS` array. All persist to the
same localStorage key — show up in the HR FILE landing-page viewer.

## Core achievements (8)

- 🏆 **Composed Commuter** — Composed return (zero hits, on time, both lunches)
- 🏆 **Functional** — completed a Functional run (just exists, encourages first-completion)
- 🏆 **Disheveled** — completed a Disheveled run (encourages the chaotic playstyle)
- 🏆 **Bowl Whisperer** — finish a run with bowl never leaving Stable
- 🏆 **Errand Boy** — completed the MVP optional errand AND both required stops in a single run
- 🏆 **Body Shop Will Bill You** — return Wrecked
- 🏆 **First Dent** — your first pedestrian impact (rite of passage)
- 🏆 **Dialed In** — listen to both MVP radio stations in a single run

## Surreal-mechanic achievements (defer most to post-MVP)

- 🏆 **Salmon Holocaust** — spill the bowl 3+ times in one run
- 🏆 **I Can Buff That Out** — return Wrecked and lie about it in the Phase 4 incident form

Deferred with car-theft system:
- **Grand Theft Lunch**
- **Hot Wired**
- **Perfect Crime**
- **At a Low Point**

---

# PLAYABILITY PRINCIPLES

## One thing demands attention at a time
The bowl status is the primary feedback loop. When it changes state,
the icon pulses + a small sound plays. Everything else (radio,
pedestrians, traffic) is ambient. The player's eye knows where to look
first.

## Spatial layout matches mental model
- **Time** top-center — pressure comes from the clock
- **Tasks** top-left — your TODO list
- **Bowl status** top-right — your real-time risk indicator
- **Slack badge** bottom-right (same as Phase 1) — muscle memory

## Default to "drive normally" works
If the player freezes, the car just sits in place. Time still advances
(this is the soft pressure). No control-overload — every input is
optional, but Time is not.

## Tutorial inside the fiction
The first 30 seconds of the first run is a tutorial:
- **Idle 5 seconds in parking lot** → thought bubble: *"You should
  probably leave. The clock is ticking."*
- **First pedestrian near miss** → caption: *"Watch the road."*
- **First time the bowl loads in passenger seat** (after Corporate
  Slop Bowlz pickup) → thought bubble: *"Don't take sharp turns. The
  bowl will tip."*

Each mechanic introduced once, in context.

## Three difficulty layers, same map
- **Easy:** drive carefully, ignore the optional errand, take main roads
- **Medium:** standard run, attempt one optional errand
- **Hard:** one optional errand + Composed return + Bowl Whisperer

Same map, same world, same time budget. Skill ceiling is in
**route-planning + driving precision**, not in unlocking content.

---

# ENTERTAINMENT PRINCIPLES

A 10–15 min phase needs **dopamine every 5–8 seconds.**

## Constant micro-rewards
Every action produces visible reaction within 200ms:
- Task complete → green checkmark + soft chime + minor camera shake
- Pedestrian hit → impact thud + "−3 min" float + Slack badge pulse
- Station change → station name fade-in + jingle
- Bowl state change → icon pulse + audio tier change (a subtle warning chime)

## The bowl as comedy
The bowl is the **second-person passenger judging your driving.**
Every careful corner = comedy. Every tight one = tension. The icon
pulsing yellow as you approach a turn = the funniest single moment in
the phase.

## The radio as world-building
The Corporate Talk AM 1080 segments make the world feel reactive.
Hearing your run's parade on the traffic report = ✨ chef's kiss.

## The damage as visible shame
Pulling into the office lot Wrecked = the player is the only one who
can see how much of a mess they made. Diane sees it through Slack
metadata. The security guard sees it physically. Phase 4 sees it
fictionally.

## End-of-phase stat sheet
The retrospective screen quantifies vibes the player didn't know were
tracked. Both replay fuel and comedy.

## The final punchline — hardcoded
Same as Phase 2: **Actual Business Value Generated: $0.00.** Always.
Regardless of outcome.

---

# COMEDY-IN-MECHANICS PRINCIPLES

The humor lives in the systems, not in surreal dressing.

## The faceless beige city
The visual joke that every pedestrian is another office worker means
**the world is the joke.** No setup needed. The first time the player
sees a beige blob jogging in beige athleisure, they get it.

## The phone-pull
The pedestrians don't die — they document you. The phone-pull
animation is the funniest single piece of feedback in the phase.
Hitting one and watching them stand up and immediately Yelp-review
your driving = comedy.

## The bowl is a NPC
The bowl has feelings. The HUD icon's facial expressions (subtle)
change with state — Stable looks content, Wobbling looks worried,
Critical looks alarmed, Spilled is upside-down with X-eyes. The
**bowl** is the conscience of the run.

## The radio is omniscient
The radio knowing about your parade is a moment of "wait, did the game
just…" comedy. Cheap to build, big payoff.

## Failures as character beats
The Sensitivity Training fail-screen is a certificate of completion.
The Late fail is a calendar notification. The Spilled-and-Stranded
fail is the security guard's blank face. Each is a comedy beat, not a
penalty.

---

# OPTIONAL / POST-MVP

These are scope-flexible — defer to a later pass if v1 needs to ship
faster:

## Randomized hazards + AI traffic
V1 ships **on-rails moving traffic** (see Traffic) but keeps the world
otherwise hand-placed and deterministic. Post-MVP, add:
- **A roll-per-run event manager** that randomizes which downtown street
  the parade blocks, where road closures land, and the weather — so the
  route puzzle reshuffles every run (the original "rolled events" idea).
  Plus the trivial per-run **traffic spawn-offset** knob, if
  deterministic traffic ever feels too samey.
- **AI traffic** — upgrade the dumb on-rails cars into real
  cross-traffic: pathfinding, traffic lights that matter, cars that pull
  out of spots and react to each other. A big feel upgrade with a real
  physics/perf cost, which is why the *AI* layer (not the cars
  themselves) is out of the first slice.
- **Weather** (rain cutting traction / raising bowl risk) once the
  dry-weather bowl tuning already feels good.

## Surreal mechanics (mirror Phase 2's Hostile UI)
- **The GPS lies** — your navigation overlay sometimes shows fake
  construction or routes you to the wrong location
- **The radio hijack** — Corporate Slop Bowlz takes over every station
  for 30 seconds with their jingle ("CSB: we feed the masses")
- **The motorcade** — a slow-moving line of blacked-out SUVs blocks an
  entire street; no license plates; no one acknowledges them
- **The Yelp Reviewer** — a specific generic NPC who appears as a
  cyclist and gives you the Stare through your windshield
- **The Cursed Drive-Thru** — the drive-thru speaker reads your order
  back in a layered, overlapping voice (James-style)

## Persistent damage across runs
Save the damage tier between runs. Pay an in-game cost to repair at a
generic Body Shop in the sprawl. Cosmetic-only persistence adds
texture without changing mechanics.

## Different vehicles
- **Chad's lifted truck** — hard to park downtown, but plows through
  pedestrians without losing momentum (HR escalation × 2)
- **Phyllis's electric Smart car** — humiliating, but can squeeze
  through the parade
- **An exec's Tesla** — silent, fast, but the autopilot occasionally
  takes over and drives you somewhere unexpected

## Multiplayer co-op (way later)
Two players: one drives, one navigates / handles the Slack channel.
The phone-pickup mechanic becomes a real division-of-labor. Probably
not Blocked, probably another game entirely.

---

# BUILD PLAN

Phase 3 reuses much of Phase 1 and Phase 2's engine code: third-person
camera, Zustand state, Slack panel, achievement system, audio manager,
Mixamo rigged NPCs. New work breaks down as follows.

> **Sequencing note (review):** the **Bowl is built before Pedestrians**
> (Build C before Build D), and **on-rails traffic comes right after**
> (Build E). The bowl dictates how fast and how aggressively the car is
> meant to be driven, so the entire driving feel must be tuned around it
> *before* layering in the pedestrians, traffic, and HR-escalation
> systems that all react to that driving.

## Build A — State bridge (1 day)
- Add `phase3State` slice. Read `phase2Final` on mount.
- Hard-gate Phase 3 entry on Phase 2 win.
- Continuity-Brief intro card showing the carried Phase 1/2 meters
  before lobby walk.

## Build B — The car + driving (4–5 days)
- New `LunchDashScene.tsx` — Three.js scene with sprawl + downtown
  blockout
- Car model (low-poly beige Camry, ~5k tris) + damage decal layers
- `useFrame` driving loop — hand-tuned acceleration, steering, braking,
  bumps
- Camera rig retargeted to follow the car (~4m back, 2m up, FOV 60°)
- **Lightweight raycast/spherecast collision + "bouncy bumper" response**
  against world geometry and static hazards (NOT pure AABB sliding —
  see The Driving). Tune the springy push-back feel here.
- **Call-a-Tow unstuck** (hold Backspace 2s → reset to main road, −5 min)

## Build C — Bowl mechanic (1–2 days)  ← built BEFORE pedestrians
- 4-state bowl HUD icon + state machine
- Visible salmon bowl in passenger seat (separate mesh, jostles with
  car motion)
- Spill trigger logic (speed × steering angle × bump)
- **Tire-screech audio tied to the Wobbling threshold** (the audible
  physics-limit cue)
- **"Call It In" spill recovery** — Slack toast, car locks 15 in-game
  min, CSB courier-blob meets you halfway (NO drive-back; kills the
  zombie run)

## Build D — Pedestrians + HR escalation (3–4 days)
- **Two-tier crowd rendering:** `InstancedMesh` ambient crowd, promoted
  to `SkeletonUtils.clone` skeletal blobs within a ~10m radius of the
  car. Downtown = denser instancing, not more cars.
- Hit-detection + fall → stand → phone-pull beat (on promoted blobs only)
- **Rapid-fire Incident Report form** (~10 real sec of clicking, −6
  in-game min) at hit 2
- Slack escalation pool (Diane DMs, peer pings, LinkedIn notifications)
- Sensitivity Training video at hit 5+

## Build E — On-rails traffic (2–3 days)  ← the reactive layer
- **Lane-spline system** — hand-drawn path loops for sprawl arteries +
  downtown grid.
- **Dumb traffic cars** that ride the splines at constant speed, reusing
  the player's beige Camry model (the "sea of beige Camrys").
- **Player-only collision** via the existing bouncy-bumper, **+ bowl
  jostle** on contact. No inter-car collision.
- **One raycast per car** so it eases off the gas if the player is
  directly ahead — the entire "AI."
- Per-zone density (light/fast in sprawl, dense/slow downtown).
- Deterministic placement + timing (no spawn randomization).

## Build F — Damage tiers (2 days)
- 4-tier damage decal system (Pristine → Wrecked), cosmetic only
- Visible body damage carry-through to parking lot scene
- Achievement triggers for damage milestones

## Build G — Return flow + retrospective (2 days)
- Parking zone resolution at HQ
- **Wait-in-car / end-run-early** ([E] to fast-forward to 12:00)
- Return-tier evaluation (Composed / Functional / Disheveled truth table)
- `phase3Final` persistence
- Retrospective screen stat fill

## Build H — Hardcoded hazards + timed beats (1 day)  ← no random manager
- **Hand-place** the construction zone, the parade, and the static
  parked-car / delivery-truck obstructions directly in the level.
  **No roll-per-run event manager in V1.**
- Static-hazard minimap markers (visible from the start)
- Time-triggered beats using the corrected 5:1 timing table
- Corporate Talk AM 1080 traffic report copy that name-checks the
  hardcoded parade street

## Build I — Radio system (1–2 days)
- 2 stations × 1–2 loops / VO beds
- Station ID jingles
- Small fake commercial pool
- Corporate Talk AM 1080 dynamic segments (state-aware DJ copy)
- Toggle UI on steering wheel HUD

## Build J — HUD + nav + tasks (1–2 days)
- Time + Tasks + Bowl HUD layout
- **Minimap with rally-pacenote turn telegraphing** + active objective
  marker (this is a critical-path readability system, not polish)
- Task checklist with dynamic check-off (required stops + the one core
  player-optional errand)
- Paused Phase 1/2 meters (dimmed)
- Quiet Slack badge

## Build K — Intro / outro cinematics (2 days)
- Lobby walk-out (reuse Phase 1 walking)
- Parking lot scene → car ignition transition
- Return parking sequence with damage-aware staging
- Retrospective screen (Jira-board-style)

## Build L — Polish pass (3–4 days)
- Bowl jostle animation tuning + screech mix
- Pedestrian phone-pull animation
- Traffic-car spacing / speed feel tuning
- Audio: engine hum, tire screech, bowl thud, traffic ambience, Slack
  ding variants
- Damage decal blending
- Loading screen / lobby fade transitions

**Total MVP estimate: 18–23 working days.**
Driving + bowl + on-rails traffic are the three systems that make the
phase *fun*; route readability + return flow make it *legible*. On-rails
traffic adds ~2–3 days — but cutting **AI** traffic (pathfinding/lights)
and the random-event manager is what keeps even that inside a ~3-week
band.

---

# OPEN QUESTIONS

Decide before content/build:

1. **Time mapping.** Confirm 60 in-game min = 12 real min. Could be
   tightened (10 real min) or relaxed (15 real min). Prototype-test
   first before content lock.

2. **The 12:00 PM deadline.** Currently "Architecture Sync" — could
   be re-themed if a better fictional deadline surfaces. The deadline
   needs to feel like a real meeting the player can't blow off.

3. **The bowl spill threshold.** Should be tunable on day one of
   prototyping. The "feel" of when the bowl is safe vs. wobbling vs.
   critical is the entire phase's tension.

4. **Slack badge visibility.** Optional 4th HUD element. Adds Phase 1
   muscle memory but might be visual clutter at 60mph. Prototype with a
   very quiet version first.

5. **Pedestrian density.** Sprawl baseline (sparse) vs. downtown
   baseline (dense) — need a real number per zone. Lunch rush
   multiplier on top.

6. **Radio licensing / production.** MVP only needs 2 stations. Keep
   one mostly music bed and one mostly VO to control production load.

7. **Should the bowl be visible in first-person POV during pickup?**
   Currently spec'd as a UI cutaway (cheap). A real first-person
   pickup beat would be more cinematic but adds animation scope.

8. **Phase 4 connection.** This blueprint assumes Phase 4 is the Exec
   Review at 4:30 PM. Confirm that's still the trilogy → quadrilogy
   plan, or whether a Phase 3.5 (afternoon hellscape) sits between.

9. **Optional errand count in MVP.** One optional stop is probably
   enough. Add the second only if the map feels too linear.

---

# COMPANION DOCS

- Main game blueprint: `/Users/rebeccaleung/blocked/Blocked_Game_Blueprint.md`
- Phase 1 content pack: `/Users/rebeccaleung/blocked/Blocked_Standup_Content_Pack.md`
- Phase 2 blueprint (stale — pre-Jira-Run): `/Users/rebeccaleung/blocked/Blocked_Phase2_Blueprint.md`
- 3D / prompt pack: `/Users/rebeccaleung/blocked/Blocked_Claude_3D_Prompts.md`
- **This doc:** `/Users/rebeccaleung/blocked/Blocked_Phase3_Blueprint.md`
- Phase 3 content pack (to be written): the radio scripts, Slack
  escalation copy, incident report fields, Corporate Talk AM 1080
  segments. **Recommend writing AFTER prototyping Build B + C + D so
  the copy is informed by what feels good to play.**

---

# OPEN-ENDED NEXT STEPS

Once this blueprint is locked, natural sequencing:

1. **Build A + B** (state bridge + car + driving) — gets you to "I can
   drive the beige Camry around an empty world." 5–6 days. Tactile.
2. **Build C + D + E** (bowl + pedestrians + on-rails traffic) — gets
   you to "I can pick up the bowl, thread a living road, and feel the HR
   system push back." ~7 days. First real playable, and the first build
   that's actually *fun*.
3. **Write Phase 3 Content Pack** with the actual play-feel of (2) in
   hand. Avoids writing copy blind. 3–4 days.
4. **Build F + G + H** (damage + return flow + hardcoded hazards).
5. **Build I + J** (radio + HUD/nav).
6. **Build K + L** (intros / outros / polish).

Total: ~4–4.5 weeks of focused MVP build for Phase 3 to ship.

---

# QUICK-REFERENCE: DECISIONS LOCKED FROM BRAINSTORM

| Decision | Lock |
|---|---|
| Phase number | **Phase 3** |
| Name | **Lunch Dash** |
| Trilogy → Quadrilogy | Phase 1 / 2 / 3 / 4 |
| Goal | Pick up your lunch + exec's salmon bowl, return on time |
| Map | Sprawl + downtown, two-zone open world |
| Required stops | Corporate Slop Bowlz (downtown), your lunch spot (sprawl or downtown) |
| Bonus errands | One in MVP; second optional errand if the route puzzle needs more texture |
| Time budget | 60 in-game min ≈ 12 real min (5:1 compression) |
| Driving feel | Arcade-loose with weight, third-person follow |
| Collision | Lightweight raycast + "bouncy bumper" response (not pure AABB sliding) |
| Unstuck | Hold Backspace 2s → Call a Tow, reset to road, −5 in-game min |
| Pedestrians | Faceless beige blobs, no death, HR escalation |
| Pedestrian rendering | InstancedMesh ambient crowd → SkeletonUtils.clone within ~10m of car |
| Bowl mechanic | 4-state HUD; spill = "Call It In" (car locks 15 in-game min, courier meets you halfway — no drive-back) |
| Bowl feedback | Wobble hard-tied to tire-screech audio (the physics-limit cue) |
| Your lunch | Time-sink only (drive-thru wait), no seat/physics — contrast with the fragile company bowl |
| Incident form | ~10 real sec rapid-fire clicking, −6 in-game min |
| Damage | Cosmetic 4-tier, achievements, resets per run |
| Car theft | Deferred to Phase 3.5 / post-MVP |
| HUD | Time + Tasks + Bowl + minimap w/ rally-pacenote turn telegraphing (+ quiet Slack badge) |
| End run early | Park with time to spare → [E] wait in car, fast-forward to 12:00 |
| Carried Phase 1/2 meters | Paused, dimmed, resume in Phase 4 |
| Intro | Walk out lobby → get in car |
| Ending | Jira-board-style retrospective (LUNCH-471) |
| Radio | 2 MVP stations, toggleable, flavor-first |
| Brand names | Corporate Slop Bowlz, ShipMart, Suds & Fold |
| Return tiers | Composed / Functional / Disheveled feeding Phase 4 |
| Errand | One core errand in MVP (player-optional to complete); reward = Pissed-Off relief (invisible to corporate). 2nd errand post-MVP |
| Hazards | Hardcoded for V1 — construction + parade + static parked cars, hand-placed (no roll-per-run manager) |
| Traffic | On-rails moving cars (dumb, fixed lane loops, "sea of beige Camrys") + static obstructions; NO traffic AI (pathfinding/lights) — that's post-MVP |
| Traffic dilemma | Slow car ahead = "wait (lose time) vs. swing around (risk bowl + pedestrian)" — ties all 3 core systems together |
| Time-triggered | 11:10 / 11:25 / 11:40 / 12:00 beats using 5:1 timing |
| 12:00 PM deadline | Architecture Sync (no-show fail) |
| Final punchline | Actual Business Value Generated: $0.00 |
