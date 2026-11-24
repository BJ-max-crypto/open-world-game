# Player character

`player.glb` is the Quaternius Universal Animation Library mannequin (CC0). It is a full-body rigged humanoid, about 1.83 m tall, with a 65-bone skeleton. It is not a clothed photoreal scan. Drop a replacement file at this exact path to change the body. Keep the clip names, or update `CLIP_NAMES` in `src/game/player/locomotion.ts`.

Clips the game plays:

- `Idle_Loop`
- `Walk_Loop`
- `Sprint_Loop`
- `Jump_Start`
- `Jump_Loop`
- `Jump_Land`

The mesh should face +Z, with feet on y = 0. Locomotion is in place. The kinematic body moves the character; the clips do not carry root motion.

A later clothed character can replace this file without changing the collider, the camera, or the map.
