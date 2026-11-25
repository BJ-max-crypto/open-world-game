# THE COAST — roadmap

The order of work is `DEVELOPMENT_ROADMAP.md`. This file only records what is already playable. A line is not done until it has been typechecked, built, and played. The next code change waits for approval of milestone 1 in that plan: street materials and lighting. Do not add more crowd members, box buildings, or box cars while that decision is open.

## Already in the playable build

- Browser scene on React Three Fiber, with Rapier, a follow camera, and pointer lock.
- One waterfront district as a shared layout of meshes and colliders.
- Arrow-key movement relative to the camera, with acceleration, sprint, and jump.
- A rigged humanoid with idle, walk, run, jump, and land clips. The shipped mesh is a CC0 mannequin, not a final clothed character.
- A north-up mini-map and an M map that share the district layout. The world keeps running while the map is open.
- The Marina Office can be walked into. One door, two rooms, furniture collision.
- Sidewalk pedestrians, lane traffic with a seated driver, and boats on a wave shader. The people and boats are CC0 low-poly models. The cars are original meshes. Photoreal scans are still missing. See `public/models/ASSETS.md`.
- One delivery mission, a $250 start, and a one-time $500 payout.
- Local save for cash and that mission.
- No sign-in on the way into the city.

## Waiting on approval

Milestone 1 is street materials and an environment map, on the current slabs. Milestone 2 is one building. Milestone 3 is one human replacing the mannequin. Businesses, property, a drivable car, crime, police, and flight come after the street holds up, each with its own approval. See `DEVELOPMENT_ROADMAP.md`.
