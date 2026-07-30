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
> **Status:** Design draft v0.3, 2026-07-12. v0.1 was one boss (the Exec)
> across three agenda rounds; v0.2 restructured the finale as a
> **three-opponent gauntlet up the org chart** — Brent (Eng) → Priya
> (Product) → the Exec — with results chaining forward. v0.3: **Build C
> (fighter core graybox) is BUILT and passed the fun gate** (balance-tested,
> audio + tiered dialogue live), and the three bouts now have full level
> designs (see THE THREE BOUTS) — one signature mechanic per opponent:
> Brent's Backlog Regen, Priya's Scope Creep, the Exec's phase-gated
> counter. Core decisions locked (see Quick-Reference at bottom); tuning
> values are targets, not law, until the graybox proves them.
>
> **Schedule retimed (2026-07-12, Rebecca):** the gauntlet now sits right
> after lunch — Architecture Sync **1:00 PM**, Product Review **2:00 PM**,
> Exec 1:1 **3:00 PM** (title screen = the day's calendar). The "4:30 PM
> single review + unmodeled afternoon void" fiction in older prose below is
> superseded; sweep those references at the next editing pass.

## One-line pitch

**Performance Review** is a real-time fighting game disguised as the
4:30 PM Executive Review. To get the Portal Refresh signed off, Leonard
has to survive a three-bout gauntlet up the org chart — an **Architecture
Sync with Brent (Eng)**, a **Product Review with Priya**, and finally
**the Exec** — where "Pushback" is a heavy punch, "Threaten PIP" is an
unblockable command grab, and the health bars are named Credibility and
Skepticism. Each bout you survive sets the terms of the next: bruise your
standing with Brent and Priya opens colder; limp out of Product and the
Exec has already "heard from the team."

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

It is a normal conference room at 4:30 PM. The meeting is really
happening — the fighting-game layer is how the game *renders* what the
meeting feels like, exactly as Jira Run rendered real ticket work as a
runner. The conversation is real; the combat is the drawing of it. The
first opponent (Brent) sits across the table, then stands. The camera
drops to a side-on fighting-game framing, health bars slide in, a round
announcer chimes — and Brent calmly says *"So. Where'd we land on the
architecture?"* while assuming a loose stance.

**The one tell (legibility, not a dream frame).** So no player thinks
Leonard is literally decking a coworker, a single transition device
plays as each bout begins: the fluorescent hum drops a semitone, the
room desaturates a touch, and we sit for a half-second in Leonard's POV
before the health bars slide in. That's the whole signal — *we are
entering how Leonard experiences this._ No shimmer, no explicit
"imagine if…", no cutting back to a separate "real" room mid-fight. The
overlay stays canon and ambiguous, the same license Jira Run had.

**The reveal is the button, not the setup.** We never explain the frame
going in. We pay it off at the very end: on the final handshake the
camera pulls back to reveal two people who were just… sitting at a table,
talking. The fight was real the way a meeting is real. Hold, then cut.

Rules of the overlay:

- **All "attacks" are conversational.** Every move is a line of dialogue
  delivered as a physical technique. The Exec's jab is the sentence
  *"Quick question."* Leonard's heavy is the word *"Pushback:"* followed
  by an actual shove. Damage numbers float off hits styled like Jira
  story points.
- **The deadpan holds.** No one reacts to the violence because there is
  no violence — there is a meeting, and this is what meetings feel like.
  Diane pokes her head in mid-bout, sees Leonard and a colleague locked
  in fighting stances, and says "I'll circle back."
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
**Entry is NOT gated on a Phase 3 win (LOCKED — resolves OQ #7).** A lost
or late Phase 3 still rolls into Phase 4 at the `disheveled` return tier:
a worse opener, not a locked door. This keeps the whole-day ethos —
*losing is an ending, not a wall* — consistent from Phase 3 into the
finale, and the Mercy Rules then ensure Phase 4 never walls internally
either.

**Field-mapping note (audit fix, v0.2).** v0.1 named three boot fields
the receipts spine (`campaignState.ts`) never actually saves. Corrected
so every field has a real source:

- `bowlDelivered` → read the existing `phase3.delivered` (it was only a
  rename); keep the friendly alias in Phase 4's own type.
- `ticketsCompleted` → reuse the existing `phase2.updatesDeposited` count.
  No new Phase 2 field; Data Pull's "3+ tickets" reads that number.
- `vehicleDamageTier` → **derive** from the existing `phase3.pedestrianHits`
  (0 = pristine · 1–2 = scuffed · 3+ = wrecked). It's a cosmetic prop in
  the window; no need to persist a new field.

```ts
type Phase4Boot = {
  // From phase1Final / phase2Final / phase3Final — every field has a real source
  alignment: number            // phase1.alignment → starting Alignment meter
  pissedOff: number            // phase1.pissedOff → Composure / rage modifier
  projectStatus: number        // phase1.projectStatus → Exec's starting Skepticism
  jiraPerformance: number      // = phase2.storyPoints → Data Pull unlock (score ≥ threshold, TBD in graybox)
                               //   ⚠ do NOT use updatesDeposited — it's hardcoded to 4 (JiraRun.tsx:480),
                               //   always "complete", so it cannot gate a performance reward.
  brentChoice: string          // phase1.npcChoices['brent'] → Round 1 (Brent) opener + difficulty
  priyaChoice: string          // phase1.npcChoices['priya'] → Round 2 (Priya) disposition + opener
  returnTier: 'composed' | 'functional' | 'disheveled'  // phase3.returnTier → opener + Proactive Framing
  pedestrianHits: number       // phase3.pedestrianHits → Exec "Item 4" special at ≥3
  bowlDelivered: boolean       // = phase3.delivered → arena prop + opener line
  vehicleDamageTier: 'pristine' | 'scuffed' | 'wrecked'  // derived from pedestrianHits → window prop
}
```

**Intra-phase chain (new in v0.2).** Separate from the cross-phase
receipts spine, Phase 4 keeps a tiny in-memory record that carries each
bout's *result* into the next opponent's opening — the Brent → Priya →
Exec coupling (see The Gauntlet). It never touches localStorage; it lives
and dies inside the one Phase 4 session.

```ts
type BoutResult = {
  opponent: 'brent' | 'priya' | 'exec'
  won: boolean                 // KO or judged win
  leonardHealthPct: number     // 0–1 at bout end — the "score" that carries
  bussed: boolean              // did Leonard Throw someone Under the Bus this bout
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

Leonard always has one bar — **CREDIBILITY**. Each opponent has their own
bar, named for what you're actually wearing down in them:

| Bar | Whose | What it is | At zero |
|---|---|---|---|
| **CREDIBILITY** | Leonard | Professional standing in the room, made physical | KO — *"Leonard has been placed on a Performance Improvement Plan."* |
| **RESISTANCE** (Brent) | Brent, Eng | His technical objections. You're not hurting him — you're getting to "fine, ship it." | KO — *"…yeah, okay. That'll work."* |
| **RESISTANCE** (Priya) | Priya, Product | Her scope doubts. Worn down, not harmed. | KO — *"Okay. I'm aligned."* |
| **SKEPTICISM** | The Exec | His doubt in the project. You wear down his objections. | KO — he extends a hand: *"Great sync. Ship it."* The sign-off IS the knockout. |

The asymmetry is the satire: no opponent can be *harmed*, only convinced.
Leonard can absolutely be harmed.

**Credibility across the gauntlet (LOCKED model).** Each bout is its own
short bout with fresh-ish bars — you don't carry a half-empty Credibility
bar into the next fight and die instantly. Instead, **how the last bout
scored sets your *starting* Credibility (and their starting Resistance)
for the next one.** Dominate Brent and you walk into Priya with a buffer;
get out-scored and you start Product on the back foot. That's the
consequence chain, and it's a *handicap*, never a wall (Mercy Rules).

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
| **Circle Back** | 2 bars | always | Counter-stance for 30f. If struck during it, the opponent's move is "circled back" — it lands on THEM at the bout's end. The move that made Phase 1 famous, now with frame data. Works against all three opponents. |
| **Proactive Framing** | 3 bars | **Composed lunch tier only** | Armor-through advance: Leonard walks forward through one hit and delivers a huge counter. *"Before you ask — I'd like to address the Q2 risk proactively."* The clean-lunch-run reward, exactly as promised in the Phase 3 blueprint. |
| **Data Pull** | 4 bars | **Jira Run: strong score** (`storyPoints ≥ threshold`) | Screen-wide stun: the wall dashboard flares, the Exec shields his eyes, 60f of free hit window. *"Per the dashboard—"* (Fiction keeps "per the dashboard"; the *unlock* is Jira Run performance, not a ticket count — all four always deposit.) |
| **THROW UNDER THE BUS** | 0 bars | Credibility below 25% only | **The desperation super, inherited from The Standup.** Free. Massive damage (40). Leonard names a coworker — the sound of a bus passes outside. Cost: it is permanently recorded. Using it even once caps your ending at the tarnished variant and prints in the stat sheet: *"People sacrificed at the review: 1 (we have notes)."* **Gauntlet cost (LOCKED — resolves OQ #8):** bussing sets `BoutResult.bussed` and shifts the **next** opponent one disposition step colder (word travels) — but that shift **shares the combined-handicap clamp**, so it can never compound the standup receipt + chain into an unwinnable bout. Bussing in the final Exec bout has no next opponent; there it only feeds the tarnished ending. The availability is the horror: it's always there, free, glowing, exactly when you're desperate enough. |

## The Exec's moveset (Round 3 — final boss)

This is the full kit, faced only in the third bout. Brent's and Priya's
lighter warm-up kits are under **The Gauntlet** below. The Exec never
raises his voice. Every attack is delivered in the calm, warm register of
a man who has done this many times.

| Move | Type | Damage | Telegraph (the read) | Answer |
|---|---|---|---|---|
| **Quick Question** | jab | 5 | Raises one finger | Block, or trade with Clarify |
| **Let's Double-Click on That** | dash attack | 10 | Leans forward, squints | Back-dash → punish recovery |
| **Per My Last Email** | projectile | 8 | Pulls out phone | Walk under is impossible (no jump) — block it or dash THROUGH with Proactive Framing |
| **Derail Conversation** | mid swipe + **hostile-UI debuff** | 8 | Rotates hand in a lazy circle: *"Let's zoom out."* | Block the hit — but if it CONNECTS, your J and K keys **swap for 3 seconds** (the conversation is derailed; your own tools stop meaning what they meant — the Phase 2 hostile-UI tradition, real-time edition). A small 🔀 icon shows the swap so it's cruel but never dishonest. |
| **THREATEN PIP** | command grab, unblockable | 25 | The big one. He **steeples his fingers** and the room's ambient audio drops out for half a second. Long, generous wind-up. | Cannot be blocked. Back-dash (i-frames) or interrupt the startup with any strike. Landing it triggers a mini-cutscene: a single PIP form drifts down between them like a leaf. |
| **Actually, Great Point** | parry stance | counter | Palms open, nodding warmly | The anti-mash move. If you hit him during it, he "yes-and"s your attack back at you for its own damage. Teaches patience. |
| **Item 4: Sepulveda** | super | 18 | **Only exists if `pedestrianHits ≥ 3`.** He glances at a folder. | Your Phase 3 crimes, weaponized — the receipts cut both ways. Diane's silhouette appears at the glass. |

## The gauntlet = the agenda (three bouts up the org chart)

Not best-of-3 rounds against one boss — **three short single bouts against
three people**, each themed as an agenda item and escalating by *who you
face*, not by one opponent getting unfairly faster. Each bout is ~2–3
minutes. The difficulty climbs because you're climbing the org chart.

| Bout | Agenda item | Opponent | Behavior | The room |
|---|---|---|---|---|
| **1 — STATUS** | "Where'd we land on the architecture?" | **Brent · Eng** | Defensive, technical. Light 3-move kit (below). Learnable. **His opener + aggression are set by `phase1.npcChoices['brent']`** — how you handled him in the standup. | Normal conference room. Golden hour through the blinds. |
| **2 — TIMELINE / SCOPE** | "When does it land, and can it also…" | **Priya · Product** | Scope-creep pressure. Light 3-move kit. **Two inputs, two axes:** her **disposition + opener** are set by `phase1.npcChoices['priya']` (how you handled her in the standup); her **starting Resistance + your starting Credibility** are set by how the Brent bout scored (the chain). First hostile-UI moment (Derail). | The wall dashboard begins ticking on its own. Blinds narrow. |
| **3 — THE ASK** | "What do you need from me?" (a trap) | **The Exec** | Full moveset + Actually-Great-Point. **Opens modified by how Priya scored** ("I've heard from the team"). At his last 20% Skepticism he enters **Hard Stop desperation**: speed +10%, chip damage up. | Camera dollies in ~10% (Phase 2 closing-in language, final form). HVAC pitches down. Every landed PIP threat leaves the form on the floor. |

## THE THREE BOUTS — LEVEL DESIGN (v0.3, added 2026-07-12)

> Design rule: **orthogonal differentiation** (opponents differ in KIND, not
> degree). Each bout tests a different verb — you spend Bout 1 *attacking* a
> defense, Bout 2 *defending* against tempo, Bout 3 *adapting* to everything.
> Structure follows **kishōtenketsu** (intro → development → twist →
> conclusion): Brent teaches, Priya develops, the Exec's counter TWISTS the
> lesson (it punishes the aggression the first two bouts trained), the
> endings conclude. One signature mechanic per opponent — the Punch-Out!!
> one-gimmick-per-boss rule. The Exec is the **final exam** (tests everything
> taught + one new thing).

### BOUT 1 — BRENT · "Architecture Sync" · THE WALL

- **Fantasy:** you just got back from the lunch dash; Eng wants to talk
  architecture. Brent would rather block than commit. The fight is about
  **patience** — he punishes your impatience, never your caution.
- **AI personality:** ultra-defensive turtle. High block rate, low aggression,
  whiff-punishes with the jab. Rarely approaches — makes YOU come to him.
- **Signature mechanic — BACKLOG REGEN:** left alone, his Resistance slowly
  *refills* (his objections re-compile). Poke-and-retreat cannot win; you must
  sustain pressure and crack the guard with throws. Regen pauses ~2s after any
  hit; rate tuned in graybox (~2/s target).
- **What it teaches:** the triangle basics in a safe room — especially
  THROW-beats-BLOCK. Brent is the tutorial with a health bar.

| Move | Type | Damage | Telegraph (the read) | Answer |
|---|---|---|---|---|
| **Well, Actually** | jab | 5 | Pushes glasses up | Block, or trade with Clarify |
| **Scope Concern** | slow heavy | 12 | Crosses arms, inhales through teeth | Long wind-up — interrupt with a strike, or back-dash the whiff |
| **Turtle (Needs More Detail)** | block stance | — | Leans back, stalls | Throw him (*Take This Offline*) — Backlog Regen makes waiting him out a losing plan |

- **Staging:** golden hour through the blinds, whiteboard of boxes-and-arrows
  behind him. Fight card: **"BOUT 1 — ARCHITECTURE SYNC."** Calm motif.
- **Receipt:** `npcChoices['brent']` → disposition (Aligned/Deferred/Hostile
  per the shared table below) sets opener line, aggression, starting Resistance.
- **Targets:** ~90–120s · first-try win ~85% (human-model bots) · loss →
  advance to Priya with the handicap, never a wall.

### BOUT 2 — PRIYA · "Product Review" · THE STORM

- **Fantasy:** Product heard how Eng went (the chain sets the bars). Priya
  fights like scope creep: everything is small, nothing is a request, it all
  adds up. The fight is about **tempo** — surviving strings and never letting
  pressure accumulate.
- **AI personality:** rushdown. Chains pokes, keeps advancing, rarely blocks.
  The inversion of Brent — now YOU are the one defending.
- **Signature mechanic — SCOPE CREEP:** a landed **Quick Add** sticks a
  visible sticky-note stack on Leonard (max 3); each stack adds +3f startup to
  your moves (*the ask keeps growing*). Stacks clear when you land a throw or
  knock her down — you literally **descope**. Product management as combat.
- **What it teaches:** block-then-punish under pressure; proactive throws;
  interrupting strings. Defense as an active verb.

| Move | Type | Damage | Telegraph (the read) | Answer |
|---|---|---|---|---|
| **Tiny Thought** | fast poke, chains ×2–3 | 4 (×combo) | Tilts head, half-smile | Block early — the danger is the string, not the hit |
| **Quick Add** | scope debuff | 6 | *"…and while we're in there—"* | On connect: +1 Scope stack. Interrupt the startup to deny it; throw her to clear stacks |
| **Circle Back to This** | Derail (key-swap) | 8 | Rotates hand: *"let's zoom out"* | The first hostile-UI beat — block it, or eat a 3-second J/K swap (🔀 shown) |

- **Staging:** blinds narrower, the wall dashboard begins ticking on its own,
  sticky notes multiplying along the table edge. Fight card: **"BOUT 2 —
  PRODUCT REVIEW."** Motif gains a ticking pulse. **Diane cameo** happens here
  (pokes head in mid-bout: *"I'll circle back."* — the deadpan holds).
- **Receipts (two axes, LOCKED):** `npcChoices['priya']` → disposition/opener;
  Brent bout score → starting bars. Combined handicap clamped (≈ −25% floor).
- **Targets:** ~2min · first-try win ~60–70% · loss → advance to the Exec
  colder, never a wall.

### BOUT 3 — THE EXEC · "The Ask" · THE EXAM

- **Fantasy:** he has "heard from the team" (the chain writes his opener). The
  full boss from the moveset table above — nothing cut. The fight is about
  **adaptation**: everything the gauntlet taught, plus the one thing that
  punishes it.
- **AI personality:** the patient counter-puncher (current sandbag, matured by
  Build D): reads habits, punishes patterns.
- **Signature mechanic — the COUNTER (+ phase gating):** he escalates by
  *adding moves, not speed* (locked). Phases by Skepticism:
  - **>66% — STATUS:** jab / Double-Click / (Per My Last Email when built).
    Learnable. The bout opens like a harder Brent.
  - **66–33% — TIMELINE:** adds **Threaten PIP** (unblockable command grab,
    steeple tell, audio dropout) and his Derail.
  - **<33% — THE ASK:** adds **Actually, Great Point** — the counter that
    reflects the aggression Bouts 1–2 trained into you. The kishōtenketsu
    twist: now you must WAIT. At <20%: **Hard Stop desperation** (speed +10%,
    chip up).
- **Receipts:** `pedestrianHits ≥ 3` → **Item 4** super · Composed lunch →
  your Proactive Framing · Jira score → Data Pull · alignment → starting meter.
- **Staging:** the dolly-in (~10%, continuous), HVAC pitches down, every
  landed PIP threat leaves the form on the floor. Fight card: **"FINAL —
  THE ASK."** Motif in its lowest register.
- **Targets:** ~3min · first-try win ~40–50% (blueprint OQ #5 band) · KO →
  the PIP ending, credits, rematch offer (Mercy, locked).

### Why the three bouts can't feel the same (the variation stack)

| Axis | Brent | Priya | Exec |
|---|---|---|---|
| Your verb | Attack | Defend | Adapt |
| Their shape | Wall (turtle) | Storm (rushdown) | Mirror (counter-puncher) |
| Signature | Backlog Regen | Scope Creep stacks | Counter + PIP + phases |
| Tempo | Slow siege | Fast pressure | Shifting |
| Light / room | Golden hour | Blinds narrow, dashboard ticks | Dolly-in, HVAC drop |
| Voice | Pedantic | Scope-y | Calm, then colder |
| Motif | Calm | Ticking | Low register |

### Reading the standup receipt (shared with the Slack callbacks — LOCKED)

Phase 1 stores each choice as `a`/`b`/`c`/`d`, and `callbackPings.ts`
**already** canonizes what each means. Round 1/2 openers must derive from
that **same interpretation** — one shared `choiceDisposition(npcId,
choiceId)` helper, used by both the Phase 2 pings and the Phase 4 fight —
so "Brent remembers the standup" reads identically across systems. Do not
invent a parallel reading of the same letters.

| Disposition | Brent (`npcChoices.brent`) | Priya (`npcChoices.priya`) | Fighter effect |
|---|---|---|---|
| **Aligned** (softest) | `a` — you defined "premium" | `a` — you asked her to define the MVP | Warm opener, low aggression, less starting Resistance |
| **Deferred** (neutral) | `c` — punted to a "quick sync" | `b`/`c` — moved it to Phase 2 / scheduled a scope meeting | Neutral opener, baseline |
| **Hostile** (hardest) | `b`/`d` — vague ticket / lied "no blockers" | `d` — you accepted the "small" change | Cold opener, high aggression, more starting Resistance |

**Fail-silent default (required):** if the choice is missing (deep-link
into Phase 4) or an unexpected id, default to **Deferred/neutral** — never
crash, never accidentally hand the player the softest fight. Mirrors the
generic-fallback discipline already in `callbackPings.ts`.

**Between bouts (the narrative breath + the dialogue-player's game):** a
15-second seated beat as the next opponent settles in. Both sip water.
The player picks one of three stances for the coming bout — *Confident*
(+damage, −defense), *Measured* (balanced), *Apologetic* (+defense, meter
builds slower). This is deliberately the **most important system for the
dialogue-first audience**: it's a non-reflex, strategic lever that can
swing a bout on read alone, so a player who's good with people but slow
with their hands can still climb the gauntlet. Tune it to matter.

**Bout resolution & the score that carries.** A bout ends by **KO** (a
bar hits zero) *or*, if the 99-second **HARD STOP** timer expires, by
**judgment** — whoever's bar percentage is higher takes it. Corporate
truth: most meetings aren't won, they just end, and the decision goes to
whoever looked better at the hard stop. Either way, **Leonard's ending
health % is the "score"** that feeds the next opponent's opening (the
chain). Losing a bout is a penalty on the next one, **never a wall** —
you always advance to the next agenda item (Mercy Rules).

**Two receipts, no death spiral (Priya's case).** Priya is the only bout
fed by *both* a Phase-1 receipt (`npcChoices['priya']`, on her
disposition/opener) and the live chain (Brent's score, on the bars).
Because they modulate different axes they read as two distinct pressures
rather than double-counting — but the worst case (you were dismissive to
Priya in the standup *and* got out-scored by Brent) must stay winnable.
**Clamp the combined handicap:** Priya's opening can never start you below
the floor a single bad input would (target: worst-case ≈ −25% starting
Credibility, not −50%), and Reasonable Accommodations still overrides it.
The receipts sting; they don't execute you. **The same clamp also absorbs
a third input — a Bus used in the prior bout (OQ #8)** — so standup
receipt + chain + Bus can shift disposition colder but never stack into an
unwinnable opening. Validate in the autopilot-playtest harness.

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

1. **EXCEEDS EXPECTATIONS** — win all three bouts without losing one,
   no Bus. The project is greenlit for Phase 2 of the Portal Refresh.
   Nothing was ever built in Phase 1. The cycle begins again.
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
- 🏆 **Per My Last Counter** — win a bout via Circle Back
- 🏆 **Active Listener** — block 20 attacks across the gauntlet (retargeted from "one fight" — a single ~2–3 min light bout won't throw 20 blockable attacks)
- 🏆 **Proactive** — land Proactive Framing (Composed-tier players only)
- 🏆 **It Wasn't Me** — win using Throw Under the Bus (the trophy is the indictment)
- 🏆 **Hard Stop** — win a bout on time-out judgment
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
built), audio (a custom Web Audio `AudioManager` — `src/audio/`, not
Howler; already built) — is the existing engine.

## BUILD PLAN

> **Sequencing note:** the graybox (two capsules, rectangle hitboxes,
> debug frame-data readout) must feel good BEFORE any character art
> goes in. If capsules trading blows isn't fun, animations won't save
> it. Same graybox-first discipline as Phases 1 and 3.

- **Build A — State bridge + receipts mapping (1–2 days).** Read the day's
  finals, compute unlocks, wire the **corrected field mapping**
  (`bowlDelivered`→`delivered`, `jiraPerformance`→`storyPoints` — *not*
  `updatesDeposited`, a constant 4 — `vehicleDamageTier` derived from
  `pedestrianHits`, `brentChoice`/`priyaChoice` from `npcChoices` via the
  **shared disposition helper** below), scaffold the **intra-phase
  `BoutResult` chain**,
  Continuity Brief card ("Your day so far" → move-list preview).
- **Build B — Arena + side camera (2 days).** Conference room 4B
  re-dressed from existing office geometry, long-axis camera, golden-
  hour lighting rig, the **one-tell entry transition** (hum drop +
  desaturate + POV half-beat), window showing the parking lot (Camry
  state derived from `pedestrianHits`).
- **Build C — Fighter core (4–5 days). ✅ SHIPPED 2026-07-12.** Input
  buffer, character state machines, frame-data table, lateral movement,
  distance-based hit resolution, hitstop, block/chip/knockdown, throw
  triangle, wakeup i-frames, health/meter/timer, articulated graybox rigs,
  synth audio cues, tiered dialogue, side camera, sandbag AI. Balance-
  audited (headless harness, `scripts/playtest/phase4.ts`): skilled play
  strictly dominant, human-model win ~66–80%. **The fun gate PASSED.**
- **Build C2 — Bout manager (1–2 days). ✅ SHIPPED 2026-07-12.** The
  gauntlet spine: fight cards, three bouts in sequence, `BoutResult`
  chain (score → next opener, verified live: 60% Brent score → 90%
  Priya opener), bout-end beats (koLine / lossLine), loss-advances
  flow, graybox rating screen (EXCEEDS / MEETS / PIP + $0.00), rematch.
- **Build D — Opponent AI, three fighters (5–6 days). ◐ GRAYBOX SHIPPED
  2026-07-12.** Profile-driven AI on the proven reactive core: Brent
  (turtle + **Backlog Regen**, 80-bar), Priya (rushdown + **Scope Creep
  stacks** + the Derail key-swap), the Exec phase-gated (adds **Threaten
  PIP** <66%, the counter <50%, desperation <20%). Battery: Brent 86% /
  Priya 73% / Exec 77% human-avg (chain + Derail push real players
  toward targets). **Remaining for full D:** habit-reading intent
  tables (kills the mash exploit), rubber-band easing, final
  difficulty pass to ~85/65/45.
- **Build E — Animation pass (5–6 days).** Mixamo fight set (idle stance,
  jab, cross, block, hit reacts, dodge, grab, KO, victory) for Leonard +
  **Brent, Priya, and the Exec**, retargeted via the existing pipeline.
  Warm-ups reuse a shared base set with per-character signature clips.
  Root motion stripped; state machine drives position, clips drive limbs.
- **Build F — Moves + receipts + the chain (3–4 days).** Specials, unlock
  gating, Exec receipt moves (Item 4), the **Brent- and Priya-choice
  opener mappings** (+ Priya's two-axis clamp), the
  **Brent→Priya→Exec scoring coupling**, Throw Under the Bus with its
  ending consequences (and its now-visible cost to your standing with the
  next opponent), all dialogue lines per move.
- **Build G — HUD + hostile UI (2–3 days).** Credibility/Skepticism
  bars, Alignment meter, round pips, floating story-point damage
  numbers, announcer toasts, Derail key-swap + 🔀 indicator, the
  between-rounds Slack ambush.
- **Build H — Bouts, stances, endings (2–3 days).** Three-bout gauntlet
  structure, between-bout stance select, 4 endings, The Stare, the
  **final-handshake pull-back reveal**, full-day stat sheet (all three
  bouts), $0.00.
- **Build I — Audio (2 days).** Hit/whiff/block/counter set, TTS
  announcer, round-3 HVAC pitch-down, PIP audio dropout, handshake
  slow-mo mix.
- **Build J — Mercy layer (1–2 days).** Reasonable Accommodations
  mode + auto-offer, PIP-ending credit roll, rematch flow.
- **Build K — Polish (3–4 days).** Hitstop/screenshake tuning, paper
  particles on heavies, PIP-form leaf-drift, KO cinematics, stance
  micro-animations, dolly-in easing.

**Total estimate: ≈29–37 working days** (v0.2 adds ~3–4 over v0.1 for the
two warm-up fighters — the cost of the gauntlet, deliberately capped by
keeping Brent and Priya to light 3-move kits). The single biggest
schedule risk is still Build C feel-tuning; protect the go/no-go gate.
The second is letting the warm-up fighters bloat toward full movesets —
they must not. This is the largest phase build — appropriate for a
finale, but do not let it grow. Everything in OPTIONAL below stays out
of v1.

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

(v0.2 locked the gauntlet structure, the metaphor-overlay-plus-one-tell
fiction, the full Brent→Priya→Exec chain, and light warm-up scope — see
Quick-Reference. Still open, decide before content lock; defaults chosen,
flag disagreement:)

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
*(OQ #7 and #8 resolved 2026-07-10 with their defaults — now LOCKED, see
Quick-Reference: Phase 3 loss rolls into Phase 4 at `disheveled`; Bus
shifts the next opponent one step colder under the shared clamp.)*

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
| Fiction | **Metaphor overlay + one tell** — real meeting rendered as a fight; a single entry transition (hum drop + desaturate + POV half-beat) makes it legible; final-handshake pull-back reveals two people just talking. Not a dream frame. |
| Structure | **Three-bout gauntlet up the org chart:** Brent (Eng) → Priya (Product) → the Exec. Short single bouts (~2–3 min each), not best-of-3. Agenda = Status / Timeline / The Ask. |
| The chain | **Full Brent → Priya → Exec coupling.** Each bout's ending health % sets the next opponent's opener + starting bars. A loss is a handicap on the next bout, never a wall. |
| Warm-up scope | **Brent & Priya = light 3-move kits**; the Exec keeps the full moveset. Do not let the warm-ups grow. |
| Bout identity | **One signature mechanic each** (v0.3): Brent = Backlog Regen · Priya = Scope Creep stacks · Exec = phase-gated counter + PIP. Verbs: Attack → Defend → Adapt. |
| Health fiction | Leonard = **Credibility** (persists as starting-value modifier, refreshed each bout) · each opponent = **Resistance/Skepticism** (you convince, they don't harm) |
| Round 1 receipt | Brent's opener + aggression read from **`phase1.npcChoices['brent']`** — how you managed him in the standup |
| Round 2 receipt | Priya's disposition + opener read from **`phase1.npcChoices['priya']`** (a *separate axis* from the Brent-chain bars); combined handicap **clamped** so it can't create an unwinnable bout |
| Core triangle | Strike > Throw > Block > Strike |
| Movement | Lateral only, dash, **no jump v1** |
| Inputs | Single-key everything: J/K/S/L + J+K specials. No motion inputs ever |
| Receipts | **Moves + openers**: Composed→Proactive Framing, Jira score (`storyPoints`)→Data Pull, pedestrian hits→Exec's Item 4 + Camry state, alignment→starting meter, **`npcChoices['brent']`→Round 1 opener**, **`npcChoices['priya']`→Round 2 disposition** |
| Inherited from The Standup | Throw Under the Bus, hostile UI (rationed), The Stare, closing-in camera, $0.00 |
| Losing | **An ending (PIP), never a wall** — credits roll, rematch offered |
| Phase 3 → 4 entry | **Not win-gated** — a lost/late Phase 3 rolls in at `disheveled` (worse opener, not a locked door). Whole-day ethos over per-phase gating. |
| Bus in the gauntlet | Shifts the **next** opponent one disposition step colder, **under the shared clamp** (never unwinnable); in the final bout it only feeds the tarnished ending |
| Assist | **Reasonable Accommodations** mode, in-fiction, auto-offered after 2 KOs |
| Timer | 99s **HARD STOP**; timeout = judged round |
| Announcer | Deadpan corporate TTS (the cheapness is the bit) |
| Feel floor | Hitstop + screenshake + input buffer + per-interaction audio are CORE, not polish |
| Final line | Actual Business Value Generated: **$0.00** |
