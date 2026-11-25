# Asset manifest

Licenses below are the ones named by the distributors. Photogrammetry scans of real people, real cars, and real towers are not in this repository.

## Characters

| File | What it is | License | Source |
| --- | --- | --- | --- |
| `characters/player.glb` | Quaternius Universal Animation Library mannequin. Rigged, in-place locomotion. Not clothed. | CC0 | Quaternius, mirrored for the player pipeline |
| `characters/people/*.glb` | Eight low-poly clothed people: casual, suit, worker, doctor, an older woman, and a bald man. Each file has Idle, Walk, Run, and SitDown. They are stylized game characters, not photoreal scans. | CC0, as stated by the Quaternius pack note in the distributing repository | Quaternius Ultimate Animated Characters, files from `Yametech12/ghostname-3d-assets` |

Drop a replacement GLB beside these and point `PEOPLE` in `src/game/world/life/people.ts` at it. The crowd reads Idle, Walk, Run, and SitDown.

## Environment and vehicles

| File | What it is | License | Source |
| --- | --- | --- | --- |
| `environment/palm.glb`, `bush.glb`, `tree.glb` | Low-poly plants | CC0 | Quaternius Ultimate Nature Pack, via the Quaternius showcase mirror |
| `props/streetlight.glb`, `props/traffic-light.glb` | Low-poly street kit | CC0 | Quaternius Modular Streets Pack |
| `vehicles/skiff.glb`, `sailboat.glb`, `ferry.glb` | Low-poly boats | CC0 | Quaternius Ships Pack |
| `vehicles/kayak.glb` | A textured kayak hull, about 2 m in the file and scaled to about 4.3 m in the scene. The player boards it from the dock and paddles. It is not a scanned production boat. | Supplied for this project. No license text was in the file. | Project upload |

Road cars are original meshes in `Traffic.tsx` (body, glass, wheels, lamps). They are not scanned vehicles. A licensed car GLB can replace `VehicleBody`.

## Still needed for a photoreal city

- Clothed photoreal human scans or MetaHuman-class GLBs with walk, idle, turn, and sit clips.
- Architect-modeled towers, storefronts, and a marina, with PBR textures.
- Scanned or production cars with interiors.
- A shoreline-captured or simulated ocean material beyond the Gerstner shader in `Ocean.tsx`.
