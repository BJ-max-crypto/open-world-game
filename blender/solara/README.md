# Solara Tower

Blender 5.3 project for the 180 m residential tower. `build_solara.py` is the source of the geometry. `solara-tower.blend` is the generated, editable scene: one collection each for the podium, balconies, glass, railings, metal, crown, lobby, and landscape.

The entrance is on Blender +Y. The glTF export turns that into three.js −Z, which is the side the player faces.

```bash
blender -b -P blender/solara/build_solara.py -- --stage full --render --export
```

Renders land in `blender/solara/renders/`. The game model is `public/models/buildings/solara-tower.glb`.
