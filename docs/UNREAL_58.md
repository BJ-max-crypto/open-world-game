# Unreal Engine 5.8 migration

Unreal is not installed here, and it is not running. This note is the handoff for a later machine that has a discrete GPU. The playable game remains the browser build.

## Pin

Use Unreal Engine 5.8. Epic has said UE6 drops Blueprints and the Actor gameplay framework, so this project does not start on UE6. Pixel Streaming must use the 5.8 signalling server (`signalling-webserver-UE5.8`) and `@epicgames-ps/lib-pixelstreamingfrontend-ue5.8`. A mismatched server will not pair.

## What moves

Rules and numbers move. Rendering code does not.

- Footprints, spawn, packages, and roads in `src/game/world/coast/layout.ts`.
- Sidewalks, lanes, boat paths, and `waveHeight()` in `src/game/world/life/routes.ts`.
- The delivery rules in `src/game/missions/firstOpportunity.ts`: $250 start, three packages, $500 once.
- The kayak limits in `src/game/world/life/kayak.ts`.
- GLB and texture files under `public/`, reimported. See `docs/BLENDER_EXPORT.md`.

React, Three.js, and Rapier stay in the browser project.

## Coordinates

The browser scene is meters, Y up, north +Z, east +X. Unreal is centimeters, Z up, X forward, Y right.

`UE (X, Y, Z) = (z, x, height) × 100`

Height is the browser Y. A footprint’s Unreal yaw needs a check on the first building: mesh forward in the browser is +Z.

## Where the project will live

`unreal/Coast/` beside `src/`, created on the GPU machine with the 5.8 editor. One C++ game module. First slice is the marina, the walk, and Mission 001. This VM does not generate that project, because it has no GPU and no Unreal install.

## Streaming, later and unpaid for now

Vercel keeps serving the website. It does not run Unreal. A future stream needs a separate GPU host, one session per player, paid for only after an explicit budget. Until that exists, players use the browser game at the current Vercel URL. Do not replace `/game` with a stream placeholder.
