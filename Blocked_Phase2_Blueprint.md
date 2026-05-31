# Blocked — Phase 2 Blueprint: The Standup

> Companion to `Blocked_Game_Blueprint.md` (v0.3). This doc covers the
> Phase 2 vertical slice only. Phase 1 (Pre-Standup Alignment) is shipped;
> Phase 3 (Executive Review) is teased here but not designed yet.
>
> **Status:** Design locked. Ready for content + build.

## One-line pitch

**The Standup** is a 10-minute triage game disguised as a corporate
status meeting. Your prep-time lies from Phase 1 become the team's
status updates, and you have 10 capital points to spend deciding what
to engage with, what to let slide, and what to actively cover up — all
while five coworkers and one absent Exec watch the dashboard tick in
real time.

## Core promise

> "Pre-Standup Alignment was about *what you said to people*.
> The Standup is about *those people repeating it back to a room.*"

If Phase 1 was the planning montage, Phase 2 is the heist itself —
everyone you briefed is now reading from your script in front of an
Exec watching the dashboard from another floor, and you have limited
bandwidth to control what they say.

## The trilogy frame

| | Time | Setting | Core verb | Length |
|---|---|---|---|---|
| Phase 1 ✓ shipped | 9:00–10:15 AM | Free-roam office | Walk + extract alignment | ~10 min |
| **Phase 2** | **10:15–10:45 AM** | **Meeting room, seated** | **Triage the room** | **~10 min** |
| Phase 3 (future) | 4:30–5:00 PM | Boardroom | Survive the Exec | ~15 min |

The full trilogy plays in roughly the length of a real status meeting.
By design.

## Player fantasy

The player is not here to surface truth or correct lies. The player is
here to manage what *the room hears* about the truth, while the people
they briefed are quoting them back at them, while the Exec is
half-watching from Slack, while a dashboard ticks live on the wall.

Player thought pattern shifts from:

> Phase 1: "What's the corporate answer that keeps this Green?"

to:

> Phase 2: "Brent is about to repeat what I told him 30 minutes ago. He
> shouldn't. Do I cut him off, redirect to Tasha, or eat it and move on?
> Capital's at 6. Diane is watching."

## Continuity from Phase 1 (hard continuation)

Phase 2 is **gated on a Phase 1 win**. The "Start Phase 2" button is
locked until a successful Phase 1 ending (`standup-complete`,
`green-enough`, or `pyrrhic-alignment`) is in localStorage.

A new state slice `phase1Final` is written when Phase 1 ends and read
by Phase 2 on mount:

```ts
type Phase1Final = {
  // Meters at end of run
  projectStatus: number
  pissedOff: number
  meetingLoad: number
  alignment: number
  timeMinutes: number  // resumes ticking from here (75 → 105 = 10:45)

  // The Receipts payload
  npcChoices: Record<string, 'A' | 'B' | 'C' | 'D'>

  // Run-scoped flags
  runRecoveryTriggered: boolean   // calendar apocalypse fired
  runDelayedFireCount: number     // how many delayed effects landed
  runSlackOpened: boolean         // did they engage with Slack
  copingUseCounts: Record<string, number>  // printer/phyllis/bathroom etc.

  // Which Phase 1 ending they got — flavor only, drives intro card
  ending: 'standup-complete' | 'green-enough' | 'pyrrhic-alignment'
}
```

If `phase1Final` is missing when Phase 2 loads, redirect to landing.

---

# CORE DESIGN

## Core verb: **TRIAGE**

In Phase 1 the verb was *walk and talk*. In Phase 2 the player sits
still and **decides what to engage with**. The room is bombarding them
with input. They have limited bandwidth. Skill = picking the right
thing to address, at the right moment.

This is the load-bearing change in feel. Phase 2 is not a dialogue
tree. It's an attention-management game with dialogue dressing.

## The board state

At all times the player sees:

```
┌─────────────────────────────────────────────────────────────┐
│  PROJECT DASHBOARD (projector, live-ticking)                │
│  Status: ●●●●○ Green   Risk: HIGH                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     [Brent ●]    [Tasha ●]      ← stance chips next to     │
│         neutral    supportive       each NPC (live)        │
│                                                             │
│              ╔═══════════════╗                              │
│              ║   long table  ║   ← ACTIVE SPEAKER glows   │
│              ╚═══════════════╝                              │
│                                                             │
│     [Priya ●]    [Chad ●]    [Diane ●]                     │
│       hostile    defensive    neutral                       │
│                                                             │
│              [PM — head of table]                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  CAPITAL: ●●●●●●○○○○   TIME: 10:23 / 10:45                  │
│  Meters (carried from P1): proj 68 · piss 42 · align 6      │
└─────────────────────────────────────────────────────────────┘
```

**Three live UI elements simultaneously communicating state:**

- **Stance chips** next to each NPC — Supportive / Neutral / Defensive
  / Hostile. Color-coded. Visible at all times. Updates per choice.
- **Capital meter** (NEW) — 10 dots. Spent across the meeting. Limited.
- **Projector dashboard** — ticks live as people talk and you respond.
  Visible truth-vs-spin meter.

---

## THE NEW RESOURCE: **CAPITAL**

This is the load-bearing mechanic. **10 points to spend across the
entire meeting.** Each active intervention costs 1–2 points. Default
(do nothing / nod) is free.

| Verb | Cost | Effect |
|---|---|---|
| **Listen** | 0 | Default. Time advances, no shaping. |
| **Endorse** | 0 | Back the active speaker. Only valuable if their stance is favorable. |
| **Interject** | 1 | Cut someone off mid-status. High-impact, costs goodwill. |
| **Engage interjection** | 1 | Address another NPC's sidebar comment during current turn. |
| **Redirect** | 2 | Hand the floor to a different NPC. Defuses bombs. |
| **Pivot** | 2 | "Let's table that." Defers topic; queues delayed pressure. |
| **Take ownership** | 0 | Eat the blame. Their pissedOff drops, your projectStatus drops. |
| **Throw under the bus** | 0 | Pin the failure on the active NPC. Project Status snaps to **Green instantly**. That NPC locks to **Hostile, permanently** — no recovery for the rest of the run. |

The strategic core: **the player can't engage with everything.** Real
choices emerge from scarcity.

Capital does **not** regenerate during the meeting. Start with 10, end
with whatever's left.

### Throw Under the Bus — the panic button with teeth

This is the move the game wants you to be *tempted* by. It costs zero
capital and instantly restores Project Status to Green — the single
most powerful save in the build. The price isn't capital. The price is
a **person.**

- The targeted NPC drops to **Hostile** and **cannot be recovered** for
  the rest of the run. No verb, no closing line, no apology moves them.
  Their stance icon gains a small **🔒 lock overlay**.
- They interject against you on **every remaining turn.** You traded a
  meter crisis for a permanent enemy at the table.
- It is morally gross, mechanically excellent, and exactly the lever a
  cornered PM reaches for at 11% Project Status with 2 capital left.
- Usage is tracked. Throwing **two or more** people under the bus in a
  single run surfaces in the stat sheet as its own quiet indictment
  (*"People sacrificed this meeting: 2"*), and unlocks nothing you'd
  want to admit to.

The verb exists because the *availability* of it is the horror. Every
desperate moment, it's right there, free, glowing.

---

## THE NEW LEGIBLE-STATE MECHANIC: **STANCE**

Each NPC sits at one of 4 stances toward the PM. Each stance is read by
**a corporate icon, not just a color** — so the board is parseable at a
glance even for colorblind players, and so the icons themselves do
satirical work. The chip sits next to each NPC's seat.

| Stance | Icon | Color | What it means in-meeting |
|---|---|---|---|
| **Supportive** | 📈 upward-trend arrow | green | They interject in PM's favor during others' turns. |
| **Neutral** | ☕ coffee cup | gray | They deliver their status. No interjections either way. |
| **Defensive** | 📁 file folder | yellow | They protect their own work. Interjections are CYA, not attacks. |
| **Hostile** | ⚖️ legal gavel / ❗ red exclamation | red | They actively undermine. Interjections during others' turns hurt. Risk of walkout. |

The iconography is the fastest read on the board. A player should be
able to glance at the table and instantly clock "two folders, one
gavel, one trend-arrow" without parsing color or text. The gavel
specifically signals *this has become a legal/HR matter* — the
escalation a corporate player learns to fear.

**Phase 1 sets starting stance** (this is the Receipts payoff):

```
Phase 1 A-choice  →  Supportive
Phase 1 B-choice  →  Neutral
Phase 1 C-choice  →  Defensive
Phase 1 D-choice  →  Hostile
```

Stance shifts during the meeting based on the PM's responses, capital
spending, and engagement.

---

## THE TURN LOOP

6 turns total. Order: **Brent → Tasha → Priya → Chad → Diane →
PM Closing.**

Each NPC turn has three live phases (~90 seconds total):

### Phase A — Status delivery (player-paced, line-by-line)

**There is no passive auto-stream.** The NPC delivers their status one
line at a time, and **the player sets the pace** with their own hands.
This removes the idle "watch a cutscene" state — on every single beat
the player is actively choosing to either let the lie continue or stop
it.

The rhythm:

- The active NPC speaks **one line.** The game **pauses.** A prompt
  appears: **`[Spacebar: Nod / Continue]`**.
- **Hit Spacebar → "Default Nod."** Leonard nods, the line is accepted
  without comment, and the NPC's next line plays. Free. The room reads
  every nod as agreement (see Capital Cowardice in Entertainment
  Principles — nodding through a lie has a visible cost).
- **Spend Capital → INTERRUPT.** The player cuts the NPC off
  **mid-sentence.** A loud **vinyl-scratch / record-stop SFX** fires
  and the **screen shakes** — the whole room stops. This jumps
  straight to the response window (Phase B), and the room *remembers*
  being interrupted (interrupting is a power move with social weight).

Each NPC status is **2–4 lines.** Nodding through all of them is
passive, free, and slowly damaging. Interrupting at any line is active,
costly, and high-impact. **The rhythm itself is the gameplay** — every
beat is a live "do I let this finish, or do I stop it now?"

While the NPC speaks, the usual triage inputs are still live — other
NPCs' interjection bubbles, the projector tick, and the **Slack
backchannel** (Exec pings + private DMs from Supportive/Neutral NPCs in
the room — see the Slack section). A backchannel DM mid-status is the
highest-value, highest-cost decision in the loop: act on it and you
spend attention + capital; ignore it and you keep your capital but burn
the ally who sent it. The player can engage any of these, ignore them,
or just keep nodding.

### Phase B — Response window (the glitch-timer)

Reached either by **nodding through the NPC's final line** or by
**spending capital to interrupt mid-status.** The PM's **4 response
options appear**, each showing:
- Capital cost (if any)
- Stance preview (e.g., "Brent → Supportive")
- Meter chips (e.g., "pissed −5, align +1") — same format as Phase 1
- ⏰ chip if the response queues a delayed effect

A visible 10-second timer bar sits under the options — **but it is only
stable when the room is calm.** As Pissed-Off climbs, the timer itself
destabilizes (see Hostile UI under Surreal Mechanics — it speeds up,
drops frames, and steals your thinking time). If it expires, the
default fires:

> **"PM nods along enthusiastically."**

Default nodding is free but the room interprets it as agreement —
costs stance with anyone who lied, costs nothing with anyone who told
the truth. The pattern of "PM defaulted" gets tracked and surfaces in
the final stat sheet.

### Phase C — Resolution + ripple (~3 seconds)

Chosen response plays out:
- Active NPC reacts (counter-line, stance updates)
- 1–2 OTHER NPCs may visibly react (their chips shift)
- Meters update
- Projector dashboard re-ticks
- Any delayed effects queue (existing `?? later` system from Phase 1)

Then next NPC's turn begins.

---

## TURN 6: PM CLOSING

After all 5 NPCs deliver, the **6th turn is the PM alone**. The whole
room turns to look at Leonard. Camera holds. Three closing options:

| Closing | Effect | Modifier |
|---|---|---|
| **Optimistic** — "Net-net we're tracking" | +projectStatus | Hostile NPCs visibly disengage. |
| **Honest** — "There are risks I want to flag" | +alignment, −projectStatus | Supportive NPCs back you. |
| **Evasive** — "Let me follow up offline" | Cheap, no swings | Exec pings: 🙂 |

**Closing is amplified by stance count at closing moment:**
- 4+ Supportive: the room nods, choice's effect is doubled.
- 0–1 Supportive: no one backs you, choice's effect is halved.

This is where the meeting **crystallizes**. Everything before was
positioning. This is the play.

---

# WIN / LOSE

## Win condition

At end of turn 6, the standup is **won** if:

✅ `projectStatus ≥ 60` (still Green/Yellow)
✅ `pissedOff < 75` (no walkouts)
✅ `meetingLoad < 80` (no calendar fallout)
✅ `timeMinutes ≤ 105` (no overrun past 10:45)
✅ **At least 3 of 5 NPCs are Supportive or Neutral at closing**

Wins promote to Phase 3 (when shipped). Until Phase 3 lands, the win
ending tells the player "Standup adjourned. Awaiting Executive Review."

## Fail states (5 distinct flavors)

| Fail | Trigger | The moment |
|---|---|---|
| **Walkout** | Any NPC's pissedOff hits 75 mid-meeting | NPC stands. Chair scrapes. *"I have a hard stop."* They leave. The remaining four stare at the empty chair. |
| **Spill** | Clock passes 10:45 with turns remaining | Door opens at 10:46. Another team enters: *"Sorry, we have the room."* Two meetings overlap. |
| **Crater** | projectStatus drops below 45 | Slack ping from Exec: *"Can we hop on a quick call?"* Zoom link to a meeting already in progress. |
| **Coup** | 3+ NPCs are Hostile at any point | Diane raises her hand. Room stops. *"I'd like to raise something."* Camera holds for 4 seconds. Cut to black. |
| **Ghost** | Player let 3+ turns default to nodding | NPC turns to PM. *"We were just talking to you."* The room waits in silence. End screen: *"PM was technically present."* |

Five characterized fails. Each is a comedy beat, not a punishment
screen. Players will want to see all five.

---

# THE RECEIPTS SYSTEM

The connective tissue between Phase 1 and Phase 2. Every NPC's status
line and opening interjections are a **function of
`phase1Final.npcChoices[id]`**.

4 variants per NPC × 5 NPCs = 20 opening status lines. Each branches
into 3–4 PM response choices = ~60–80 total response branches.

## Example: Brent's opening status (one of 5 NPCs)

| Phase 1 choice | What Brent says at standup |
|---|---|
| **A** (Asked for blockers) | "Status: blocked on the integration. PM heard me yesterday. We have a path." |
| **B** (Said "no blockers") | "No blockers. *(pause)* Per the PM's framing." |
| **C** (Offered to help) | "Status's solid. PM and I are paired on this one." |
| **D** (Escalated to leadership) | "Per our discussion yesterday, I'm escalating to the wider team. PM is supportive." |

Each variant **implicates the PM by name**. The standup is not just
NPCs talking — it's NPCs reading from a script the PM wrote, sometimes
verbatim, sometimes with editorial spin that lands worse than the
original.

## Receipts also carry:

- **Delayed-effect echoes** — if Brent's C delayed-effect fired in
  Phase 1, his opening references the sync: *"Following up from the
  sync we had…"*
- **Coping callbacks** — if `copingUseCounts.bathroom >= 2`, Diane's
  status line includes *"Quick HR aside, then I'll get to my update."*
- **Pissed-off room temperature** — if Phase 1 ended with `pissedOff ≥ 60`,
  the meeting opens cold. Brent doesn't make eye contact. Tasha's chair
  is angled away from the start.
- **Alignment-asymmetric content** — if Phase 1 alignment ≤ 2, nobody
  has anything to actually report. Long silences. Different difficulty.

---

# NPC PROFILES

Each NPC has a **fingerprint** — their interjection lines during OTHER
NPCs' turns are character-specific and dryly absurd. Each also carries a
**stance-driven audio fingerprint**: an ambient Foley loop whose texture
shifts with their mood, so the player can *hear* the room's temperature
while their eyes are on the projector. Passive-aggression rendered as
sound.

## Brent (Engineering)
- **Supportive interjection:** "+1, that's accurate."
- **Defensive:** *(continues typing on laptop, says nothing)*
- **Hostile:** "That's not what was said yesterday."
- **Beat:** Goes quieter as the meeting progresses. Types more.
- **Audio fingerprint — keyboard:** Brent's typing is always audible,
  and its texture is his mood. **Supportive:** soft, rhythmic, almost
  metronomic — an engineer in flow. **Neutral:** ordinary intermittent
  typing. **Defensive:** clipped bursts with long pauses (deleting and
  retyping). **Hostile:** heavy, erratic, mechanical keyboard
  *smashing* — each keystroke a small act of violence, mixed louder
  than feels comfortable. By the time Brent is hostile you can hear it
  from across the table and it is genuinely unpleasant.

## Tasha (Design)
- **Supportive:** "PM and I lined up on this Tuesday."
- **Defensive:** "Re: that — happy to align in a follow-up."
- **Hostile:** "Per the PM's direction, we iterated." ← legalistic
- **Beat:** References her Phase 1 commitment whenever possible. If
  you told her "make it pop," she's prepared exactly the iteration she
  warned you about.

## Priya (Product)
- **Supportive:** "Scope-wise this aligns with what we discussed."
- **Defensive:** "Worth flagging for the broader roadmap."
- **Hostile:** "Quick FYI — this might affect onboarding, mobile, and
  the legal footer."
- **Beat:** Sees the meeting as opportunity to expand scope. Each line
  is a sneak attack on the roadmap.

## Chad (Sales)
- **Any stance:** "**This is what I'm talking about!** 🔥"
- **Beat:** **Chad has one move.** His interjection is the same
  regardless of stance, regardless of topic. He's performing for the
  Exec even though the Exec isn't in the room.

## Diane (HR)
- **Supportive:** *(writes a note that is ostensibly positive but you can't read it)*
- **Neutral:** *(writes a note. Pen visible.)*
- **Defensive:** "I'd like to **circle back** to this in a 1:1." ←
  the kiss of death
- **Hostile:** "I'm going to flag this in our next sync."
- **Beat:** Speaks last. Her status is the only one that names
  specific people, which is a problem.
- **Audio fingerprint — the pen:** Diane's note-taking has dedicated
  Foley. **Supportive/Neutral:** a soft, distant pen-scratch, barely
  there. **Defensive:** firmer, more frequent. **Hostile:** the pen on
  paper becomes **uncomfortably loud and close-mic'd — a knife on a
  cutting board**, dragging, deliberate, scraping in the silences
  between lines. Mixed to spike player anxiety. When the room goes
  quiet and all you can hear is Diane's pen, you know you're in
  trouble — and you don't know yet what she wrote.

---

# SLACK — THE EXEC & THE BACKCHANNEL

The Slack panel (carried from Phase 1, right edge) is now a **live
second channel of pressure** running underneath the spoken meeting. Two
sources feed it: the Exec from outside the room, and the NPCs *inside*
the room.

## The Exec (Phase 3 setup)

The Exec is **not in the meeting room**. They're watching the dashboard
from another floor and pinging the PM via Slack.

The Exec sends **1–2 Slack DMs during the meeting**, gated on meter
movement. Always **inappropriately upbeat**:

- During your worst turn: *"How's it going? 🙂"*
- After you successfully lie: *"Heard the morning's going well 👍"*
- After a meter crashed: *"Quick 30-min sync today? Should be brief."*
- Mid-walkout: *"Loving the energy on this. Keep me in the loop."*

The Exec's cluelessness is the comedy. The player learns to dread the
🙂 emoji. This sets up Phase 3 where the Exec is finally in front of
the PM in person.

## The backchannel — DMs from inside the room

The bigger mechanic: **NPCs at the table DM the PM privately during
other people's turns.** What they say publicly and what they say in the
backchannel are different things — and the gap is the game.

This creates **information asymmetry** the player must manage:

- A **Supportive** NPC slides into the PM's DMs with intel. During
  Brent's status, **Tasha** Slacks: *"He's lying. The integration
  isn't tracking. Push back."* She just handed the PM a free read on
  Brent — IF the PM acts on it.
- Acting on a backchannel DM costs **attention and usually capital**
  (you have to engage it during the turn). Ignoring it is free… in the
  moment.
- **But loyalty has a ledger.** If the PM ignores Tasha's DM to save
  capital, **Tasha feels left hanging — her stance drops one tier**
  (Supportive → Neutral, or Neutral → Defensive). She extended trust
  and got read-on-delivery silence. People remember being ignored.

The tension: **the projector shows public metrics, the backchannel
carries private loyalties, and they pull in opposite directions.** The
"optimal" public play — conserve capital, nod through Brent — is often
the exact move that quietly burns your most useful ally. A great run
reads *both* channels at once.

### Backchannel rules
- Only **Supportive** and **Neutral** NPCs open backchannels. Hostile
  and Defensive NPCs have nothing to offer you privately — they're
  protecting themselves.
- Each DM has a **soft expiry**: actionable only during the turn it
  arrives. Let the turn end without engaging and the loyalty hit lands.
- The Slack unread badge **distinguishes Exec pings** (🙂 — ignorable)
  from **in-room DMs** (a colored dot keyed to the sender's stance —
  ignoring these has teeth). Telling them apart at a glance is a skill.

---

# CINEMATOGRAPHY & WORLD REACTIVITY

The board-state diagram earlier shows a static composition for clarity.
**The actual camera is not static.** Phase 2 borrows the psychological
camera language of *Papers, Please* and *Inscryption*: the framing
itself is a pressure gauge. The room closes in as the meeting goes
wrong, and the people in it use their bodies — heads, eyes, posture —
to apply social weight the dialogue never states out loud.

## Social IK & eye contact

NPC heads and eyes are driven by **Inverse Kinematics (IK)**, not baked
animation — so where they look is live and meaningful.

- **Default:** every NPC's head + eyes **track the Active Speaker.** The
  room watches whoever has the floor, the way a real meeting does. When
  the PM responds, heads swing to the PM. Attention is visible.
- **Supportive NPCs** occasionally flick their eyes to the PM during
  someone else's status — a micro-glance of "are you getting this?"
  (also the visual tell that a backchannel DM is incoming).
- **The Stare** — the payoff beat. When the player takes a **highly
  unpopular action** (Throw Under the Bus, a blatant lie that lands
  badly, summoning James), OR when the **response timer expires at 0
  capital with a lie hanging in the air**, every NPC **slowly turns
  their head to look directly into the camera — at the player — in
  total silence.** Active-Speaker tracking breaks. Nobody is looking at
  the table anymore. They are all looking at *you.* Held ~2.5 seconds.
  No dialogue. Just the HVAC drone and five (or more) faces. Then the
  meeting resumes as if nothing happened.

The Stare is the single most uncomfortable moment in the build and
costs almost nothing to produce (an IK target swap). It is the "the
room knows what you did" beat.

## Dynamic cinematography — the room closes in

The camera is driven by the live `pissedOff` meter. The calmer the
room, the more relaxed the framing. As pissedOff climbs, the room
becomes **physically claustrophobic:**

| pissedOff | FOV | Dolly | Feel |
|---|---|---|---|
| 0–30 | ~55° (wide, airy) | parked back | a normal meeting |
| 30–60 | narrowing toward ~45° | slow dolly-in begins | something's off |
| 60–75 | ~40° | dollied to the table edge | the walls are near |
| 75+ | ~35° (tight, compressed) | pushed in over the table | trapped |

- FOV narrowing + dolly-in **compresses the visible room** — walls
  creep into frame, the ceiling lowers, the table fills more of the
  screen. The player feels the air leave the room.
- The transition is **slow and continuous** (eased over seconds), never
  a cut — so it registers as mounting dread, not a camera move.
- It **eases back out** if the player recovers pissedOff, so the camera
  is a live readout of room temperature the player feels without reading
  a number.
- **Stacks with the Hostile-UI glitch-timer:** at high pissedOff the
  player is simultaneously boxed in by the camera AND losing thinking
  time on a stuttering timer. The two pressures compound.

## Why this matters

The mechanics (Triage / Capital / Stance) are the *what*. Cinematography
+ IK are the *felt experience*. Without them, this is a clean resource
game. With them, a bad turn doesn't just move a number — the room leans
in, the timer stutters, and five people slowly turn to look at you. That
is the difference between "good indie game" and "I had to put it down
for a second."

---

# SURREAL MECHANICS

The Standup escalates Phase 1's corporate-surreal hybrid by introducing
**mechanical surrealism**: weird things happen because of player actions
or game state, not as background atmosphere. Every weird beat has a
*because*.

## Design philosophy

All surreal moments come from one of three sources:

1. **Explicit player choice** — special verbs that appear as extra
   response options when their triggers are met
2. **Deterministic punishment for state** — monster-in-suit
   antagonists that arrive when triggered and stay
3. **A hostile interface** — the UI itself lies to the player,
   obstructs them, and destabilizes under pressure, exactly the way
   corporate tooling does

**No ambient weirdness, no RNG-only weird beats.** Each surreal event
is legible: the player can trace cause to effect.

The corporate tone holds throughout. The horror is **bureaucratic, not
supernatural** — uncanny-valley corporate. Every entity wears corporate
clothing. Every line is mundane corporate-speak. Nothing has fangs;
everything has a quarter-zip. The visual and auditory language is "this
could plausibly happen in a meeting" turned up 1.5 notches, then turned
*against the player.*

---

## PLAYER VERBS (7)

Appear as 5th/6th response options during regular turns when their
triggers fire. **Always visible** in the response list — greyed when
unaffordable or when trigger conditions aren't met. Hover tooltip
reveals effect + risk.

**Distinct visual treatment:**
- 🔴 **Red border** — risky moves (high downside potential)
- 🟡 **Gold border** — power moves (situational but useful)

### 🔴 SUMMON LEADERSHIP
- **Trigger:** `pissedOff >= 60` AND `projectStatus < 50`
- **Cost:** 3 capital
- **Outcomes:**
  - **50% "Leadership Listens"** — Alignment +5; ALL 5 NPCs flip to
    Hostile. You survive but alone.
  - **50% "James Arrives"** — Senior leadership, in the person of
    **James**, walks in. He is not a demon. He is worse: he is an
    executive, and no one invited him, and no one can ask him to leave.
    He takes the head of the table. He speaks in **unhinged, overlapping
    buzzwords** — multiple half-phrases layered on top of each other,
    none of them finishing: *"...so if we just lean into the AI-native,
    the customer-obsessed, the flywheel — the flywheel is basically the
    moat is the — what's our wedge here, what's the wedge..."*
    Project Status → 0 (Red). Slack ping: *"Loving the ambition.
    Let's circle back."* Meeting ends immediately.
- **Surreal payload:** The horror is **uncanny-valley corporate, not
  supernatural.** James looks almost normal — that's the problem.
  - **Patagonia vest** over a crisp button-down. The vest is the only
    casual thing about him and it reads as a threat.
  - His buzzwords play as **overlapping, layered audio tracks** — two
    or three James-voices at slightly different offsets, so you can
    never catch a full sentence.
  - When James **turns to look directly at the player, the camera FOV
    subtly distorts and warps** — a slow lens-breathing effect, the
    room stretching at the edges. It eases back when he looks away.
  - He never blinks on a human interval.
  - **Biggest single moment in Phase 2.** Players will replay
    specifically to summon James. Nobody in the room reacts to James
    as abnormal. That's the joke. They've met James before.

### 🔴 AI-PIVOT
- **Trigger:** `projectStatus < 60`
- **Cost:** 3 capital
- **Outcomes (33% each):**
  - **"Board loves it"** — projectStatus +15, alignment +2
  - **"NPCs see through it"** — projectStatus -10, all stances tick
    toward Hostile
  - **"Exec wants more"** — projectStatus +5, but queued delayed
    effect: *"Tell me more about this AI angle. Can we get a partner
    deck?"* → meetingLoad +25 in 2 turns
- **Surreal payload:** Projector flickers, briefly shows a slide
  titled "AI" with no other content (0.4s), snaps back.

### 🔴 MATCH CHAD'S ENERGY
- **Trigger:** Chad is the active speaker
- **Cost:** 1 capital
- **Effect:** Chad → Supportive immediately. ALL other NPCs shift one
  tier toward Hostile — they watched you do that.
- **Surreal payload:** PM does a small fist-pump. Ceiling lights pulse
  once. Diane writes the longest single note of the meeting.

### 🟡 QUOTE DIANE'S POLICY
- **Trigger:** Diane stance is Hostile
- **Cost:** 2 capital
- **Effect:** Diane flips Hostile → Neutral (she respects the bit).
  Queues delayed effect: *"1:1 Scheduled — Diane wants to discuss
  your tone"* (fires next turn).
- **Surreal payload:** Diane's notebook briefly shows the policy text
  in the *player's* handwriting, not hers. Then flips back to her own.

### 🟡 SPEC IT OUT (Brent's special)
- **Trigger:** Brent is active OR has Supportive stance
- **Cost:** 1 capital
- **Effect:** Brent dives deep technical. ALL other NPC stances drop
  to Neutral regardless of starting position — they checked out.
  Project Status -3 (room lost the project thread).
- **Surreal payload:** A whiteboard materializes next to Brent covered
  in architecture diagrams. Arrows pointing at other arrows.

### 🟡 REFERENCE THE PERSONA (Priya's special)
- **Trigger:** any time
- **Cost:** 1 capital
- **Outcomes:**
  - **50% Room nods** — alignment +2, projectStatus +3
  - **50% Called out** — pissedOff +5, projectStatus -3
- **Surreal payload:** Stock-photo persona slide appears on the
  projector ("Marketing Marcia," "Procurement Pete," "Enterprise
  Erica"). Bulleted "Pain Points" are clearly invented.

### 🟡 START A SLACK THREAD ABOUT IT
- **Trigger:** any time
- **Cost:** 1 capital
- **Effect:** Current turn's pissedOff effect is **halved**, but
  spreads across the next 2 turns instead of landing immediately.
- **Surreal payload:** Every NPC silently looks at their phones. Their
  lips move. **No sound.** A Slack thread populates in the side panel.

---

## HOSTILE UI — THE INTERFACE IS NOT YOUR FRIEND

The purest source of bureaucratic horror: **the game's own UI turns
against the player.** It lies to them, obstructs them, and destabilizes
under pressure — exactly the way real corporate tooling does. None of
this is acknowledged in-fiction. The dashboard simply *behaves this
way*, and the player slowly realizes the interface is not on their
side. Four behaviors:

### The dashboard gaslights you (buzzword cover-up)
When the player reaches for a buzzword escape hatch — **AI-Pivot**, or
any "reinforce the lie" response — the UI **covers for them, against
their own interest.**
- The projector dashboard **forces itself to read GREEN**, regardless
  of the real Project Status underneath.
- The Exec fires a reflexive **"👍"** in the Slack panel.
- Both are lies. The actual internal number keeps falling behind the
  green mask. **The player is being congratulated for starting a
  fire.**
- The truth only resurfaces at closing, when the mask drops and the
  real number is revealed — often catastrophically lower than the
  dashboard implied all meeting. The gap between displayed-Green and
  actual-status is the horror.

### Chad blocks the screen (interjection occlusion)
When Chad interjects, his text bubble doesn't politely float — it
**physically expands**, growing across the board until it **covers the
dashboard and blocks the player's view of their own Capital meter.**
- The player **cannot see how much capital they have left** while Chad
  is talking.
- To clear it, they wait him out or spend capital to cut him off — and
  they're spending a resource they can no longer see.
- Chad is, mechanically, a **denial-of-information attack in a
  quarter-zip.** His enthusiasm is an obstruction.

### The Exec Slack ambushes your hand (notification obstruction)
If the Exec Slacks during a **high-tension moment** (response timer
running, a meter near a cliff), the notification does NOT dock politely
in the side panel.
- It **pops up directly over the player's response buttons.**
- The player must **dismiss it before they can act** — burning precious
  seconds of the live response timer.
- The Exec's message is always inconsequential (*"How's it going?
  🙂"*). **The interruption is the payload, not the content.** The Exec
  costs you time simply by existing at the wrong moment.

### The timer destabilizes under pressure (Pissed-Off glitch)
The 10-second response timer is only stable when the room is calm. As
the room's **Pissed-Off meter climbs, the timer visibly degrades:**
- It **speeds up, drops frames, stutters, and skips.**
- At max Pissed-Off, 10 "seconds" might elapse in ~6 real ones, the bar
  lurching forward in visible jumps.
- High tension **literally steals the player's time to think.** The
  room's hostility is rendered as a degradation of the player's own
  interface — the angrier the room, the less functional your tools.

**Why this works:** the player can't fully trust what they're looking
at. The dashboard might be lying. The capital meter might be hidden.
The timer might be cheating. That low-grade paranoia is the
bureaucratic-horror texture the rational version of this design was
missing.

---

## MONSTER-IN-SUIT ANTAGONISTS (2, MAX ONE per run)

When triggered, a monster enters the meeting room and **stays for the
rest of the run**. They have stance chips like regular NPCs and their
own interjection pools.

> **Cast trim (review round 2):** the original four antagonists were cut
> to two. **The Investors** (success-paradox) and **Compliance**
> (cross-run veteran) were dropped — they were the lowest-ROI builds and
> tonally blurred with the others. The two survivors are built deep:
> **McBain Consulting Group** (failure path) and **Mark, the Founder**
> (chaos wildcard). James (Senior Leadership) is NOT a third antagonist —
> he's the outcome of the Summon Leadership verb (see above).

### Trigger priority

Only the FIRST qualifying trigger fires. Once a monster has spawned, no
others can.

1. **McBain Consulting Group** — deterministic threshold trigger
   (`alignment <= 3`). Fires the moment alignment craters.
2. **Mark (the Founder)** — 20% RNG per turn while pissedOff > 50. Only
   fires if McBain hasn't already spawned.

---

### McBAIN CONSULTING GROUP (failure path)
- **Trigger:** `alignment <= 3` at any point during the meeting
- **Entrance:** Two figures **slither** through the conference room
  door. Tailored dark suits. **Faces don't quite hold still** —
  features migrate every few seconds. Hands look like they were
  *taught* how to look like hands. Badge lanyards read "McBain."
- **Effect:** They sit. They stay. **The win condition expands to 6
  entities** (3/5 NPCs + 1/2 McBain partners minimum). Game ~3x harder.
- **Stance behavior:** Starts Defensive. ONLY moves toward Supportive
  when you Endorse them — any other action increases suspicion. Very
  hard to align. Nuclear-grade allies if you do.
- **Interjection lines** (random):
  - *"We must **OPTIMIZE**."*
  - *"What is the **return on this meeting**?"*
  - *"Have you considered **doing more with less**?"*
  - *"There is a **synergy** we are not yet **monetizing**."*
  - *"This headcount has a **utilization** problem."*
- **Visual cue:** When they speak, the ceiling panel above them dims
  ~30%. The conference room subtly cools.

### MARK, THE FOUNDER (chaos wildcard)
- **Trigger:** 20% RNG per turn while `pissedOff > 50`
- **Entrance:** Mid-turn, the door opens. **Mark** walks in — a figure
  in a **hoodie among the suits**. Sits at the head of the table
  opposite the PM. Coffee cup with his own face on it. *"Sorry I'm
  late — just got back. What did I miss?"*
- **Effect:** **ALL NPC stances RESET to Neutral.** Your alignment
  work is erased. From this point on, every response option gets a
  4th choice: *"Yes, and Mark mentioned…"* — gives alignment +5 but
  introduces a delayed effect that carries into Phase 3.
- **Stance behavior:** Always Neutral. Above the politics.
- **Voice tic:** Never finishes a sentence. Trails off and looks at
  someone else.
- **Visual cue:** The hoodie among suits IS the joke. The face-mug is
  visible at all times.

---

## How surreal mechanics integrate with the core loop

These don't replace Triage / Capital / Stance. They **slot in**:

- **Player verbs** appear as additional response options during regular
  turns, gated on triggers. Same UI as the existing 4 choices but with
  red/gold border treatment.
- **Monster antagonists** add entities to the stance system. McBain
  partners get their own stance chips. Mark (the Founder) doesn't have a
  chip (always Neutral).
- The player's core verbs (Listen, Endorse, Interject, Redirect, Pivot,
  Take ownership) are **always available**. Surreal options are
  *additions*, never replacements.

## Run-shape examples

**Run A — A "clean" Phase 1 win, no monster:**
- Player enters with all NPCs Supportive/Neutral
- No alignment crater, no pissed-off spiral
- No monster spawns. Player verbs available when triggered (probably 2–3
  fire over the run); James may be summoned if the player gambles.

**Run B — low alignment, the consultants land:**
- alignment drops to 3 by turn 3 → **McBain Consulting Group spawns**
- Player now juggling 6 entities. Plays out the rest with surreal
  options peppered in.

**Run C — the room turns, the Founder wanders in:**
- pissedOff climbs past 50; the RNG hits on turn 4 → **Mark arrives**
- All stances reset to Neutral. The "Yes, and Mark mentioned…" option
  opens up — fast alignment now, a Phase 3 debt later.

**Run D — desperation gamble:**
- pissedOff ≥ 60 and projectStatus < 50 → player burns 3 capital on
  **Summon Leadership**. Coin flip: the room caves, or **James** walks
  in and ends the meeting.

Across replays, a player sees at most one monster per run plus whatever
verbs they trigger — so the surreal roster stays rare and notable.

---

# PLAYABILITY PRINCIPLES

The board has many simultaneous elements. These principles keep it
readable.

## One thing glows at a time
The **active speaker glows**. Everything else dims to ~70%. When an
interjection bubble pops elsewhere, the glow briefly redirects. Player's
eye always knows where to look first.

## Spatial layout matches mental model
- **Capital meter** at bottom-center, near the player's hands
- **Stance chips** ATTACHED to each NPC — they are the NPC's status
- **Time bar** under the projector — pressure comes from the deck
- **Slack** on right edge, same as Phase 1 (muscle memory)

## Default to "doing nothing" works
If the player freezes, **time advances and Leonard nods**. The meeting
completes whether they participate or not. The fail flavor is "Ghost,"
which is characterized, not random. No confusion-induced game-over.

## Tutorial inside the fiction
**Turn 1 is the tutorial**. Brent's status streams. A thought-bubble
above Leonard reads *"You could interject here. Costs capital."* — only
on the first relevant moment. Each verb introduced once, in context.
By turn 2 the player has the system.

## Three difficulty layers, same scene
- **Easy**: do nothing, watch the meeting unfold (Ghost fail is
  characterized, not punishing)
- **Medium**: pick your response when prompted
- **Hard**: engage interjections live during streams, spend capital
  strategically

Same scene plays at all three depths. Cheap layer to drop in. High
skill ceiling for replay.

---

# ENTERTAINMENT PRINCIPLES

A 10-minute experience needs **dopamine every 4–6 seconds**.

## Constant micro-rewards
Every action produces visible reaction within 200ms:
- Interject → chip color shifts + "−1" float + capital snap + audio click
- Endorse → sparkle + "+1" + soft chime
- Default-nod → avatar bobs + caption *"PM nods along."*

The board is alive.

## Capital cowardice feedback
The game watches whether you have the *means* to act and choose not to.
It does not nag with text — it makes you feel it.
- **The lie-pulse** — when an NPC delivers a blatant lie AND the player
  has enough capital to interject, the **Capital meter pulses
  aggressively** — a hard, insistent throb. The game is pointing at the
  lie and at your full wallet at the same time: *you could stop this.*
- **Cowardice darkening** — if the player **Default Nods through that
  lie anyway**, the room's lighting **subtly darkens** by a notch. Each
  cowardly nod dims the room a little further. A fully spineless run
  ends in near-dusk, and **no one in the room ever comments on it.** The
  lighting is a moral ledger nobody acknowledges — the player is the
  only one who can see how dark it's gotten, and they did that.
- The pairing is the point: the pulse is the temptation, the darkening
  is the consequence. Together they make *inaction* feel like an active,
  visible choice — which is the whole thesis of the standup.

## The room as antagonist (eye contact + the closing-in camera)
The 3D space does emotional work the UI can't (full spec in
Cinematography & World Reactivity):
- **The Stare** — take a highly unpopular action (Throw Under the Bus,
  a lie that lands badly, summon James), or let the timer expire at 0
  capital with a lie in the air, and **every NPC slowly turns to look
  directly at you — into the camera — in dead silence** for ~2.5
  seconds, then resumes as if nothing happened. The single most
  uncomfortable beat in the build.
- **The room closes in** — the camera FOV narrows and dollies toward
  the table as pissedOff rises. The player feels boxed in without
  reading a meter. At high pissedOff this compounds with the stuttering
  glitch-timer: trapped *and* rushed.

Both cost almost nothing to build (an IK target swap, a tweened camera)
and they are the difference between watching a number change and
feeling a meeting go wrong.

## Earned "oh shit" moments
- **Capital bankruptcy** — at 0 capital, the Interject button visibly
  shakes and rejects clicks. Caption: *"Save your capital. Pick your
  battles."* The game teaches by failing to comply.
- **Stance cascade** — flip Brent Supportive in turn 1 → his
  interjections in turn 2 now HELP you. Discovery.
- **Projector tick** — when the PM lies, dashboard ticks down 1 in
  real time. The room can't see it. The player can. Truth and lies
  have visible spread.

## Combos
- Supportive Brent + Supportive Tasha = **"Coalition" badge** appears.
  Reduces interjection costs by 1. Strategic depth via one piece of UI.
- 3 Hostile = **"MUTINY RISK"** flashes briefly. Telegraphed danger.

## End-of-meeting stat sheet
Win or lose, closing screen shows quantified vibes the player didn't
know were tracked:
- "Capital spent: 8 / 10"
- "Brent's stance: Hostile → Supportive (rare)"
- "Slack pings ignored: 4 of 6 (judgmental)"
- "Backchannel DMs left on read: 2 (they noticed)"
- "Truthful responses: 1 of 5 (consistent)"
- "People sacrificed this meeting: 2 (we have notes)"
- "Nods through a known lie: 5 (the room got noticeably darker)"

Both replay fuel ("next time I'll save capital") and comedy
("judgmental").

## The final punchline — hardcoded, every screen, win or lose
Below every nuanced metric above — separated by a rule, after all the
careful accounting of how perfectly the player navigated the meeting —
sits one final, immovable line:

> ### Actual Business Value Generated: **$0.00**

It reads **$0.00 regardless of outcome.** A flawless run and a total
collapse generate exactly the same amount. It is never explained, never
caveated, never animated — it is simply always there, at the bottom,
in the same font as a real financial figure. It is the thesis of the
entire game in one line: all of this — the capital, the alignment, the
stances, the lies, the people thrown under the bus — produced nothing.
The meeting was the work. The work was the meeting. **$0.00.**

---

# COMEDY-IN-MECHANICS PRINCIPLES

The humor lives in the systems themselves, not in surreal dressing.
Dressing is icing — these are the cake.

## The default-nod
Idle = Leonard physically nods. Captions escalate:
- 1st nod: *"PM nods along enthusiastically."*
- 2nd: *"PM continues to nod."*
- 3rd in a row: *"PM is now nodding so much it has become a physical condition."*

Nodding through Brent's lie makes Brent Supportive (he thinks you back
him) while Diane's pen writes faster. **Inaction has narrative shape.**

## Capital stinginess as comedy
Players hoard capital. The hoarding is the joke.
- Brent says something mildly annoying. Worth 1 capital? Usually no.
  You let it slide. **You feel like a coward.** That's funny.
- Save all 10 for the end → run out anyway → finish muted. *"PM had
  a lot to say earlier."*

## Stance chips with attitude
Chips micro-emote on transition:
- Neutral → Defensive: chip "crosses its arms"
- Defensive → Hostile: chip turns its back
- Hostile → Supportive: chip looks stunned (briefly shows "?")
- Hostile NPC's chip vibrates with annoyance during silences

The board is a comedy ensemble.

## Failures as character beats
See the 5 fail states table above. Each is a comedy moment, not a
penalty screen. Players will want to **see all five.**

## The 10-second timer as physical comedy
- Last 3 seconds: bar turns red, faint heartbeat audio
- Last 1 second: caption *"PM is about to say nothing."*
- Click in last 100ms: small "phew" exhale SFX

---

# ENDINGS (5)

1. **Standup Adjourned** — clean win, all conditions met. Promote to
   Phase 3 with momentum.
2. **Adjourned, Aligned** — won with high pissedOff (the pyrrhic variant).
   Promote with a tarnish.
3. **Walkout** — fail. Phase 3 starts with one chair empty.
4. **Meeting Spill** — fail. Phase 3 starts late. Calendar tax.
5. **Coup** — new fail. Diane formally escalated. Phase 3 starts with
   the project flagged Red.

(Ghost is a sub-variant of Walkout in scoring — surfaces in the stat
sheet but uses the Walkout ending shell.)

---

# ACHIEVEMENTS (11)

Phase 2 adds to the existing achievement system (`ACHIEVEMENTS` array
in `src/content/achievements.ts`). All persist to the same localStorage
key — show up in the HR FILE landing-page viewer.

**Core achievements (8):**
- **Read the Room** — won with 5/5 Supportive at closing
- **Capital Reserve** — won with 7+ capital remaining (efficient triage)
- **All-In** — won having spent ≥9 capital (engaged everything)
- **Caught In Three Lies** — survived after 3+ NPCs surfaced contradictions
- **Per My Last Email** — picked Honest closing despite low projectStatus
- **Ghost** — defaulted on 3+ turns and somehow still survived to closing
- **The Final Word** — used PM Closing to flip an Adjourned win into Aligned-Aligned (pyrrhic)
- **Designated Survivor** — won a run after throwing 2+ people under the bus

**Surreal-mechanic achievements (3):**
- **Optimized Beyond Recognition** — won the meeting after McBain Consulting Group spawned
- **Yes, And Mark** — used Mark's "Yes, and Mark mentioned…" option 3+ times in a run
- **You've Met James** — triggered the James outcome of Summon Leadership. (It ends your run on the spot — this is a "you saw it" badge, the dark mirror of a win. Players will gamble for it on purpose.)

---

# BUILD PLAN

Phase 2 is one continuous scene with no walking. Most of Phase 1's
engine code transfers (Three.js scene, lighting, audio, dialogue
framework, meters, achievements, Slack panel, delayed effects). New
work breaks down as follows.

## Build A — State bridge (1 day)
- Add `phase1Final` slice. Write on Phase 1 win. Read on Phase 2 mount.
- Hard-gate Phase 2 entry on the slice's existence.
- "Continuity Brief" intro card showing the player their Phase 1 trail
  before the meeting starts (NPC choices + final meters + ending type).

## Build B — Scene, camera & presence (3–4 days)
- New `StandupRoom.tsx` — reuse Synergy meeting room geometry from
  Phase 1, extend with proper boardroom table + 6 chairs + seated
  NPCs.
- New `StandupCamera.tsx` — **table-side framing driven by `pissedOff`:**
  FOV lerps ~55° → ~35° and the camera dollies toward the table as the
  room sours, easing back on recovery (see Cinematography table). No
  third-person follow, never a hard cut — all eased/continuous.
- **NPC head/eye IK rig** — heads + eyes track the Active Speaker by
  default; supports a one-call "look at camera" target swap for **The
  Stare** (every NPC → player, ~2.5s, triggered by unpopular actions or
  a 0-capital lie on timer-expiry).
- Seated GLB poses (we already have `_Sitting.glb` variants).

## Build C — Stance + Capital systems (2 days)
- `phase2Store` extending the existing Zustand store.
- `stance: Record<NPCId, 'Supportive' | 'Neutral' | 'Defensive' | 'Hostile'>`
  — seeded from `phase1Final.npcChoices`.
- **`stanceLocked: Set<NPCId>`** — NPCs thrown under the bus; their
  stance is pinned Hostile and ignores all future shift attempts.
- `capital: number` — starts at 10, decrements per intervention.
- Core verbs incl. **Throw Under the Bus** (0 capital → projectStatus
  snaps to Green threshold, target added to `stanceLocked`, target → Hostile)
  and **Take Ownership** (its mirror). Track `bussedCount` for the stat sheet.
- `currentTurn`, `turnQueue`, `responseTimer`, `interjectionQueue`.

## Build D — Turn loop UI (3–4 days)
- **Player-paced line-by-line delivery:** one NPC line → pause →
  `[Spacebar: Nod / Continue]` prompt. Spacebar advances; spending
  capital INTERRUPTS mid-sentence with a vinyl-scratch SFX + screen
  shake, jumping to the response window.
- Floating interjection bubbles next to NPC seats.
- Response window with 4 options + capital cost + stance preview.
- **Glitch-timer:** 10s response bar that speeds up / drops frames /
  stutters as Pissed-Off climbs (see Hostile UI).
- **Stance chip component with corporate iconography** (📈 trend / ☕
  coffee / 📁 folder / ⚖️ gavel) + 🔒 overlay for bus-locked NPCs +
  micro-emotes on transition.
- **Capital meter** with: stinginess feedback, the aggressive lie-pulse
  (when a lie lands and the player can afford to interject), and the
  cowardice-darkening hook (room lighting dims a notch per nod-through-
  a-lie).
- Projector dashboard with live tick.

## Build E — Receipts content (5–6 days)
- 5 NPCs × 4 Phase-1-choice variants = 20 opening status lines.
- For each: 3–4 PM responses with effects + counter-lines = 60–80
  response branches.
- Per-NPC interjection lines for all 4 stances.
- Exec Slack ping pool, gated on meter movement.
- **Backchannel DM pool** — per Supportive/Neutral NPC, the private DMs
  they send during OTHERS' turns (intel, warnings, "push back"). Plus
  the loyalty-drop-on-ignore hook in `phase2Store` and the stance-keyed
  unread-badge differentiation in the Slack panel.
- Voice pass to maintain deadpan-corporate register (see Tasha pass
  notes in main blueprint).

## Build F — Closing turn + endings (2 days)
- PM Closing turn (3 options, stance-modified).
- 5 ending screens (one per fail state + 1 win + 1 pyrrhic variant).
- Stat sheet on closing screen — quantified vibes.
- Update Phase 1's ending screen "What's Next" CTA to point to Phase 2
  unlock when conditions met.

## Build G — Achievements (1 day)
- 7 new achievement entries.
- Conditions wired against `phase1Final` + Phase 2 run state.
- "NEW" badges work the same as Phase 1.

## Build H — Polish pass (3–4 days)
- Coalition badge UI (when 2 Supportive NPCs).
- Mutiny Risk warning (when 3 Hostile).
- Chip micro-emote animations.
- Default-nod animation + escalating captions.
- Capital bankruptcy button-shake.
- Failure cinematics (walkout chair scrape, coup hand-raise, etc.).
- **Stance-driven Foley** — Brent's keyboard (rhythmic → mechanical
  smashing) and Diane's pen (distant scratch → close-mic'd knife-on-
  cutting-board) cross-fade by stance. Per-stance loops + smooth
  gain/texture crossfades. The room's audio bed becomes a live readout
  of mood.
- **The Stare** mix — drop the room to just HVAC + held silence for the
  ~2.5s beat, then restore. Cowardice-darkening lighting ramp.
- Audio: heartbeat under final 3s of timer, exec ping variants.

## Build I — Surreal mechanics (3–4 days)

**Player verbs (7) — UI + content:**
- Special response-option type with distinct visual treatment:
  red border = risky, gold border = power. Same 4-slot layout as
  normal choices but visually separated.
- Trigger-gating logic per verb. Hover tooltips for effect + risk.
- Result copy + counter-line for each verb's outcome paths.
- **James prefab for Summon Leadership** — senior leadership walks in
  (Patagonia vest over button-down, GLB). Biggest single moment in
  Phase 2. Layered/overlapping buzzword audio (2–3 offset voice tracks).
  **Camera-FOV warp shader** that fires when James's head faces the
  player (slow lens-breathing distortion, eases back when he looks
  away). Off-interval blink. NPCs do not react to James.

**Monster antagonists (2) — meshes, animations, integration:**
- **McBain Consulting Group:** slithering door-entry animation +
  face-instability shader (features migrate every few seconds) +
  ceiling-panel dim effect when they speak. Two stance chips wired into
  the existing stance system. Win condition adapts to 6 entities.
- **Mark (the Founder):** hoodie GLB + face-mug coffee-cup prop +
  door-open entrance. "Yes, and Mark mentioned…" option added as a 4th
  response slot for the rest of the meeting.

(Cut in review round 2: the Investors and Compliance antagonists — saves
the projector Zoom-blur shader + cap logic and the gray-figure GLB +
paper-distribution + cross-run localStorage wiring. Roughly a day of
build removed, which is why this phase dropped 4–5 → 3–4 days.)

**Trigger priority logic** in `phase2Store`: first qualifier wins,
once-per-run enforcement, McBain (deterministic) before Mark (RNG).

**Audio:** James's layered buzzword voices, hoodie-shuffle for Mark,
the cooling-room tone for McBain.

## Build J — Hostile UI (2–3 days)

The interface-turns-against-you layer. Mostly UI/shader work, no new
3D assets:
- **Dashboard gaslighting:** when a buzzword/lie response fires, force
  the projector to render GREEN while the true `projectStatus` keeps
  falling underneath. Auto-fire a fake Exec "👍". Reconcile (drop the
  mask) at closing.
- **Chad occlusion:** Chad's interjection bubble animates to expand
  across the board, covering the dashboard + hiding the capital meter
  until dismissed.
- **Exec notification ambush:** during high-tension windows, dock the
  Exec Slack toast directly over the response buttons; require dismiss
  before input registers; keep the response timer running.
- **Timer destabilization:** drive timer tick-rate + frame-drop /
  stutter rendering off the live Pissed-Off value (calm = smooth, hot
  = lurching and fast).

**Total estimate: 26–34 working days** if Phase 1's engine pieces
transfer cleanly. (The cinematic layer — IK rig, dynamic camera,
stance Foley, backchannel — is what moves Phase 2 from "good indie
game" to "psychologically intense.")

---

# OPEN QUESTIONS

Decide before content/build:

1. **Should the Continuity Brief card show MECHANICAL info (final
   meters, NPC choices) or narrative info (a 3-line "previously on")?**
   Current draft: both — small mechanical chip strip + 2-line narrative
   intro. Player needs to see what's loaded but not have to read tables.

2. **How does the player ENTER the meeting?** Cold-open seated, or a
   short transition (1–2 second camera move from the office)?
   Current draft: cold-open with a 1.5s fade-in from the Phase 1 ending
   screen.

3. **Should Phase 2 unlock be visible on the landing page CareerStats
   viewer (HR FILE)?** Current draft: yes — once unlocked, the section
   gains a Phase 2 row with its own achievement subset.

4. **Landing page roadmap** — Phase 2 is currently labeled "4:30
   EXECUTIVE REVIEW" in the WhatsNext component. Needs to swap to "THE
   STANDUP" and Phase 3 moves to Exec Review. Single content edit, do
   it now or wait until Phase 2 ships.

5. **Does the player practice mode help, or does it dilute?** A "free
   play" mode that ignores `phase1Final` and lets you sample Phase 2
   without a Phase 1 win. Current draft: NO — the receipts are the
   point. Hard continuation is the design.

6. **Is Capital legible enough at 10 dots?** Could be 5 bigger
   icons, or a numeric badge. Current draft: 10 small dots, but
   prototype-test this first before content lock.

---

# COMPANION DOCS

- Main game blueprint v0.3: `/Users/rebeccaleung/blocked/Blocked_Game_Blueprint.md`
- Phase 1 content pack: `/Users/rebeccaleung/blocked/Blocked_Standup_Content_Pack.md`
- 3D / prompt pack: `/Users/rebeccaleung/blocked/Blocked_Claude_3D_Prompts.md`
- **This doc:** `/Users/rebeccaleung/blocked/Blocked_Phase2_Blueprint.md`
- Phase 2 content pack (to be written): the 20 receipts × 3–4 response
  branches = ~60–80 line dialogue tree. Plus per-NPC interjection pools
  per stance. Plus Exec Slack pool. Plus stat sheet copy. Plus failure
  cinematics. **Recommend writing this AFTER prototyping Build B + C +
  D so the dialogue is informed by what feels good to play.**

---

# OPEN-ENDED NEXT STEPS

Once this blueprint is locked, natural sequencing:

1. **Build A + B** (state bridge + scene) — gets you to "I can sit in
   the room and see seated NPCs." 3 days. Tactile.
2. **Build C + D** (stance + capital + turn loop UI) — gets you to
   "one NPC turn plays end-to-end with placeholder content." 5 days.
   First playable.
3. **Write Phase 2 Content Pack** with the actual play-feel of (2) in
   hand. Avoids writing dialogue blind. 4–5 days of content.
4. **Build E + F + G** in parallel (content + closing + achievements). 
5. **Build H** as the closing polish pass.

Total: ~3 weeks of focused build for Phase 2 to ship.
