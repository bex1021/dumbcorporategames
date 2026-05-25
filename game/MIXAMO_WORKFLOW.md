# Mixamo Character Workflow

This is how you get real rigged office-worker characters into Blocked instead of the placeholder Soldier.

## Why Mixamo

- Free (Adobe account required, free tier is fine).
- ~100 base characters, ~2000 animations.
- Industry-standard pipeline for game prototypes.
- Rigging is already done — just download and drop in.

## One-time setup

1. Go to **[mixamo.com](https://www.mixamo.com)** and sign in with a free Adobe account.
2. Install an FBX → GLB converter. Two options:
   - **Easiest (no install):** Use the online converter at https://products.aspose.app/3d/conversion/fbx-to-glb — just upload FBX, download GLB.
   - **Local (better for repeat use):** `npm install -g @miyaoka/gltf-pipeline` or use Blender (free, slower).

## Per-character workflow

For each character we want (PM + 5 NPCs minimum):

### Step 1 — Pick the character

On mixamo.com → **Characters** tab. Browse the catalog. Good fits for our cast:

- **Brent (Engineer)**: anyone in a hoodie or casual tee — "Maw J Laygo", "Mremireh O Desbiens", "Castle Guard 01" (with shirt swap)
- **Tasha (Designer)**: someone in casual clothes — "Megan", "Mary J Laygo", "Sophie"
- **Priya (Product)**: business casual — "Vanguard By T. Choonyung", "Pumpkinhulk_Louise" (lol, no), "Lola B. Styperek"
- **Chad (Sales)**: blazer or suit — "Carl", "Liam", "Big Vegas" (with outfit swap)
- **Diane (HR)**: cardigan / business — "Suzie", "Megan", "Lola"
- **PM (you)**: business casual blazer — "Eve By J. Gonzales", "Liam", "Pumpkinhulk Louise"

Don't sweat the choice — they're easy to swap later.

### Step 2 — Download with animations

Mixamo bakes one animation per FBX download. You need:

**For the PM (player character):**
1. With character selected, click **Animations** → search and pick **"Idle"** (the basic standing breathing one).
2. Click **Download**. Settings:
   - Format: **FBX Binary (.fbx)**
   - Pose: **T-Pose** (or "Original Pose" if greyed out)
   - Frames per Second: **30**
   - Keyframe Reduction: **none**
3. Save as `Player_Idle.fbx`.
4. Search and pick **"Walking"** animation. Download. Save as `Player_Walk.fbx`.
5. (Optional) **"Sitting Idle"** for when PM is at desk, **"Talking"** for dialogue. Same workflow.

**For NPCs (Brent, Tasha, etc.):**
- We need them in sitting poses. Search "Sitting Idle", "Sitting Typing", "Sitting Talking".
- Download one or two per NPC.

### Step 3 — Combine animations into one GLB (recommended)

Most efficient: have one GLB per character with all that character's animations inside. Two paths:

**Path A: Online (simplest, slowest).** Convert each FBX to GLB separately at https://products.aspose.app/3d/conversion/fbx-to-glb. You'll get multiple GLBs per character — that works but takes more loading code.

**Path B: Local with gltf-pipeline (cleanest).** Use Blender or `gltf-pipeline` to merge animations from multiple FBX files into a single GLB. If you want to go this route, ping me and I'll write the merge script.

For the first pass, Path A is fine. We'll have `Player_Idle.glb` and `Player_Walk.glb` as separate files initially.

### Step 4 — Drop into the project

Put the GLB files in `game/public/models/`. Naming convention:

```
public/models/
├── Player.glb        # idle + walk animations baked in
├── Brent.glb         # sitting idle + sitting talking
├── Tasha.glb
├── Priya.glb
├── Chad.glb
└── Diane.glb         # standing idle
```

(If you went Path A, you'll have `Player_Idle.glb` and `Player_Walk.glb` as separate files for now — we'll handle that in code.)

### Step 5 — Tell me you're done

Just say "models are in" and I'll:
1. Update `Player.tsx` to point at your `Player.glb`.
2. Wire each NPC in `NPCs.tsx` to its corresponding GLB.
3. Tune scale (Mixamo characters export at slightly different sizes; we'll match the office).
4. Verify animations play correctly.

## Quick reference — where to swap in code

| File | What changes |
|------|--------------|
| `src/scene/Player.tsx` | Change `url="/models/Soldier.glb"` to `url="/models/Player.glb"` |
| `src/scene/NPCs.tsx` | Each NPC currently uses primitive `Humanoid`; will switch to `GLBHumanoid` with its own URL |
| `src/scene/GLBHumanoid.tsx` | Animation name matching ("Idle", "Walking" — Mixamo's defaults match the regex already) |

## Cost estimate

- Each character GLB: ~3–8 MB after conversion.
- 6 characters × 6 MB ≈ 36 MB total download for the game. Fine for a prototype, can be reduced later with Draco compression if needed.

## When you're stuck

- **Mixamo isn't letting me download as FBX:** Try "FBX 7.4 Binary" or "FBX 6.1 ASCII" — there are multiple format options.
- **Online FBX→GLB converter is failing:** Free tier has size limits. Try [https://convert3d.org](https://convert3d.org/) as a backup.
- **The character is huge / tiny in-scene:** Tell me and I'll add a scale override per character.
- **Animations stutter when you stop moving:** Likely the walk loop hasn't transitioned cleanly — we'll tune the crossfade.
