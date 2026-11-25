# THE COAST — quality standards

A feature is finished when a person standing in the street would believe it, and when the existing game still works. A scene that renders is not finished. A low-poly stand-in is not photorealistic, and this document does not treat one as the other.

These rules apply to every milestone after the audit. They are the review checklist.

## Visual bar

The target is a cinematic, physically based coastal city viewed in a browser. Street level matters more than a skyline screenshot. A frame is acceptable when:

- Materials show albedo, roughness, and a response to the sky. A single hex color on a box is a blockout.
- Glass reflects the sky or the street. A transparent gray box is not glass.
- Light has a sun direction, a sky fill, and contact shadows. Characters and cars read as lit objects, including faces.
- Architecture has a door, a window rhythm, a roof, and a material change between wall, glass, and ground.
- People have human proportions, a face, hair, clothes, hands, and feet. A mannequin, a capsule, and a chibi crowd fail this bar.
- Vehicles have a body, wheels, lamps, glass, and an interior the driver sits in. A box with four cylinders fails this bar.
- Water moves, changes color toward the shore, and carries the sky. A flat blue plane fails this bar.
- Repeated objects are a kit with variation. A street of identical cubes fails this bar.

Screenshots are part of the milestone. Capture street level and one elevated view. If the screenshot still reads as a blockout, the milestone stays open.

## What may ship as temporary

A blockout may stay in the repo while a replacement is being made. It must be labeled as a blockout in `public/models/ASSETS.md` and in the milestone notes. It must not be described as the final asset in `PROJECT.md` or in a pull request summary.

The current crowd, cars, palms, and boats may keep running so the district is not empty. They are temporary. New work does not add more of them.

## Systems that have to survive every art swap

- Arrow-key movement, sprint, jump, and the follow camera.
- The Marina Office door, and any later door, as a real opening. No teleport.
- Mission 001, the $250 start, the one-time $500 payout, and the local save.
- The mini-map and the M map reading the same coordinates as the meshes.
- Pedestrian and traffic routes in `src/game/world/life/routes.ts`. Meshes change. The paths stay until the street layout changes on purpose.

## Asset rules

- One meter in Blender is one meter in the scene.
- Characters face +Z, feet at y = 0, and play in-place clips. The player clip names stay `Idle_Loop`, `Walk_Loop`, `Sprint_Loop`, `Jump_Start`, `Jump_Loop`, `Jump_Land`. Crowd clips stay `Idle`, `Walk`, `Run`, `SitDown` until a new contract is written in the same change as the files.
- A building GLB does not contain the physics mesh. The footprint in `layout.ts` remains the collider until a reviewed low-poly collider replaces that box.
- Every file under `public/models/` has a row in `public/models/ASSETS.md`: name, type, source, license, path, texture status, and whether it is final or temporary.
- Licenses must allow redistribution in this public repository. CC0 is acceptable. A pack that forbids redistribution stays out, including newer Quaternius packs under that restriction. A license that cannot be re-checked is recorded as unverified and the asset stays temporary.
- Do not invent a path. If the file is not in the repo, the manifest says it is missing.

## Performance bar

The game runs in a browser. A beautiful frame that stalls is not acceptable.

- Desktop target: a steady frame on a discrete GPU at 1080p, with device pixel ratio capped around 1.5.
- The player is always full fidelity.
- Full character and vehicle meshes exist only near the camera. The current hide distances (people beyond 58 m, boats beyond 90 m) stay until a measured pass replaces them.
- Far crowds are hidden or reduced. They are not a second full skeleton.
- Building collision stays a few boxes or a small convex hull. A rendered facade is not the collider.
- The frame loop does not copy positions into React state.
- A milestone that adds meshes includes a note on triangle count, texture size, and how many instances are visible at the spawn.

## Gameplay bar, when a gameplay milestone starts

Gameplay milestones do not begin until the street-level art milestones in `DEVELOPMENT_ROADMAP.md` are accepted. When they do:

- One activity, finished, before a second activity of the same family.
- Money moves only through the session, with a ledger line, and cannot be claimed twice.
- A business has costs. A property has an owner and a price. A vehicle can be entered and exited.
- Crime, police, aviation, and ownership are fictional systems with their own design note before any code.

## Review questions

Ask these before calling a milestone done:

1. Does a street-level screenshot meet the visual bar above?
2. Did the player, the mission, the cash, and the map still work in a browser pass?
3. Are new files in the manifest, with a real license?
4. Did TypeScript, the tests, and the production build pass?
5. What is still temporary, named plainly?
