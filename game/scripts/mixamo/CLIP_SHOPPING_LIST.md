# Pass 2 — Mixamo clip shopping list (Performance Review fight)

The fix that actually makes the fight fluid: pull the **core clips from ONE
matched Mixamo "Fighting" family** so they all share the exact same guard
stance. Then they flow into each other with almost no blending needed.

## How to download each clip

1. On [mixamo.com](https://www.mixamo.com), pick the animation below.
2. Turn **In Place** ON (checkbox on the right) for anything that would
   otherwise travel — the game's simulation owns position, not the clip.
3. Download → Format **FBX Binary**, Skin **Without Skin**, 30 fps, no keyframe
   reduction.
4. Rename the file to the **slot name** in the table (e.g. `heavy.fbx`) and drop
   it in `scripts/mixamo/incoming/`.
5. Run: `npm run mixamo:import` — it converts every FBX in that folder to the
   right `.glb` and drops it in place. Reload the game to see it.

That's it — the filename is the wiring.

## TIER 1 — the fluidity core (do these first, from ONE fighting set)

| slot (rename to) | Mixamo animation | notes |
|---|---|---|
| `idle.fbx`  | **Fighting Idle**        | the bouncing guard everything blends to |
| `jab.fbx`   | **Jab**                  | fast lead poke (game's "Clarify") |
| `heavy.fbx` | **Roundhouse Kick** *or* **Hook Punch** | ← this is your "is K a kick?" choice. Kick = Roundhouse; punch = Hook |
| `block.fbx` | **Center Block**         | high guard (game's "Active Listening") |

Getting just these four from the same family is ~90% of the visible fluidity.

## TIER 2 — reactions & transitions (nice next)

| slot | Mixamo animation | notes |
|---|---|---|
| `hit.fbx`       | **Hit Reaction** (light head/body) | keep it short |
| `dodge.fbx`     | **Sway Back** / **Boxing Dodge**   | the back-dash i-frame move |
| `land.fbx`      | **Hard Landing** / **Jump Down**   | NEW slot — the missing hop landing; ping me to wire it in |
| `walk.fbx`      | **Fighting Idle** forward step     | optional — current one works |
| `walkback.fbx`  | backward step                      | optional |

## TIER 3 — the rest (only if you want the full refresh)

`knockdown.fbx` (Knocked Out / Falling Back — must END lying down),
`getup.fbx` (Getting Up), `victory.fbx` (Victory / Taunt),
`jumpattack.fbx` (Flying Knee / Jump Attack), `jump.fbx`, `falling.fbx`.

## The one awkward slot: `throw.fbx`

Mixamo has no clean "grab-and-throw." Search **"grab"** and pick a reaching
two-hand grab (or a big lunging reach). If nothing reads well, we keep the
current `throw.glb` — the Pass 1 timing fix already made L feel much better.
