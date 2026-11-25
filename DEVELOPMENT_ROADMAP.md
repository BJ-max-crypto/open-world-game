# THE COAST — development roadmap

This plan replaces the old milestone list in `ROADMAP.md`. No major scene or architecture change starts until this order is approved.

The rule for the whole plan: one street that looks real, then a person, then a car. The city, the businesses, and the crime systems wait. Adding more of the current crowd, more box buildings, or more box cars is out of scope.

## What the audit found

The playable route is `/game`. It is a React Three Fiber scene with Rapier, a kinematic player, a follow camera, one delivery, and a local save. The world that is actually mounted is about 100 by 70 meters of land: three road slabs, eight buildings, a seawall, a park slab, and the ocean. Eight pedestrians, six traffic cars, and three boats simulate on shared paths. The mini-map and the M map use those coordinates.

That simulation, the player controller, the mission, and the map are worth keeping. The visible art is not. There are no image textures in `public/`. Buildings are boxes with a window strip. The player is an unclothed mannequin. The crowd is eight stylized CC0 characters with oversized heads. Cars are original boxes. Palms, lamps, and boats are low-poly CC0. Lighting is one warm sun, a dim hemisphere, fog, and a drei sky. Glass has no environment map, so it cannot reflect the street.

An older engine still sits in `src/game/engine`, `src/game/npcs`, `src/game/vehicles`, and `src/game/properties`. No page mounts it. It is not a head start on this roadmap. Leave it parked. Do not delete it in the art milestones.

## Keep

| Piece | Where | Why it stays |
| --- | --- | --- |
| Arrow movement, sprint, jump, camera clearance | `src/game/player`, `src/game/camera` | Already played and tested |
| Mission, cash, local save, no sign-in | `src/game/session`, `src/game/missions` | The only economy, and it is correct |
| Footprints as colliders | `src/game/world/coast/layout.ts` | Art can swap without moving gameplay |
| Paths, lights, follow distance, boat bob | `src/game/world/life/routes.ts`, `simulate.ts` | The behavior is reusable. The meshes are not |
| Map projection | `src/game/world/map` | Same coordinates as the district |
| Marina Office as a walked interior | `src/game/world/interiors` | The pattern is right. The furniture is still boxes |
| Distance hide for people and boats | `CityLife.tsx` | The right idea for a browser |

## Replace before anyone calls the picture realistic

| What is on screen | Replacement |
| --- | --- |
| Flat color ground and roads | Tiled PBR asphalt and concrete, plus an HDRI for reflections |
| Eight box buildings and the window-strip facade | One authored building first, then a kit |
| Player mannequin | One human with a face, clothes, and the existing clip contract |
| Eight stylized crowd bodies | A small cast on that same contract, after the player is accepted |
| Box cars, parked and moving | One production car, then traffic uses it |
| Low-poly boats and palms | Keep them as dressing until the street and the car exist |
| Office interior made of boxes | Furniture in the same shell, after the exterior of one building works |
| Stale lines in `GAME_DESIGN.md` that say the district has no pedestrians | Already corrected in this documentation pass |

## Milestones

Each milestone is its own branch, its own screenshots, and its own decision to continue. Typecheck, tests, and a production build stay required. A milestone that only compiles is not done.

### 0. Audit and standards

This document, `QUALITY_STANDARDS.md`, and `ASSET_REQUIREMENTS.md`. No new geometry. Approval happens here.

### 1. Street materials and lighting

The highest leverage change that does not invent a building.

- Evaluate CC0 ground textures and one coastal HDRI. Download only after the license on the file is checked. Record the files in the manifest.
- Apply asphalt, sidewalk, and curb materials to the existing slabs. Keep the collider sizes.
- Set the scene environment from the HDRI so glass and the current cars pick up the sky.
- Keep the warm sun. Do not build a day-night clock in this milestone.
- Acceptance: a street-level screenshot where the road and the sidewalk are different materials, and a window or the water carries the sky. The player still completes a few steps of the delivery. If the frame still looks like flat paint, this milestone stays open.

### 2. One building

- Choose one footprint, preferably Harbor House or the Marina Office exterior.
- Model it, or bring in one licensed GLB that matches the footprint. Budget roughly 8,000 to 20,000 triangles for a low rise.
- Leave the other buildings as blockout.
- Acceptance: from the sidewalk, that building has a door, window frames, a roof, and more than one material. Collision and the mission markers do not move. The other boxes are still boxes, and the notes say so.

### 3. One human

- Replace `characters/player.glb` with a person who meets `QUALITY_STANDARDS.md`.
- Keep the clip names the player code already plays.
- Do not restyle the crowd in the same change.
- Acceptance: at the current camera distance the face, hands, clothes, and walk read as a person. The mannequin is gone. If no redistributable model meets the bar, stop and name the asset. Do not substitute another mannequin.

### 4. A small cast

Only after milestone 3 is accepted.

- Four to six crowd members with different faces and clothes, on the existing path follower.
- Add a talk or phone idle if the rig has one.
- Inez uses one of those characters.
- Acceptance: two people in one screenshot are recognizable as different individuals. They still stay on the sidewalks and out of the building solids.

### 5. One car

- A sedan-scale mesh with an interior and a seated driver.
- The player can enter, steer, accelerate, brake, reverse, and exit.
- Traffic may use the same mesh at a lower interior detail. The lane logic in `simulate.ts` stays.
- The unmounted `src/game/vehicles/Vehicle.ts` is reference reading only. The live car is a Rapier body in the current scene.
- Acceptance: the car follows a turn on the coast road, stops, and the driver is visible through the glass. The player can get out at the curb. Box traffic of other colors is not added.

### 6. One furnished interior

- Rebuild the Marina Office interior, or the interior of the building from milestone 2, with furniture meshes and lights.
- The door stays a gap the player walks through.
- Acceptance: the player moves between two rooms without falling through the floor or teleporting.

### 7. Water, after the street holds up

- Sky reflection and a shoreline on the current shader. Boats keep using `waveHeight`.
- A new boat mesh only if it meets the vehicle bar. No jet ski until then.
- Acceptance: from the promenade, the water is visibly moving and reflects the sky, and the three boats stay offshore.

### 8. A second block

Only after milestones 1 through 3 are accepted in screenshots.

- Extend `layout.ts` by one block using the building from milestone 2 as the kit, plus variation in height and storefront.
- Extend the map from the same data.
- Acceptance: the new block does not introduce a new primitive style. The original mission still fits on the map.

## Explicitly later, each with its own approval

These are the long-term game. They are not the next pull request. Each one gets a short design note before code, and each one starts from the session and the layout, not from the parked engine.

- Businesses: buy or start one place, with wages, upkeep, and revenue.
- Property: one home or shop with a price, an owner, and rent or use.
- Garages and vehicle ownership, after milestone 5 is fun.
- More jobs that are not a copy of the delivery.
- Police, wanted level, and fictional robbery missions.
- Aircraft, an airfield, and a parachute.
- A full day-night cycle and weather. The lighting in milestone 1 should leave room for them.
- Deleting or archiving the unmounted engine, once nothing in the live HUD still imports it. The settings page still reads `GameConfig`. That cleanup is its own small change.

## How to work a milestone

1. Re-read `QUALITY_STANDARDS.md` and the asset row for that milestone.
2. Inspect the live files named above. Do not replace the controller or the session.
3. Implement the one change.
4. Run `npm test`, `npm run typecheck`, and `npm run build`.
5. Play it in the browser. Save street-level screenshots.
6. Compare the screenshots to the acceptance lines. Leave the milestone open if they miss.
7. Update the manifest. Say what is still temporary.

## Suggested first approval

Approve milestone 1, street materials and lighting, as the next code change. It does not throw away the crowd or the traffic, and it attacks the flat look directly. Milestones 2 and 3 can be researched in parallel, including whether a licensed human and a building GLB exist, without merging them.
