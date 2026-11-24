# THE COAST

THE COAST is a browser third-person game. The playable build is one original waterfront district: walk it, take a delivery, and get paid. The city is still a designed blockout, not a finished metropolis. Meshes and colliders share one layout so Blender models can replace the blockout without moving gameplay.

## Run

```bash
npm install
npm test
npm run dev
```

Open the home page and choose Enter the coast. There is no sign-in.

| Key | Action |
| --- | --- |
| Click | Look around (pointer lock) |
| Arrow keys | Walk, relative to the camera |
| Shift | Sprint |
| Space | Jump |
| E | Talk, accept, or pick up |
| Esc | Release the mouse |

Arrow keys and Space do not scroll the page while the game is open, unless focus is in a text field. Listeners are removed when the game unmounts.

## What is playable

The route is `/game`. A kinematic Rapier character starts on the marina sidewalk with $250. Inez Calder offers one delivery. Three packages sit at Warehouse 3. Returning them pays $500 once. Cash and mission state stay in `localStorage` under `coast-save-v1:<id>`.

The district, defined in `src/game/world/coast/layout.ts`, has a coast road, an inland road, a cross street, sidewalks, a seawall, and these places: Marina Office, Salt, Harbor House, Market, Yard Shop, and Warehouse 3. Palms, lamps, parked cars, and the contact are solids in that same list. `CoastDistrict` draws them and gives each solid a cuboid collider.

## How the live game is split

```
src/app/                 home, /game, settings, a /login redirect
src/game/render/         the R3F canvas, lights, shadows
src/game/player/         kinematic body, camera-relative movement
src/game/camera/         follow camera with a ray that shortens the boom
src/game/input/          key ref and pointer lock
src/game/sim/            reads the body each frame and talks to the session
src/game/session/        mission, cash, prompts, save snapshot
src/game/missions/       the delivery as pure functions
src/game/economy/        integer cash and a ledger entry
src/game/interaction/    nearest prompt, with a little stickiness
src/game/world/coast/    district layout and meshes
src/components/          HUD, dialogue, control guide, menus
```

The frame loop does not copy position into React state. Input lives in refs. React renders when a prompt, panel, or save changes.

Money changes only inside `CoastSession`. The HUD displays the snapshot. The delivery functions refuse an out-of-order turn-in and a second payout.

## Parked code

`src/game/engine`, the older districts, the cab, First Fare, properties, and the Supabase ledger are still in the repo. No page mounts them. Do not treat that code as the current game. Cloud accounts are not part of play.

## Assets

`public/` is ready for models, textures, and audio. Until a model exists, a solid in `layout.ts` is both the visible box and the collider. Replace the mesh later and keep the footprint.
