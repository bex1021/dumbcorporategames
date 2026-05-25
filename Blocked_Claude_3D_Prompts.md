# Blocked — Claude Design Prompts for 3D / Over-the-Shoulder Prototype

## Core steering note

Claude Design may default to top-down 2D because it is easiest in HTML. To get the intended experience, repeatedly use these phrases:

- third-person behind-the-character camera
- over-the-shoulder office walking experience
- low-poly / pseudo-3D office scene
- player avatar in foreground, facing into office
- desks and NPCs arranged in depth with perspective
- WASD/arrow-key movement through aisles
- interact prompt appears when near NPC/object
- HUD overlays the 3D scene, not the other way around

## Prompt 1 — Convert the prototype from top-down to third-person

```text
This is much closer, but the camera is still top-down. I want the player experience to feel like a third-person mini-game, not a map.

Please redesign the main play area as an over-the-shoulder / behind-the-character office walking scene.

The player should see the PM avatar from behind in the foreground, walking through the office toward desks and areas. The camera should be positioned behind and slightly above the PM, looking forward into the office, like a simple third-person adventure game.

Keep the current HUD and gameplay systems, but change the center play area from top-down floorplan to a pseudo-3D office scene with depth and perspective.

Important changes:
- Replace the top-down map with a perspective office corridor / pod view.
- Put the PM character in the lower center foreground, seen from behind.
- Show desks, NPCs, printer, plant, meeting room, HR office, and bathroom as objects in the 3D scene.
- NPCs should stand or sit at desks in the distance, with name labels floating above them.
- Use WASD/arrow-key movement to move the PM around the office.
- When the PM gets close to an NPC/object, show an “Press E to interact” prompt.
- Clicking or pressing E should open the dialogue panel.
- Keep the HUD as a compact overlay at the top.
- Keep coping actions as a bottom command bar or radial/action menu.

This should feel like playing a tiny office exploration game, not looking at a dashboard or board game map.
```

## Prompt 2 — If true 3D is too hard, ask for pseudo-3D

```text
If true 3D is too complex for this prototype, fake it with CSS/HTML pseudo-3D.

Use a forced-perspective office scene:
- floor grid recedes toward a vanishing point
- desks shrink as they get farther away
- foreground PM avatar is larger
- NPCs/objects scale based on depth
- aisles lead into the office
- walls, cubicles, and desks use simple isometric/perspective shapes

The goal is not photorealistic 3D. The goal is to make the player feel positioned behind the PM, walking into the office.

Make it visually read as:
“third-person office RPG prototype”
not:
“top-down map.”
```

## Prompt 3 — Three.js version if Claude Design can use libraries

```text
Please rebuild the main game view using a simple Three.js scene if possible.

Requirements:
- low-poly beige corporate office
- third-person camera behind PM avatar
- PM avatar is a simple capsule/person shape
- desks are simple boxes
- NPCs are simple colored capsule characters at desks
- printer, plant, meeting room, HR office, coffee machine, and bathroom door are simple labeled objects
- WASD/arrow keys move the PM
- camera follows behind the PM
- proximity interaction: when near an NPC/object, show “Press E to interact”
- pressing E opens the existing dialogue system
- HUD remains HTML overlay: Time, Project Status, Pissed-Off Meter, Meeting Load
- notification toasts remain HTML overlay
- coping actions remain bottom overlay

Keep it lightweight and self-contained in one HTML file if possible. Use CDN scripts only if needed.

Visual style: low-poly Severance-lite beige office, deadpan corporate UI, slightly oppressive fluorescent vibe.
```

## Prompt 4 — Camera and feel specification

```text
Camera spec:
- third-person follow camera
- position: behind and slightly above the PM
- PM avatar appears in lower center of screen
- camera looks forward down office aisle
- slight vertical tilt downward so desks and NPCs are visible
- avoid top-down or isometric camera
- avoid map view
- office should have depth: foreground, midground, background

Movement spec:
- WASD/arrow keys move forward/back/left/right
- PM should not leave the office bounds
- movement can be simple gridless walking; it does not need complex collision
- if collision is too hard, use soft boundaries or invisible interaction zones

Interaction spec:
- NPC/object highlights when nearby
- prompt appears: “E — Discuss blocker” or “E — Interact”
- pressing E opens dialogue
- after choice is selected, return to third-person view

The game should feel like walking around a corporate office and choosing who to deal with next.
```

## Prompt 5 — Layout correction

```text
Please make the HUD secondary. The central experience should be the office scene.

Current issue: the game still feels like a dashboard/map with game elements.

Desired layout:
- 75–80% of screen: third-person office scene
- top: slim HUD overlay
- bottom: compact coping/action bar
- right side: dialogue panel only when interacting
- notifications: small toasts, not large panels

Remove any large dashboard panels that compete with the playable scene.
```

## Prompt 6 — Interaction loop to preserve

```text
Preserve this gameplay loop in the third-person version:

1. Player walks behind the PM through the office.
2. Player approaches an NPC/object.
3. Nearby prompt appears.
4. Player presses E or clicks interact.
5. Dialogue panel opens with blocker text.
6. Player chooses a response with visible consequences.
7. Meters update.
8. Slack/Gmail/Calendar toast appears.
9. NPC is marked handled.
10. Player returns to walking around.
11. Standup ends after required NPCs are handled or Calendar Apocalypse triggers.

Do not lose the dialogue, consequence, and meter mechanics while changing the camera.
```

## Prompt 7 — Specific visual references in words

```text
Visual direction:
- Low-poly office diorama
- Behind-the-character corporate walking simulator
- Beige fluorescent office with cubicles and glass rooms
- Slightly oppressive but funny
- PM avatar in foreground with blazer/cardigan silhouette
- NPCs are simple but expressive office workers
- Floating labels: Brent / Eng, Tasha / Design, Priya / Product, Chad / Sales, Diane / HR
- Objects: printer with PC LOAD label, office plant named Phyllis, coffee machine, bathroom door, meeting room sign “SYNERGY 2A”

Avoid:
- top-down map
- board game layout
- analytics dashboard
- large static cards
- cute cartoon chaos

Make it feel like a tiny third-person game prototype.
```

## Prompt 8 — Use this if Claude Design says it cannot do 3D

```text
If full 3D is not feasible, create the strongest possible pseudo-3D HTML prototype.

Use CSS perspective, layered sprites, scale-by-depth, and a receding floor grid to create a behind-the-character illusion.

The PM should still appear in the foreground from behind, and NPCs/desks should be positioned in depth. Movement can be simplified to moving between hotspots in the scene rather than free walking.

Hotspots:
- Engineer desk
- Designer desk
- Product desk
- Sales desk
- HR office
- Printer
- Plant
- Meeting room
- Bathroom

Clicking a hotspot should animate the PM walking toward it, then open the dialogue/interact panel.

This is acceptable for the design prototype as long as it reads as over-the-shoulder and experiential, not top-down.
```

## Single best prompt to paste now

```text
This is much closer, but it still feels like a top-down map. I want the player experience to feel more like a third-person office walking game.

Please convert the main play area into an over-the-shoulder / behind-the-character office scene.

The PM avatar should appear in the lower center foreground, seen from behind, with the camera behind and slightly above them looking forward into the office. The player should feel like they are walking through the office to different desks and areas.

Keep the HUD and game mechanics, but make the center experience a playable pseudo-3D/third-person office scene:
- low-poly or CSS pseudo-3D beige office
- desks and NPCs arranged in depth, not top-down
- NPC labels floating above characters
- WASD/arrow-key movement or clickable hotspot movement
- “Press E to interact” when near NPCs/objects
- dialogue panel opens after interacting
- choices still show consequences before clicking
- meters update after choices
- Slack/Gmail/Calendar toasts still appear
- coping actions remain as a compact bottom action bar

If true 3D is possible, use a lightweight Three.js scene. If not, fake it with CSS perspective: receding floor grid, depth scaling, foreground PM avatar, and hotspot movement.

Important: this should feel like playing a tiny third-person corporate survival game, not looking at a dashboard or board-game map.
```
