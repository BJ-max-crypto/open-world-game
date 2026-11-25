# THE COAST — asset requirements

This is the shopping list and the authoring contract. Nothing here is in the repository unless `public/models/ASSETS.md` names the file. Photogrammetry of real people, real cars, and real towers is not in the repo today.

`public/` contains zero image textures. Roads, walls, and clothing colors are material colors or a small canvas window grid. That is the main reason the district looks flat.

## Pipeline

1. Model and texture in Blender. One meter equals one scene meter.
2. Export GLB (glTF 2.0). Apply transforms. Keep the physics shape out of the beauty mesh.
3. Put the file under `public/models/` in the folder for its type.
4. Add a manifest row before any code references it.
5. Point the existing loader at the file: `people.ts` for a crowd member, `HumanAvatar` for the player, `layout.ts` only for the footprint the collider uses.
6. Screenshot the asset in the live lighting before calling it accepted.

Textures land as PNG or JPEG first. KTX2 and meshopt are a later compression pass, after a texture looks right uncompressed. Do not compress a texture that has not been accepted.

Draco or meshopt can wait until a building or a character is over a few megabytes. The current character files are about 1 MB each and are not the problem. The problem is the models themselves.

## License gate

Accept a file only when the license allows this public game to ship the bytes.

| Source to evaluate when a milestone is approved | Typical license | Use |
| --- | --- | --- |
| Poly Haven | CC0 | Asphalt, concrete, plaster, glass, HDRIs |
| ambientCG | CC0 | Ground and wall textures |
| Quaternius CC0 packs already in the repo | CC0 | Temporary people, plants, boats, street props |
| Newer Quaternius packs that forbid redistribution | Not acceptable | Do not download |

The eight crowd files are documented as CC0 because the distributing repository says so. The original Quaternius pack page was not available when they were added. They stay marked unverified-at-source and temporary.

Do not scrape a marketplace, a game, or a photo of a real street.

## Characters

### Player, one file, replaces `characters/player.glb`

Needed before any more crowd work:

- Adult proportions. Head, hands, and legs read as a person at camera distance.
- Face, hair, skin shader, clothes, shoes, fingers.
- Skeleton and in-place clips: idle, walk, sprint, jump start, jump loop, jump land.
- Feet at y = 0, facing +Z.
- A skin material that responds to the scene lights. The current mannequin is a single clay color.

If a redistributable model of this quality cannot be found, the milestone stops and names the pack that would have to be licensed. Another mannequin does not close the milestone.

### Crowd, after the player is accepted

A cast of separately recognizable people, not eight recolors of one body.

- Several faces, hairstyles, and outfits.
- At least two body types and an older adult.
- Clips: idle, walk, run, sit, and a talk or phone idle.
- The same foot and facing contract as the player.
- A seated driving pose that puts the hands near a wheel.

The current eight GLBs in `characters/people/` have Idle, Walk, Run, and SitDown. `Casual_Bald.glb` has no Run clip. The proportions are stylized, with oversized heads. They remain the temporary crowd. Do not add a ninth file from that pack.

Behaviors the simulation should grow into, once the meshes exist: enter a vehicle, drive, exit, stand and talk, sit on a bench, use a phone, walk a short errand into a shop. The path follower in `simulate.ts` can host those states. The animations do not exist yet, apart from idle, walk, run, and a sit-down.

## Buildings

The district has eight building footprints, including the Marina Office, Salt, Harbor House, the Market, the Yard Shop, Warehouse 3, Pier Tower, and the fuel stop. Each visible mesh is a box plus a window strip, a balcony slab, and a roof box.

For the first art milestone, replace one footprint. The others stay blockout until that one is accepted.

That one building needs:

- A modeled facade, a door, window frames, a roof, and a material set (wall, glass, metal, trim).
- Glass that reflects the sky once an environment map exists.
- A triangle budget on the order of 8,000 to 20,000 for a two- or three-story building. A tower can be higher if the far faces are simpler.
- A collider that stays the `layout.ts` box, or a reviewed hull under a few hundred triangles.

Later kits, not part of the first building:

- A downtown tower, a mid-rise, an apartment, a house, a hotel, a restaurant, a warehouse, an office, a parking garage, a gas canopy with pumps.
- Storefront signs as textures, not as another colored slab.
- Interior meshes for one shop and the Marina Office: floor, walls, furniture, lamps. The office interior today is boxes.

There is no building GLB in `public/models/buildings/` beyond the empty folder.

## Ground and street

Needed with the lighting pass, before more buildings:

- Asphalt with aggregate, a sidewalk concrete, a curb, and a crosswalk marking. Tiling textures, not unique photos of the whole road.
- Lane dashes and parking ticks can stay as geometry if they sit on a textured road.
- One HDRI of a late-day coast, used as the scene environment for reflections.

Still absent, and not required for the first street: manholes, drains, hydrants, bus shelters, benches with a real model, trash cans. The current benches are wood-colored boxes. The current streetlights and traffic lights are low-poly CC0 props and may stay until the building reads correctly.

## Vehicles

### One player car

- Body, wheels, lamps, glass, mirrors, a dashboard, seats, and a steering wheel.
- A seated character visible through the glass.
- Rough size of a real sedan: about 4.5 m long, 1.8 m wide, 1.5 m tall.
- A separate simple collider.

Road traffic today is `VehicleBody` in `src/game/world/life/CityLife.tsx`: boxes, a glass cabin, four cylinders, and emissive bars. Parked cars in `CoastDistrict` are the same idea. The manifest used to name `Traffic.tsx`. That file does not exist.

Categories to add only after the first car is accepted: SUV, sports car, luxury car, pickup, van, delivery truck, commercial truck. Each one is a real mesh. A new color on the box car does not count.

### Watercraft

Current files: `vehicles/skiff.glb`, `sailboat.glb`, `ferry.glb`, low-poly CC0. They move on paths and bob on `waveHeight`. They are temporary.

Later: a motorboat, a yacht, a fishing boat, a commercial hull, a jet ski. Each one needs a mesh that sits in the water, a path that stays offshore, and a wake only if it is cheap. Do not add a jet ski made of primitives.

## Ocean

`Ocean.tsx` is a displaced plane with fresnel, a shore tint, and a crest term. It is not a flat color, and it is not a finished ocean. The next water pass needs a sky reflection and a shoreline that meets the seawall. A captured water material is optional. The wave formula must stay shared with `waveHeight()` in `routes.ts` so boats remain on the surface.

## Environment dressing

`palm.glb`, `bush.glb`, and `tree.glb` are low-poly CC0. Enough for a blockout. A hero block needs one believable palm or broadleaf, with a trunk and a canopy that catch light, before the promenade is replanted.

## Animation list that does not exist yet

| Clip | Who needs it |
| --- | --- |
| Turn in place | Player and crowd |
| Talk | Crowd, Inez |
| Phone idle | Crowd |
| Sit on a bench, looping | Crowd |
| Enter vehicle, seated drive, exit | Crowd and the future player car |
| Walk with a dog | Later, and only with a dog model |

Inez plays Idle on the older-woman GLB. She has no conversation clip.

## What not to download in bulk

A folder of a hundred low-poly buildings would make the district busier and would still fail the visual bar. One accepted building, one accepted person, and one accepted car are the requirement. Variety comes after the first of each is good.
