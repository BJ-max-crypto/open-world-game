# Blender export for the Coast

Blender 5.3.0 is the DCC. One source file can feed the browser now and Unreal 5.8 later. The browser import path is glTF. The future Unreal import path is FBX. Do not keep two different meshes.

## Scene units

- Meters. Unit scale 1.0.
- Apply scale and rotation before export (`Ctrl+A`).
- Forward is +Y in Blender. glTF export converts that to +Z, which is the browser’s forward. The player and the crowd already face +Z.
- Feet of a character sit at Z = 0. The origin of a building is the center of its `layout.ts` footprint, on the ground.
- A 4.5 m car is 4.5 units long, not 450.

## Names

`coast_<kind>_<name>_<variant>`

Examples: `coast_bldg_harbor_a`, `coast_prop_bench_a`, `coast_veh_sedan_a`.

Collision is a separate object, prefix `UBX_` for a box or `UCX_` for a convex hull, and it is not the render mesh. In the browser the collider stays the footprint in `layout.ts` until that hull is reviewed.

## Textures

PNG or JPEG, 1K until a shot proves 2K is needed. Metal/roughness, not specular/gloss. Normal maps are OpenGL (+Y) for glTF. Unreal’s FBX importer flips the green channel; export a DirectX normal only in the FBX set, and keep the glTF set on the OpenGL map.

Names: `<asset>_diff`, `<asset>_nor`, `<asset>_rough`, `<asset>_metal`.

## Two exports from the same file

1. glTF binary (`.glb`) into `public/models/`. Draco off until the file is large. This is what the browser loads.
2. FBX, scale 1, apply transform, into `unreal/Coast/Import/` when that folder exists. Skeletal meshes use FBX. Do not author a second topology for Unreal.

## Characters

In-place clips only. Browser clip names stay `Idle`, `Walk`, `Run`, `SitDown` for the crowd and `Idle_Loop`, `Walk_Loop`, `Sprint_Loop`, `Jump_Start`, `Jump_Loop`, `Jump_Land` for the player. A new clip is added in the same change as the file that plays it.

## What not to export

A cube with a color is not a building. A box with four cylinders is not a car. If the Blender file is a block-out, the manifest says `temporary`.
