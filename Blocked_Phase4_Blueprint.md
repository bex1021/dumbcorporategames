# Blocked — Phase 4 Blueprint: Performance Review

> Companion to `Blocked_Game_Blueprint.md`. This doc covers the Phase 4
> vertical slice — the campaign finale. Phase 1 (Pre-Standup Alignment),
> Phase 2 (Jira Run), and Phase 3 (Lunch Dash) are shipped.
>
> Design lineage: this blueprint mines the shelved Standup design
> (`Blocked_Phase2_Blueprint.md`, pre-Jira-Run) for its best material —
> the verb economy, Throw Under the Bus, the hostile UI, The Stare, and
> the $0.00 punchline all carry forward into fighter form.
>
> **Status:** Design draft v0.1 from 2026-07-09 session. Core decisions
> locked (see Quick-Reference at bottom); tuning values are targets, not
> law, until the graybox proves them.

## One-line pitch

**Performance Review** is a real-time one-on-one fighting game disguised
as the 4:30 PM Executive Review. The Exec finally gets his update on the
Customer Happiness Portal Refresh — delivered as a three-round corporate
title bout where "Pushback" is a heavy punch, "Threaten PIP" is an
unblockable command grab, and the health bars are named Credibility and
Skepticism.

## Core promise

> "You spent all day managing what people said ABOUT the project.
> Now the one person who can end it is across the table, and the
> conversation is finally, literally, a fight."

The whole campaign has rendered office work as game genres — walking sim,
endless runner, driving game. Phase 4 is the payoff of that pattern: the
meeting every phase has dreaded, rendered as the genre of pure
confrontation. The joke completes itself: every corporate conversation
was always a fighting game. Now the HUD admits it.

## The fiction: metaphor overlay (LOCKED)

**The office does not transform. Nobody acknowledges the genre.**

It is a normal conference room at 4:30 PM. The Exec sits across the
table, then stands. The camera drops to a side-on fighting-game framing,
health bars slide in, a round announcer chimes — and the Exec calmly
says *"So. Where are we on the portal refresh?"* while assuming a loose
southpaw stance.

Rules of the overlay:

- **All "attacks" are conversational.** Every move is a line of dialogue
  delivered as a physical technique. The Exec's jab is the sentence
  *"Quick question."* Leonard's heavy is the word *"Pushback:"* followed
  by an actual shove. Damage numbers float off hits styled like Jira
  story points.
- **The deadpan holds.** No one reacts to the violence because there is
  no violence — there is a meeting, and this is what meetings feel like.
  Diane pokes her head in mid-round, sees two men in fighting stances,
  and says "I'll circle back."
- **Scott Pilgrim logic, Alignly voice.** The fight is not "in Leonard's
  head" and not a reality break. It is simply how the game has decided
  to render this conversation, the same way Jira Run rendered ticket
  work as an 8-bit runner. The genre switch IS canon; the fiction never
  explains it.

## The four-phase frame (complete)

| | Time | Setting | Core verb | Genre | Length |
|---|---|---|---|---|---|
| Phase 1 ✓ | 9:00–10:15 AM | Free-roam office | Walk + extract alignment | Walking sim / RPG | ~10 min |
| Phase 2 ✓ | 10:15–11:00 AM | Leonard's desktop | Run + route tickets | 8-bit runner | ~5 min |
| Phase 3 ✓ | 11:00 AM–12:00 PM | Sprawl + downtown | Drive + errand-triage | Driving game | ~10 min |
| **Phase 4** | **4:30–5:00 PM** | **Conference room 4B** | **FIGHT** | **Versus fighter** | **~8–12 min** |

The unmodeled afternoon (12:00–4:30) remains the implied corporate void.
A single black card covers it before the fight:
*"The afternoon happens. None of it matters. 4:30 PM."*

## Player fantasy

The player is not here to win an argument. The player is here to
**survive a status conversation with their body.** Every corporate
instinct trained across Phases 1–3 — when to push, when to absorb, when
to deflect, when to sacrifice someone — becomes a physical reflex with
frame data.

Player thought pattern:

> "He's steepling his fingers — that's the PIP wind-up. Back-dash. His
> recovery is huge, that's my Pushback window. Meter's at half — if I
> land two more Clarifies I can afford Phased Approach before the
> hard stop."

## Continuity from Phases 1–3 (hard continuation, soft landing)

Phase 4 reads `phase3Final` (and through it, the whole day) on mount.
Gated on a Phase 3 win, same pattern as prior phases — **but see the
Mercy Rules section: Phase 4 itself never hard-walls the campaign.**

```ts
type Phase4Boot = {
  // From phase1Final / phase2Final / phase3Final
  alignment: number            // move-list size (see Receipts)
  pissedOff: number            // starting Composure modifier
  projectStatus: number        // Exec's starting Skepticism
  ticketsCompleted: number     // Data Pull special unlock
  returnTier: 'composed' | 'functional' | 'disheveled'  // opener + special
  pedestrianHits: number       // Exec gains "Item 4" special at 3+
  bowlDelivered: boolean       // arena prop + opener line
  vehicleDamageTier: string    // visible through the window
}
```

---

# CORE DESIGN

## Core verb: **FIGHT (READ → RESPOND → PUNISH)**

Real-time, one-on-one, on a single lateral axis (walk left/right along
the conference table — no jumping in v1; arguments are grounded). The
skill is **reading telegraphs and answering them**, not executing inputs.
Every input is one key. Nothing requires a motion input, a combo string,
or more than two fingers.

This is the **Punch-Out discipline inside a Street Fighter presentation**:
free movement and simultaneous action (she's a real fighter), but the
design load-bearing wall is that every Exec attack is telegraphed early,
readably, and honestly. The player should lose because they read wrong,
never because the game was faster than a human.

## The health bars (the fiction of the numbers)

| Bar | Whose | What it is | At zero |
|---|---|---|---|
| **CREDIBILITY** | Leonard | Professional standing in this room, made physical | KO — *"Leonard has been placed on a Performance Improvement Plan."* |
| **SKEPTICISM** | The Exec | His doubt in the project. You are not hurting him. You are wearing down his objections. | KO — he extends a hand: *"Great sync. Ship it."* The sign-off IS the knockout. |

The asymmetry is the satire: the Exec cannot be harmed, only convinced.
Leonard can absolutely be harmed.

**ALIGNMENT METER (super meter):** builds as Leonard lands moves and
successfully blocks. Spent on specials. Rendered as the Phase 1
Alignment bar, now weaponized. Starts each round at the value carried
from the day (alignment 6/12 = meter starts 50% in round 1 — the day's
corporate homework is literally stored energy).

## The rock-paper-scissors core

Three interaction verbs form the classic fighter triangle. Everything
else is built on top of this:

- **STRIKES beat THROW** — hitting someone mid-grab-attempt stuffs it.
- **THROW beats BLOCK** — "Let's Take This Offline" grabs a turtling
  opponent. You cannot block a calendar invite.
- **BLOCK beats STRIKES** — "Active Listening" absorbs hits (small chip
  damage — listening to this man costs something).

## Leonard's moveset (v1 — deliberately small)

Controls: `A/D` walk · `double-tap A/D` dash · `J` light · `K` heavy ·
`S` (hold) block · `L` throw · `J+K` special (when meter allows) ·
`Esc` pause.

| Move | Input | Damage | Startup | Recovery | Notes |
|---|---|---|---|---|---|
| **Clarify** | J | 6 | fast (8f) | short | The jab. Pokes, interrupts, builds meter. Line: *"Quick clarification—"* |
| **Pushback** | K | 14 | slow (20f) | long | The heavy. Punishable if whiffed. Line: *"I'm going to push back on that."* |
| **Active Listening** | S hold | — | instant | on release | Block. 1 chip per absorbed hit. Leonard nods while blocking. |
| **Let's Take This Offline** | L | 10 | mid (14f) | mid | The throw. Beats block. Leonard hands the Exec a calendar invite; the invite explodes. |
| **Back-dash** | double-tap A | — | invulnerable frames 1–8 | mid | The PIP answer. Leonard steps back, palms up: *"Noted."* |

### Specials (cost Alignment meter; unlocks are the Receipts payoff)

| Special | Cost | Unlock condition | Effect |
|---|---|---|---|
| **Phased Approach** | 3 bars | always | Projectile: a Gantt chart sails across the screen. Mid damage, slow, controls space. Line: *"We're derisking via a phased approach."* |
| **Circle Back** | 2 bars | always | Counter-stance for 30f. If struck during it, the Exec's move is "circled back" — it lands on HIM at the top of round's end. The move that made Phase 1 famous, now with frame data. |
| **Proactive Framing** | 3 bars | **Composed lunch tier only** | Armor-through advance: Leonard walks forward through one hit and delivers a huge counter. *"Before you ask — I'd like to address the Q2 risk proactively."* The clean-lunch-run reward, exactly as promised in the Phase 3 blueprint. |
| **Data Pull** | 4 bars | **Jira Run: 3+ tickets completed** | Screen-wide stun: the wall dashboard flares, the Exec shields his eyes, 60f of free hit window. *"Per the dashboard—"* |
| **THROW UNDER THE BUS** | 0 bars | Credibility below 25% only | **The desperation super, inherited from The Standup.** Free. Massive damage (40). Leonard names a coworker — the sound of a bus passes outside. Cost: it is permanently recorded. Using it even once caps your ending at the tarnished variant and prints in the stat sheet: *"People sacrificed at the review: 1 (we have notes)."* The availability is the horror: it's always there, free, glowing, exactly when you're desperate enough. |

## The Exec's moveset

The Exec never raises his voice. Every attack is delivered in the calm,
warm register of a man who has done this many times.

| Move | Type | Damage | Telegraph (the read) | Answer |
|---|---|---|---|---|
| **Quick Question** | jab | 5 | Raises one finger | Block, or trade with Clarify |
| **Let's Double-Click on That** | dash attack | 10 | Leans forward, squints | Back-dash → punish recovery |
| **Per My Last Email** | projectile | 8 | Pulls out phone | Walk under is impossible (no jump) — block it or dash THROUGH with Proactive Framing |
| **Derail Conversation** | mid swipe + **hostile-UI debuff** | 8 | Rotates hand in a lazy circle: *"Let's zoom out."* | Block the hit — but if it CONNECTS, your J and K keys **swap for 3 seconds** (the conversation is derailed; your own tools stop meaning what they meant — the Phase 2 hostile-UI tradition, real-time edition). A small 🔀 icon shows the swap so it's cruel but never dishonest. |
| **THREATEN PIP** | command grab, unblockable | 25 | The big one. He **steeples his fingers** and the room's ambient audio drops out for half a second. Long, generous wind-up. | Cannot be blocked. Back-dash (i-frames) or interrupt the startup with any strike. Landing it triggers a mini-cutscene: a single PIP form drifts down between them like a leaf. |
| **Actually, Great Point** | parry stance | counter | Palms open, nodding warmly | The anti-mash move. If you hit him during it, he "yes-and"s your attack back at you for its own damage. Teaches patience. |
| **Item 4: Sepulveda** | super | 18 | **Only exists if `pedestrianHits ≥ 3`.** He glances at a folder. | Your Phase 3 crimes, weaponized — the receipts cut both ways. Diane's silhouette appears at the glass. |

## The three rounds = the agenda

Best-of-3, each round themed as an agenda item. The Exec escalates —
not by getting faster beyond fairness, but by adding moves.

| Round | Agenda item | Exec behavior | The room |
|---|---|---|---|
| **1 — STATUS** | "Where are we?" | Jab, Double-Click, Email only. Learnable. | Normal conference room. Golden hour through the blinds. |
| **2 — TIMELINE** | "When does it land?" | Adds Derail + PIP threat. First hostile-UI moments. | The wall dashboard begins ticking on its own. Blinds slats narrow slightly. |
| **3 — THE ASK** | "What do you need from me?" (a trap) | Full moveset + Actually-Great-Point. At his last 20% Skepticism he enters **Hard Stop desperation**: speed +10%, chip damage up. | Camera dollies in ~10% (the Phase 2 closing-in language, final form). HVAC pitches down. Every landed PIP threat leaves the form on the floor. |

**Between rounds (the narrative breath):** a 15-second seated beat.
Both men sip water. The player picks one of three stances for the next
round — *Confident* (+damage, −defense), *Measured* (balanced),
*Apologetic* (+defense, meter builds slower). It's a corner-coach moment
where the coach is also you, and it gives dialogue-first players a
strategic lever that isn't reflexes.

**The round timer:** 99 seconds, labeled **HARD STOP**. If it expires,
nobody is KO'd — the round is *judged*: whoever's bar percentage is
higher takes it. Corporate truth: most meetings aren't won, they just
end, and the decision goes to whoever looked better at the hard stop.

## Fight feel (non-negotiables for it to feel like a fighter)

These four things are 80% of why fighting games feel good. They are
polish-pass items in most genres; here they are core systems:

1. **Hitstop** — on every connect, BOTH characters freeze 4–8 frames.
   This is the "crunch" of a hit. Without it everything feels like wet
   paper. One line of code, enormous feel.
2. **Screenshake** — 2–4px, 100ms, on heavies and supers only.
3. **Input buffering** — a press within ~150ms before an action is
   possible executes when possible. Forgiveness is invisible; its
   absence is "the controls feel bad."
4. **Distinct audio per interaction** — whiff (air), block (dull thud +
   Leonard's "mm-hm"), hit (paper-stack slam), counter (record scratch).
   The announcer is a deadpan corporate text-to-speech voice — TTS is
   not a budget compromise here, it IS the joke:
   *"ROUND ONE. STATUS. …ALIGN."*

---

# MERCY RULES (STANDARD SECTION — REQUIRED IN ALL PHASE BLUEPRINTS)

Phase 4 is the finale of a campaign whose audience was recruited by a
*dialogue* game. Real-time combat must never hard-wall them. Three
layers, all in-fiction:

1. **Losing is an ending, not a wall.** A KO rolls the full ending
   sequence and credits with the **PIP ending**. The campaign completes.
   The player can rematch immediately from the ending screen
   (*"Request a follow-up review"*) to chase a better rating. Nobody
   finishes the day without finishing the game.
2. **Reasonable Accommodations mode.** In pause + offered automatically
   after 2 KOs, deadpan HR framing, real assists: Exec speed −20%,
   telegraph windows +50%, Derail's key-swap disabled, chip damage off.
   Toast on enable: *"HR has approved your accommodations request.
   This will not affect your review. (It will not help it either.)"*
   Achievements stay enabled — assist is a mode, not a punishment.
3. **Rubber-band AI.** The Exec's aggression quietly eases when Leonard
   is at low Credibility with no meter (he monologues more, attacks
   less — narratively: he's savoring it). Comeback space without visible
   pity.

---

# CINEMATOGRAPHY

- **Side-on fighter framing** — the one sanctioned break from the
  third-person follow rule, same license as Jira Run's 8-bit switch.
  Camera on the long axis of the conference table, both fighters in
  profile, dashboard on the back wall between them.
- **The dolly-in** — round 3 borrows The Standup's closing-in camera:
  slow continuous push, never a cut.
- **The Stare (inherited).** On either KO, before the ending screen:
  every NPC from the whole day is suddenly standing at the conference
  room glass, silently watching. Brent, Tasha, Priya, Chad, Diane,
  Phyllis the plant (someone carried her). Hold 2.5 seconds. No
  dialogue. Then the ending. They were always going to find out how
  the review went.
- **KO cinematics:** Exec KO'd → he checks his watch, says "great
  sync," and the handshake slow-mos with impact frames like a title
  bout. Leonard KO'd → he sits down slowly in the ergonomic chair,
  which exhales.

# HOSTILE UI (inherited from The Standup, rationed for real-time)

Real-time combat can't sustain Phase-2-density interface sabotage
without becoming unfair. Two moments only, both telegraphed:

- **Derail key-swap** (see moveset) — attack keys swap 3s on hit,
  with an honest 🔀 indicator.
- **The Exec Slack ambush** — once per fight, between rounds only
  (never mid-round), a Slack toast from the Exec's own account pops
  over the stance-select buttons: *"This is going great 🙂"*. He is
  Slacking you from across the table. Dismiss to continue.

# ENDINGS (4 + 1 secret hook)

1. **EXCEEDS EXPECTATIONS** — win without losing a round, no Bus.
   The project is greenlit for Phase 2 of the Portal Refresh. Nothing
   was ever built in Phase 1. The cycle begins again.
2. **MEETS EXPECTATIONS** — standard win. Sign-off achieved. The
   ending stat sheet quantifies the whole DAY, not just the fight.
3. **EXCEEDS EXPECTATIONS\*** — won, but the Bus was used. Same
   greenlight; the asterisk is never explained; the sacrificed
   coworker's chair is empty in the ending shot.
4. **PIP** — KO'd. The form is signed with the same handshake
   animation as victory. *"We're really investing in your growth."*
   Credits roll either way — see Mercy Rules.

**Every ending screen, final line, hardcoded, inherited:**

> ### Actual Business Value Generated: **$0.00**

**Secret hook (post-MVP, not in v1):** beating EXCEEDS with zero
specials used makes the lights flicker at the handshake… and James
(Patagonia vest, overlapping buzzword voices, the great cut character
from The Standup) is standing in the doorway. *"Got time for a quick
double-click?"* — SECRET ROUND tease, then smash to credits. Build the
fight later; ship the tease only when the fight is real.

# ACHIEVEMENTS (8)

- 🏆 **Exceeds Expectations** — the clean win
- 🏆 **Growth Opportunity** — get the PIP ending (finishing is honored)
- 🏆 **Per My Last Counter** — win a round via Circle Back
- 🏆 **Active Listener** — block 20 attacks in one fight
- 🏆 **Proactive** — land Proactive Framing (Composed-tier players only)
- 🏆 **It Wasn't Me** — win using Throw Under the Bus (the trophy is the indictment)
- 🏆 **Hard Stop** — win a round on time-out judgment
- 🏆 **Read the Steeple** — interrupt Threaten PIP's startup 3 times in one fight

---

# HOW A FIGHTER ACTUALLY WORKS (the build, exactly)

For the record, in plain terms — a fighting game is four systems:

1. **A state machine per character.** At any instant a fighter is in
   exactly one state: `idle · walk · dash · startup · active · recovery ·
   blockstun · hitstun · knockdown`. Moves are just timed trips through
   `startup → active → recovery`. This is the same pattern as the
   dialogue system's "one panel open at a time," at 60 updates a second.
2. **A move table (frame data).** A TypeScript array, exactly like the
   dialogue effect chips: `{ name, damage, startupFrames, activeFrames,
   recoveryFrames, blockable, meterCost, line }`. Designing this table
   is designing the game. Tuning it is a spreadsheet exercise.
3. **Hit detection without physics.** Both fighters stand on one lateral
   axis. A hit = "attacker is in `active` frames" AND "distance between
   fighters < move's reach" AND "defender not blocking/invulnerable."
   Three comparisons. No physics engine — same no-Rapier rule as every
   other phase.
4. **The AI is a state machine too.** The Exec picks intents from a
   weighted table based on distance + round + player habits (if you
   block a lot, throw more; if you mash, Actually-Great-Point). Every
   intent broadcasts its telegraph first. Difficulty = weights + timing
   windows, both in the same tuning spreadsheet.

Everything else — animation crossfades (Mixamo pipeline, already
built), meters (MeterBar, already built), state (Zustand, already
built), audio (Howler, already built) — is the existing engine.

## BUILD PLAN

> **Sequencing note:** the graybox (two capsules, rectangle hitboxes,
> debug frame-data readout) must feel good BEFORE any character art
> goes in. If capsules trading blows isn't fun, animations won't save
> it. Same graybox-first discipline as Phases 1 and 3.

- **Build A — State bridge + receipts mapping (1 day).** Read the day's
  finals, compute unlocks, Continuity Brief card ("Your day so far"
  → move list preview).
- **Build B — Arena + side camera (2 days).** Conference room 4B
  re-dressed from existing office geometry, long-axis camera, golden-
  hour lighting rig, window showing the parking lot (damaged Camry
  visible per `vehicleDamageTier`).
- **Build C — Fighter core (4–5 days).** THE build. Input buffer,
  character state machines, frame-data table, lateral movement,
  distance-based hit resolution, hitstop, block/chip, throw triangle,
  health/meter/rounds/timer. All-capsule graybox. **Go/no-go gate:
  the capsule fight must be fun by the end of this build.**
- **Build D — Exec AI (3–4 days).** Intent table, telegraph
  broadcasting, per-round move-pool gating, anti-mash counter logic,
  rubber-band easing, Hard Stop desperation mode.
- **Build E — Animation pass (3–4 days).** Mixamo fight set (idle
  stance, jab, cross, block, hit reacts, dodge, grab, KO, victory) for
  both fighters, retargeted via the existing pipeline. Root motion
  stripped; the state machine drives position, clips drive limbs.
- **Build F — Moves + receipts content (3 days).** Specials, unlock
  gating, Exec receipt moves (Item 4), Throw Under the Bus with its
  ending consequences, all dialogue lines per move.
- **Build G — HUD + hostile UI (2–3 days).** Credibility/Skepticism
  bars, Alignment meter, round pips, floating story-point damage
  numbers, announcer toasts, Derail key-swap + 🔀 indicator, the
  between-rounds Slack ambush.
- **Build H — Rounds, stances, endings (2–3 days).** Agenda structure,
  between-round stance select, 4 endings, The Stare, full-day stat
  sheet, $0.00.
- **Build I — Audio (2 days).** Hit/whiff/block/counter set, TTS
  announcer, round-3 HVAC pitch-down, PIP audio dropout, handshake
  slow-mo mix.
- **Build J — Mercy layer (1–2 days).** Reasonable Accommodations
  mode + auto-offer, PIP-ending credit roll, rematch flow.
- **Build K — Polish (3–4 days).** Hitstop/screenshake tuning, paper
  particles on heavies, PIP-form leaf-drift, KO cinematics, stance
  micro-animations, dolly-in easing.

**Total estimate: 26–33 working days.** The single biggest schedule
risk is Build C feel-tuning; protect the go/no-go gate. This is the
largest phase build — appropriate for a finale, but do not let it
grow. Everything in OPTIONAL below stays out of v1.

## OPTIONAL / POST-MVP

- **The James secret round** (see Endings) — build only after v1 ships.
- **Local versus mode** — two keyboards, Leonard vs. Leonard ("Peer
  Review"). The engine supports it almost free; the content doesn't.
- **Training room** — "Onboarding Dojo," Phyllis the plant as the
  training dummy with a stance chip that only ever reads Neutral.
- **New Game+ ("Next Quarter")** — replay the day with all specials
  unlocked; the Exec has learned your habits from your last run's
  stats. The corporate loop, mechanized.
- Spectating coworker cameos mid-round (Chad: "THIS is what I'm
  talking about! 🔥" — helps neither fighter).

## OPEN QUESTIONS

Decide before content lock (defaults chosen; flag disagreement):

1. **Jump: none in v1** (grounded arguments; halves animation set and
   removes anti-air design). Post-MVP if the fight feels flat.
2. **Round timer 99s** — theme as seconds or as "meeting minutes"?
   Default: a bar labeled HARD STOP, no visible number until 10s left.
3. **The Exec's name** — he has been nameless all campaign ("Exec →
   You"). Default: keep him nameless; the fight card reads
   **LEONARD P. vs. "THE EXEC"** and the quotation marks are the joke.
4. **Gamepad support** — trivial to add for a fighter, breaks the
   keyboard-only fiction of the KeyboardGate. Default: keyboard-only
   v1, matching the rest of the campaign.
5. **Difficulty targets** — first-fight win rate ~35–45%, post-
   accommodations ~85%+. Validate with the autopilot-playtest harness
   before tuning by hand.
6. **Does pissedOff carry in as anything?** Default: high day-long
   pissedOff = Leonard starts each round with +1 meter bar but −10%
   max Credibility (rage is fuel, and it's expensive). Tune in graybox.

## COMPANION DOCS

- Main blueprint: `Blocked_Game_Blueprint.md`
- The Standup (shelved design, mined heavily here): `Blocked_Phase2_Blueprint.md`
- Lunch Dash (receipts source): `Blocked_Phase3_Blueprint.md`
- Phase 4 content pack (to be written): move lines, Exec dialogue
  pools, ending copy, stat-sheet strings, announcer VO scripts.
  **Write AFTER Build C proves the fight feel — dialogue lands
  differently at 60fps than on the page.**

## QUICK-REFERENCE: DECISIONS LOCKED 2026-07-09

| Decision | Lock |
|---|---|
| Phase | **Phase 4 — campaign finale** |
| Name | **Performance Review** |
| Genre | **Real-time 1v1 fighter** (full — not turn-based, not QTE) |
| Fiction | **Metaphor overlay** — normal room, fighter HUD, nobody acknowledges it |
| Boss | **One Exec, best-of-3 rounds** mapped to agenda: Status / Timeline / The Ask |
| Health fiction | Leonard = **Credibility** · Exec = **Skepticism** (you convince, he harms) |
| Core triangle | Strike > Throw > Block > Strike |
| Movement | Lateral only, dash, **no jump v1** |
| Inputs | Single-key everything: J/K/S/L + J+K specials. No motion inputs ever |
| Receipts | **Moves + openers**: Composed→Proactive Framing, Jira tickets→Data Pull, pedestrian hits→Exec's Item 4, alignment→starting meter |
| Inherited from The Standup | Throw Under the Bus, hostile UI (rationed), The Stare, closing-in camera, $0.00 |
| Losing | **An ending (PIP), never a wall** — credits roll, rematch offered |
| Assist | **Reasonable Accommodations** mode, in-fiction, auto-offered after 2 KOs |
| Timer | 99s **HARD STOP**; timeout = judged round |
| Announcer | Deadpan corporate TTS (the cheapness is the bit) |
| Feel floor | Hitstop + screenshake + input buffer + per-interaction audio are CORE, not polish |
| Final line | Actual Business Value Generated: **$0.00** |
