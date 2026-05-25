# Blocked — Game Blueprint v0.3

## One-line pitch

**Blocked** is a dry corporate satire mini-game where you play an earnest project manager at **Alignly**, trying to keep the **Customer Happiness Portal Refresh** project Green/Yellow until the 4:30 Executive Review while the office slowly becomes surreal from accumulated workplace rage.

## Core promise

A 30–60 minute playable experience where every corporate solution technically helps the project while quietly making humans more miserable.

## MVP definition

**Blocked: Pre-Standup Alignment** is the first vertical slice: a 5–10 minute browser-playable third-person office survival scene.

The in-game phase is called **Pre-Standup Alignment** because the player is going *desk-to-desk* extracting fake alignment from each NPC before the actual standup meeting. The real "Standup" (everyone in a meeting room together) is reserved as a future phase.

The MVP is not the full workday. It is the playable proof that walking around Alignly, extracting fake alignment from blocked coworkers, and keeping the dashboard Green/Yellow is funny, tense, and replayable.

### MVP scope cut: no 4:30 Executive Review

The full game ends at the 4:30 PM Executive Review. **The MVP cuts that entirely.** The Standup Prototype ends the moment the five required NPCs are handled (~10:15 AM in-game). The Executive Review remains in the blueprint as future scope and is teased in the ending screen, but it is not implemented in v1.

Rationale: the standup is already a complete loop. Adding the 4:30 review doubles the build effort and the playtest length without strengthening the core proof. Cut it now, ship the standup, add the review later if the standup lands.

### MVP player fantasy

The player is not here to solve problems. The player is here to survive standup by weaponizing corporate language.

The ideal player thought pattern is:

> “The honest answer is probably correct, but the corporate answer might keep this Green.”

### MVP acceptance criteria

The MVP is playable when:
- Player can walk around a compact office in a third-person / over-the-shoulder view.
- Player can approach and interact with at least five required NPCs and two optional office objects.
- Each interaction has 3–4 authored response choices.
- Choice buttons preview consequences before selection.
- Choices update Time, Project Status, Pissed-Off, Meeting Load, and Corporate Progress.
- Meters change the office state through lighting, sounds, toasts, object behavior, or NPC barks.
- Calendar Apocalypse can trigger and is recoverable once.
- At least three endings are implemented.
- A non-developer can complete a playthrough without instructions beyond on-screen prompts.

## Title

**Blocked**

Subtitle options:
- A very normal project management experience.
- No blockers, just dependencies.
- Keep it Green until 4:30.

## Company

**Alignly**

A fake SaaS company with a painfully plausible mission:

> Alignly helps teams align on alignment.

## Main project

**Customer Happiness Portal Refresh**

No one fully understands it. Everyone agrees it is important.

## Tone

**Dry corporate satire that slowly becomes surreal.**

Rules of tone:
- Everyone acts professional and sincere.
- The UI should be deadpan, not wacky.
- The more absurd things get, the more corporate the language becomes.
- The comedy should come from specificity: blockers, standups, performance reviews, vague executive feedback, scheduling, and passive-aggressive status management.

## Player character

An **earnest PM slowly becoming dead-inside**.

Arc:
1. Starts the day genuinely trying to help.
2. Learns that every solution creates another meeting.
3. Begins using corporate language defensively.
4. By 4:30, can either survive the Executive Review or trigger total escalation.

## Main objective

Keep the project **Green or Yellow** until the **4:30 Executive Review** while preventing full office chaos.

For the MVP, narrow this to:

> Finish the 9:00am standup with the Customer Happiness Portal Refresh still Green or Yellow, enough corporate progress generated, and the office below full meltdown.

The player wins if:
- Project Status is Green or Yellow at 4:30.
- The office has not entered full meltdown.
- Enough “corporate progress” has been generated.

Corporate progress includes:
- blocker renamed as dependency
- Jira ticket created
- owner identified-ish
- stakeholder aligned
- meeting scheduled
- follow-up sent
- decision deferred
- risk accepted
- requirements clarified enough to avoid responsibility

## Loss condition

The office goes into chaos when the collective **Pissed-Off Meter** gets too high.

Failure states:
- Full Escalation
- Meeting Singularity
- Reply-All Collapse
- HR Intervention
- Project turns Red before Executive Review

## Visible meters

Keep the visible meters limited. The comedy should feel like survival, not spreadsheet management. Hidden values can exist, but the HUD should remain readable at a glance.

### HUD inventory (v1)

Five visible meters. Each renders as a labeled bar with threshold zones color-coded so the player intuitively sees how close they are to a chaos trigger before they click a choice:

- **Time** — 9:00 AM start, ticks up per action.
- **Project Status** — Green / Yellow / Red color band.
- **Pissed-Off** — bar shading from neutral → red, with named tiers (Fine, Slightly Tight Smile, Per My Last Email, Looping In Leadership, Glassdoor Draft, Meltdown).
- **Meeting Load** — same treatment, named tiers up to Calendar Apocalypse.
- **Alignment** (internal: Corporate Progress) — counts toward the win threshold of 4.

### Threshold readability

When the player previews a choice with an effect chip like `Meeting Load +8`, the HUD bar's preview state should briefly highlight where the bar will land after the click — so the player feels "+8 means I'm one click from Calendar Apocalypse" without having to memorize 80 = max. Visual delta on hover, applied delta after click.

### Numeric model for MVP

Use numeric values internally and labels externally.

#### Time
- Start: `9:00am`
- Standup prototype target length: roughly `9:00am–10:30am`
- Actions advance time by 2–30 minutes.

#### Project Status score
- `70–100`: Green
- `40–69`: Yellow
- `0–39`: Red
- Start: `85`

#### Pissed-Off score
- `0–19`: Fine
- `20–39`: Slightly Tight Smile
- `40–59`: Per My Last Email
- `60–74`: Looping In Leadership
- `75–89`: Glassdoor Draft
- `90–100`: Meltdown
- Start: `10`

#### Meeting Load score
- `0–19`: Low
- `20–39`: Manageable
- `40–59`: Concerning
- `60–79`: Pre-Read Required
- `80–100`: Calendar Apocalypse
- Start: `5`

#### Corporate Progress (HUD label: "Alignment")
- `0–3`: performative flailing
- `4–7`: enough artifacts created
- `8+`: aggressively aligned
- Start: `0`

**Visible in HUD.** Internal name remains "Corporate Progress" for code/data; player-facing label is "Alignment" (on-brand with Alignly). Without this visible, players spam coping actions instead of doing corporate work, because they don't see the win-state lever.

### MVP standup win check

**The MVP ends the moment all five required NPCs have been handled.** The ending screen evaluates meter state at that moment to pick which ending shows.

Player clears standup (Standup Complete ending) if at the moment of fifth handling:
- Project Status is Green.
- Pissed-Off is below Meltdown.
- Meeting Load is below Calendar Apocalypse, unless the player recovered from it.
- Corporate Progress (displayed as "Alignment") is at least `4`.

Yellow variant (Green Enough ending) if Project Status is Yellow instead of Green but all other checks pass.

Failure variants (Full Escalation / Calendar Apocalypse) trigger earlier than the fifth handling if Pissed-Off or Meeting Load maxes out — those interrupt the standup and don't wait for the fifth NPC.

### 1. Time

9:00am → 4:30pm Executive Review → 5:00pm ending.

Each action advances time:
- quick chat: 10 min
- create Jira ticket: 10 min
- send follow-up: 15 min
- performance feedback: 20 min
- coffee run: 20 min
- meeting: 30 min
- escalation: 45 min
- cry in bathroom: 15 min

### 2. Project Status

Green → Yellow → Red

Represents the dashboard version of reality, not actual reality.

### 3. Pissed-Off Meter

Fine → Slightly Tight Smile → Per My Last Email → Looping In Leadership → Glassdoor Draft → Meltdown

Tracks office emotional volatility.

### 4. Meeting Load

Low → Manageable → Concerning → Pre-Read Required → Calendar Apocalypse

Visible because it is funny and mechanically useful.

## Core loop

1. Player talks to an NPC or interacts with an office object.
2. NPC presents a mundane corporate blocker.
3. Player chooses a PM action.
4. Meters change.
5. The chosen solution creates a new cost or side effect.
6. If Pissed-Off or Meeting Load gets too high, chaos event triggers.
7. At 4:30, Executive Review checks whether the project can remain Green/Yellow.

## MVP intro screen

Before the player spawns at the PM desk, show a 5-second intro that sets the stakes.

### Format
- Full-screen Slack-style DM mockup. No game world visible.
- Auto-advances after 5 seconds. Spacebar / Enter / click skips early.
- Smooth fade-out into the office scene as the PM "stands up" from their desk (camera tilts up from screen view, PM rises, third-person follow engages).

### Copy

> **Slack — Direct Message**
>
> **Exec → You · 8:58 AM**
>
> Need the Customer Happiness Portal status strictly GREEN by EOD.
>
> Do whatever it takes.

### Why
Players spawning cold don't know why they're walking around. The intro establishes in one beat:
- The dashboard color matters.
- An executive expects results.
- "Whatever it takes" gives implicit permission to weaponize corporate language — which is the whole game.

## MVP moment-to-moment loop

The MVP must feel like a small playable office game, not a dialogue dashboard.

0. Intro Slack message displays for 5s, then fades into the office.
1. Player starts at the PM desk at 9:00am.
2. The office is visible in third-person / over-the-shoulder view.
3. Player walks to an NPC or office object.
4. Nearby object highlights.
5. Prompt appears: `E — Discuss blocker` or `E — Interact`.
6. Player presses `E` or clicks interact.
7. Dialogue panel opens.
8. Player chooses a response with visible effect chips.
9. Meters update.
10. Slack/Gmail/Calendar toast appears.
11. Office state subtly changes.
12. NPC/object becomes handled or creates a follow-up.
13. Player returns to walking and chooses where to spend attention next.
14. Standup ends when enough NPCs are handled, Calendar Apocalypse escalates, or failure triggers.

## MVP office layout

The office should be compact and readable: one looping aisle, not an open world. Space should make choices feel embodied without requiring complex level design.

### Required zones

- **PM desk / spawn point**
- **Engineering pod**
- **Design desk**
- **Product corner**
- **Sales desk**
- **HR glass office**
- **Printer station**
- **Office plant**
- **Meeting room: SYNERGY 2A**
- **Bathroom door**
- **Coffee machine**

### Suggested layout

```text
[HR Office]       [Meeting Room: SYNERGY 2A]
     |                    |
[Design] — [Product] — [Sales]
     |                    |
[Engineer Pod] — [Printer] — [Plant]
     |
[PM Desk / Start] — [Coffee] — [Bathroom]
```

### Spatial design rule

If interactions can all be selected from a menu, walking becomes cosmetic. For MVP, space should matter lightly:
- Coffee machine is a useful detour that costs time.
- Bathroom is a strong self-heal but removes the PM from the project.
- Printer is quick relief but creates risk.
- HR lowers visible anger while increasing repression.
- Meeting room becomes more threatening as Meeting Load rises.

## Controls and interaction rules

### Controls

- `WASD` / arrow keys: move
- `E`: interact with highlighted NPC/object
- Mouse/tap: optional click-to-interact fallback
- `Esc`: close dialogue/pause overlay
- Bottom action bar: coping actions

### Interaction rules

- NPC/object highlights within interaction range.
- Floating labels identify important characters and objects.
- **Unhandled NPCs display a pulsing `!` indicator above their name label.**
- **Handled NPCs display a grayed `✓` and the name label fades to a muted color.** Player can see at a glance who's left without having to remember names.
- Indicators render via Drei `<Html>` so they stay crisp at any camera angle / distance.
- Only one dialogue panel can be open at a time.
- After a choice, return to third-person office view.
- Handled NPCs should remain in-world and offer short bark lines on re-approach.
- Optional objects (Printer, Plant) may be reused if their risk/reward supports replay — they don't get the `✓` since they're not required.

### Post-interaction bark examples

- Engineer: “I’m going to pretend that helped.”
- Designer: “I’ve updated the file name to final_final_really_final.”
- Product: “Tiny thought. Not a request. Unless it’s easy.”
- Sales: “Great news, the client loved the thing we haven’t built.”
- HR: “I’m hearing some themes.”
- Printer: “PC LOAD LETTER.”
- Plant: “…”

## Camera spec

The camera is part of the product promise. Avoid top-down, isometric, or dashboard-first layouts.

- Third-person follow camera behind and slightly above the PM.
- PM avatar remains visible in the lower center foreground.
- Camera looks forward down the office aisle.
- Slight downward tilt so desks, NPCs, labels, and objects are visible.
- HUD overlays the 3D scene. The office should occupy 75–80% of the screen.
- Dialogue panel appears only while interacting.
- Notifications are small toasts, not large panels.

## Main PM actions

These can appear as authored dialogue choices. For replayability, the MVP may also include three reusable “corporate magic words” as cooldown-style PM moves.

### Optional reusable PM moves for MVP

- **Circle Back** — delays one negative consequence until the next interaction.
- **Take Offline** — reduces visible Pissed-Off but increases Meeting Load.
- **Phased Approach** — converts Project Status damage into Corporate Progress.
- **Good Callout** — lightly pacifies any NPC but solves nothing.
- **Green With Risks** — protects the dashboard while adding hidden risk.

Use only 2–3 of these in the MVP if implementation needs to stay tight.

- Clarify Requirements
- Create Jira Ticket
- Schedule Quick Sync
- Circle Back
- Take Offline
- Escalate Gently
- Reframe as Dependency
- Socialize the Narrative
- Put a Pin in It
- Identify an Owner
- Send Follow-Up
- Mark as Green with Risks Being Monitored

## Coping actions / healing potions

These reduce Pissed-Off but create side effects.

### Diminishing returns (MVP balance rule)

To prevent spamming any one coping action to zero out Pissed-Off, **each coping action loses effectiveness on repeat use within a single standup**:

- **Use 1:** full effect (numbers below)
- **Use 2:** ~33% of full effect, with a copy variant acknowledging the diminishing return
- **Use 3+:** ~10% of full effect, copy gets darker

Example — Cry in Bathroom:
- Use 1: `Pissed-Off −15`. Copy: original line.
- Use 2: `Pissed-Off −5`. Copy: "The tears are gone. Only dehydration remains."
- Use 3: `Pissed-Off −2`. Copy: "You sit on the bathroom floor. It is not relaxing. You wonder how this became your job."

Time cost remains the same on every use (no discount on the time penalty). Each coping action tracks its own use counter, reset only between runs.

### Vent to Coworker
- You: Pissed-Off decreases.
- Coworker: Pissed-Off increases.
- Risk: coworker starts avoiding you.

### Slap Printer
- Pissed-Off decreases quickly.
- Risk: printer jams, IT suspicion rises, or printer becomes self-aware later.

### Coffee Run
- Team Pissed-Off decreases.
- Time cost.
- Risk: caffeine crash, oat milk conflict, “who paid?” subplot.

### Send Meme
- Small morale boost.
- Risk: executive replies “Love this energy” and kills the joke.

### Cry in Bathroom
- Strong self-heal.
- Time cost.
- Risk: someone Slacks “are you available for a quick sync?” while you are in there.

### Delete Meeting
- Big team morale boost.
- Risk: leadership visibility drops; someone asks why the meeting disappeared.

## NPC cast

### Engineer

Blocked by vague requirements.

Sample line:
> “No blockers. I just need someone to explain what the requirement means by ‘simple but powerful.’”

Hidden sensitivity:
- hates meetings
- appreciates clear decisions
- loses trust when “premium” is undefined

### Designer

Haunted by contradictory feedback.

Sample line:
> “No blockers. Leadership just asked if the design could feel more enterprise, but less B2B.”

Hidden sensitivity:
- spirals when asked to “make it pop”
- calms down if feedback is made specific

### Product Person

Optimistic in a dangerous way.

Sample line:
> “No blockers. I added one small requirement. It may affect everything.”

Hidden sensitivity:
- converts ambiguity into scope creep
- believes everything is a small change

### Salesperson

Already promised impossible things.

Sample line:
> “No blockers. I may have told the client this would be live Thursday.”

Hidden sensitivity:
- creates urgency from nowhere
- makes project status look important while damaging reality

### HR Person

Meaningless feedback wizard.

Sample line:
> “No blockers. Just a reminder that feedback should be actionable, kind, and legally survivable.”

Hidden sensitivity:
- reduces visible anger
- increases emotional repression

### Executive

Final boss and occasional drive-by chaos generator.

Sample line:
> “What’s the story here?”

Hidden sensitivity:
- likes confidence
- dislikes details
- rewards polished ambiguity

### Printer

Object NPC / possible villain.

Sample line:
> “PC LOAD LETTER.”

Hidden sensitivity:
- may respond to violence
- may ascend during chaos event

### Office Plant

Silent stakeholder.

Tooltip:
> The plant appears to be the only stakeholder with boundaries.

Hidden sensitivity:
- says nothing
- slowly becomes more powerful if stared at repeatedly

## First prototype scene

### Blocked: The Standup Prototype

Length: 5–10 minutes.

Premise:
> It is 9:00am. Everyone says “no blockers,” but everyone is obviously blocked.

Objective:
- Finish standup with Project Status still Green or Yellow.
- Avoid triggering Calendar Apocalypse.

Characters in scene:
- Engineer
- Designer
- Product
- Sales
- HR
- Printer
- Office Plant

Prototype ending:
> Standup Complete. The team is aligned. No one is okay.

## First chaos event

The first chaos event should be recoverable. A hard stop too early will feel punitive; a one-time recovery creates a dramatic beat and lets the player feel clever.

### Calendar Apocalypse

Trigger:
- Meeting Load reaches maximum, or Pissed-Off gets too high during standup.

Message:
> Every empty slot has been replaced with a “quick sync.”

Effects:
- Meeting Load maxes.
- Project Status drops to Yellow.
- NPCs begin saying “can we take this offline?”
- Executive Review becomes harder.

Recovery options after first trigger:

1. **Delete the least useful meeting**
   - Meeting Load -15
   - Pissed-Off -5
   - Leadership Visibility -10
   - Copy: “You delete ‘Sync on Sync Follow-Up.’ The office exhales.”

2. **Accept all and become the meeting**
   - Corporate Progress +3
   - Pissed-Off +10
   - Project Status remains Yellow
   - Copy: “Your calendar becomes a solid color.”

3. **Hide in bathroom**
   - Time +15m
   - Pissed-Off -15
   - Meeting Load unchanged
   - Copy: “You return to 11 unread calendar updates and a new understanding of silence.”

If Calendar Apocalypse triggers a second time, it can become an ending.

## Other chaos events for full version

### Reply-All Incident
Someone replies all:
> “Do we actually need this project?”

### Executive Drive-By
Executive appears and says:
> “Could this be more AI-forward?”

Requirements partially reset.

### Printer Ascension
Printer becomes sentient and appoints itself interim project sponsor.

### HR Fog
HR says:
> “I’m hearing some themes.”

Visible anger drops, but honesty permanently decreases.

### Meeting Singularity
So many meetings are scheduled that no one can work, therefore the project cannot fail because no actions can occur.

## Final boss: 4:30 Executive Review

> **POST-MVP SCOPE.** This section is preserved for future implementation. The MVP (Standup Prototype) ends after the 9:00 AM standup and only *teases* the 4:30 review in the ending screen.

The executive asks vague questions. Honest answers are risky. Corporate evasions are often optimal.

Sample question:
> “Are there any blockers?”

Options:
1. “Yes, the requirements are unclear and the timeline is unrealistic.”
   - honest
   - Project Status risks Red
2. “We have a few dependencies we’re actively managing.”
   - safe
   - Project Status stable
3. “The team is aligned on next steps.”
   - Executive pleased
   - Engineer trust decreases
4. “We’re taking a phased approach.”
   - no one understands it
   - works perfectly

## Winning ending

Main ending:

> Congratulations. The project has moved to the next phase. No work has begun.

Stats:
- Meetings scheduled
- Blockers reclassified as dependencies
- Decisions deferred
- Follow-ups sent
- Actual work completed
- Morale damage
- Dashboard status
- Executive confidence

## Possible endings

### Successfully Aligned
The project moves forward. Nothing is resolved.

### Green Dashboard
Everything is broken, but leadership is pleased.

### Full Escalation
The project is escalated to leadership. A 90-minute mandatory alignment reset appears.

### Meeting Singularity
There are no remaining empty calendar slots. Work is theoretically impossible.

### Secret Ending: Actual Work Got Done
You accidentally ship something useful, but receive feedback to develop executive presence.

## Corporate phrases to use as mechanics/dialogue

- Let’s take this offline
- Circle back
- Executive presence
- Single source of truth
- North star
- Quick sync
- Can we socialize this?
- Do we have alignment?
- Parking lot this
- Bandwidth
- Raise visibility
- No blockers
- Let’s not boil the ocean
- Good callout
- Opportunity for growth
- Dependencies we’re actively managing
- Phased approach
- Green with risks being monitored
- Actionable feedback
- Cross-functional alignment
- Ownership
- Strategic initiative
- Pre-read
- Stakeholder map
- Source of truth

## UI personality

The UI should be passive-aggressive and deadpan.

Example system messages:
- Your blocker has been successfully renamed as a dependency.
- Morale decreased, but visibility increased.
- The team is now aligned. No one is happy.
- You created a doc. Nobody read it.
- This could have been a Slack message.
- Action item assigned to: unclear.
- Congratulations: the project is now strategic.
- Calendar invite received: Quick Sync, 45 minutes, agenda TBD.

## World reactivity

Meter changes should be visible in the office, not just in the HUD. This is what makes the prototype feel alive.

### Post-processing escalation (full-screen vibe shift)

Layered on top of object and lighting changes, full-screen visual effects intensify with Pissed-Off so the room itself feels claustrophobic as the office breaks down:

- `≥ Per My Last Email (40)`: very subtle desaturation begins
- `≥ Looping In Leadership (60)`: faint vignette (corners darken slightly)
- `≥ Glassdoor Draft (75)`: stronger desaturation + chromatic aberration at screen edges
- `≥ Meltdown (90)`: heavy vignette, washed colors, slight motion blur on camera turns

Implemented via `@react-three/postprocessing` (EffectComposer + Bloom/Vignette/HueSaturation passes). Effect intensities are dynamically driven by the Pissed-Off score, lerped over a few seconds so the shift feels atmospheric, not abrupt.

### If Meeting Load rises
- Calendar toasts appear more often.
- Meeting room sign/glass glows slightly.
- More chairs appear in the conference room.
- NPC barks shift toward “can we take this offline?”

### If Pissed-Off rises
- Office lighting becomes colder.
- Slack pings become sharper/more frequent.
- NPC idle animations become tense.
- Designer avoids eye contact.
- HR office door opens slightly.

### If Corporate Progress rises
- More sticky notes, docs, tickets, and status artifacts appear.
- Dashboard language becomes more confident.
- Reality becomes visibly worse.

### If Plant Influence rises
- Plant subtly grows.
- Label changes from `Office Plant` to `Stakeholder`.
- Later label possibility: `Executive Sponsor`.
- Secret ending possibility: **Plant-Based Governance**.

## Audio (v1)

### UI sounds
- Slack ping (incoming message)
- Gmail ping (incoming email)
- Calendar reminder chime

Each sound plays on the corresponding toast notification.

### Ambient bed
- Continuous low office hum: HVAC drone + faint muffled phone rings + distant typing
- Plays from game start (after first user interaction, per browser autoplay policy)
- Ducks ~30% when a dialogue panel is open so dialogue copy reads cleanly

### Dynamic audio response (escalation)
As Pissed-Off rises, the ambient bed warps:
- `≥ Per My Last Email`: HVAC pitches down ~5%
- `≥ Looping In Leadership`: faint high-pitched fluorescent buzz fades in
- `≥ Glassdoor Draft`: HVAC pitches down ~15%, room tone gets oppressive
- `≥ Meltdown`: ambient warps to an off-key drone, fluorescent buzz intensifies, faint distant scream optional

### Stack
- **Howler.js** for sample playback and looped beds
- **Web Audio API** for the pitch-shift on the HVAC drone (PlaybackRate or AudioParam ramp)
- Master volume slider in pause/settings overlay
- "Mute" toggle bound to `M` key

## Hidden state model

Do not expose these as meters in the MVP HUD, but track them to support better endings and replayability:

- Engineer Trust
- Designer Patience
- Product Scope Creep
- Sales Promise Risk
- HR Repression
- IT Suspicion
- Printer Sentience Risk
- Plant Influence
- Leadership Visibility

Hidden state should affect copy, barks, and endings — not overwhelm the player.

## Technical architecture recommendation

### Browser MVP stack

Use a lightweight web-native 3D stack:

- **Vite** — fast dev server/build tool
- **React** — UI and component model
- **TypeScript** — safer game data and state
- **Three.js** — 3D rendering
- **React Three Fiber** — React bindings for Three.js
- **Drei** — useful helpers for camera, labels, controls, text
- **Zustand** — simple centralized game state
- **Howler.js** or native Web Audio — Slack/Gmail/Calendar/printer sounds
- **Plain CSS/Tailwind** — HUD, dialogue, buttons, toasts

### MVP implementation choices

- Use simple primitives first: boxes for desks, capsules for people, planes for walls/floors.
- **Replace primitives with Mixamo rigged characters** (PM and NPCs) once the graybox feel is locked. Drei's `useGLTF` + `useAnimations` handle this; `SkeletonUtils.clone` enables per-instance skeleton state for multiple NPCs from the same base mesh.
- Avoid complex physics. Use simple office bounds and proximity zones.
- **Do NOT use `@react-three/rapier` or `cannon-js` for the MVP.** Soft AABB bounds + axis-separated collision against a small list of wall rectangles is enough. Full physics engines introduce stuck-on-desk bugs that aren't worth fixing for a dialogue-driven game.
- Player movement: direct WASD with exponential acceleration to top speed. No pathfinding, no nav-mesh.
- Walk speed targets: PM should cross from one desk to another in **3–4 seconds** so walking doesn't feel like dead time between dialogue beats.
- Keep all dialogue authored in JSON/TypeScript data.
- Use **Drei `<Html>`** for NPC labels, the `!` / `✓` indicators, interact prompts, and dialogue panels — anything that should stay crisp regardless of camera angle. Use Drei `<Text>` only for in-world 3D-anchored signage (room name signs on partitions, etc.).
- Deploy as a static site via Cloudflare Pages, Vercel, or Netlify.

### Why this stack

Three.js / React Three Fiber gives the “real office” 3D feeling while staying browser-shareable. Unity is too heavy for this MVP, and CSS pseudo-3D risks feeling like a mockup instead of a game.

## MVP build plan

### Phase 1 — Lock MVP spec
- Confirm free WASD movement vs clickable hotspot movement.
- Confirm required NPCs and endings.
- Confirm numeric thresholds.

Recommendation: true Three.js/R3F scene, simple WASD movement, no complex physics.

### Phase 2 — Graybox the 3D office
- Build floor, walls, desks, meeting room, HR office, bathroom door, printer, plant, coffee machine.
- Add PM avatar.
- Add third-person follow camera.
- Add movement and office bounds.

Success test: walking around the office feels like being in a small workplace, not moving a cursor on a map.

### Phase 3 — Add proximity interaction
- Add interaction zones.
- Add highlights and floating labels.
- Add `E — Interact` prompt.
- Wire Engineer and Printer first.

### Phase 4 — Add game state and HUD
- Add Time, Project Status, Pissed-Off, Meeting Load, Corporate Progress.
- Add effect chips on choices.
- Apply meter changes after choices.
- Add handled-state tracking.

### Phase 5 — Implement standup content
- Add Engineer, Designer, Product, Sales, HR, Printer, Plant.
- Add coping action bar.
- Add Slack/Gmail/Calendar toasts.

### Phase 6 — Add chaos and endings
- Add Calendar Apocalypse trigger.
- Add one-time recovery option.
- Add Standup Complete, Green Enough, Full Escalation, Calendar Apocalypse endings.
- Optional: Plant-Based Governance secret ending.

### Phase 7 — Atmosphere polish
- Add office hum, fluorescent buzz, notification sounds.
- Add lighting changes as Pissed-Off rises.
- Add meeting room changes as Meeting Load rises.
- Add printer and plant surreal escalation.

## Design direction for Claude Design

Create a self-contained interactive HTML prototype that feels like:
- beige corporate RPG
- deadpan dashboard UI
- slowly surreal office simulator
- clickable NPCs / objects
- dry microcopy everywhere

Must include:
- title screen
- office map/dashboard
- visible Time, Project Status, Pissed-Off, Meeting Load
- NPC dialogue cards
- choice buttons with meter effects
- coping actions menu
- Calendar Apocalypse event
- Standup Complete ending screen

## Prototype v1 decisions

1. No visible “Internal Screaming” meter. Internal unraveling appears through copy, tooltips, and ending text only.
2. Choices should show consequences before clicking with visible effect chips like `Time +10m`, `Meeting Load +8`, `Pissed-Off -5`.
3. Art direction: hybrid — beige corporate RPG plus deadpan dashboard UI.
4. Satire sharpness: vicious but true.
5. Sound effects in v1: Slack ping, Gmail ping, calendar invite reminders. Optional later: printer slap, exhausted sigh, meeting join chime.

## Companion docs

- Standup prototype content pack: `/Users/rebeccaleung/Blocked_Standup_Content_Pack.md`
- 3D / over-the-shoulder prompt pack: `/Users/rebeccaleung/Blocked_Claude_3D_Prompts.md`
