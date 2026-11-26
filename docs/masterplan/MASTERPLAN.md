# The Coast — geographic masterplan

Approved on 26 Nov 2026. The five choices at the end of this document were accepted as written.

The coordinate frame now lives in `src/game/world/masterplan/frame.ts`. Gameplay stays in local meters and adds the anchor (640, 620) to reach this map. The first built slice is the near yacht basin: the water south and east of the existing quay, out to the edge of the view. The rest of the 33 km² is not generated. The player, missions, kayak limits, and building colliders are unchanged.

The city is an original coastal place with a Miami-like climate and building culture: glass towers, canal houses, coral-stucco shops, palms, and a working port. It is not Miami, and it does not reuse Miami street names or real towers. The reference photographs are massing and planting direction, not textures.

North is +Z. East is +X. One unit is one meter. The ground is flat at Y = 0, except a beach dune of about 1.5 m and seawalls of about 0.7 m.

## 1. Geography

The world is 6.4 km east–west and 5.2 km north–south.

| Edge | Coordinate |
| --- | --- |
| West | X = −3200 |
| East | X = +3200 |
| South | Z = −2600 |
| North | Z = +2600 |

Five bands, from west to east:

1. **Western mainland.** Palm Grove in the northwest, Azure Shores in the southwest, and the inland half of Downtown, Brickell Heights, and Portside. Coast Highway runs through this band at X = −1750.
2. **Central urban waterfront.** Downtown and Brickell Heights meet the bay. The shore bends: it pushes east beside Downtown and steps back at the yacht basin.
3. **Bay and marina.** Open water between the mainland and the barrier island, plus the yacht basin on the basin's north quay. The basin's north edge is Z = 596.
4. **Eastern barrier island.** A long island from about Z = −1540 to Z = 1700, wider toward the south, plus a small north cay in the parkland. Oceanfront is the Atlantic face. The island's bay face holds marinas and the ends of the causeways.
5. **Atlantic Ocean.** Everything east of the beach, from roughly X = 1900 to the world edge at X = 3200. Two openings connect it to the bay: the north inlet around Z = 1760–2140, and the port channel around Z = −2060 to −1500.

Shorelines, the bay, the inlets, the canals, and both islands are polygons in `world.json`, not rectangles. District rectangles are administrative extents. Water wins where a rectangle crosses the shore, so the land area of a district is the rectangle with the water cut out.

Canals in Azure Shores run east–west at Z = −1280, −1680, −2080, and −2420, with a north–south collector at X = −1480. The collector meets the north canal at Azure Lock.

## 2. Districts

Edges touch. They do not share area. The check is in `render-map.mjs`.

| District | X | Z | Land character |
| --- | --- | --- | --- |
| Palm Grove | −3200 to −1100 | 400 to 2600 | Houses, lawns, canopy streets |
| Azure Shores | −3200 to −1100 | −2600 to 400 | Canal houses and private docks |
| Downtown | −1100 to 360 | 520 to 1680 | Commercial grid and the tallest towers |
| Brickell Heights | −1100 to 500 | −1100 to 520 | Spaced residential towers, curved balconies |
| Portside | −1100 to 900 | −2600 to −1100 | Sheds, yards, cranes |
| Bayview Parklands | −1100 to 2100 | 1680 to 2600 | Lawns, mangroves, boardwalks |
| Marina District | 500 to 1500 | 400 to 1100 | Yacht basin and low waterfront buildings |
| Oceanfront | 1500 to 2300 | −1550 to 1680 | Beach, hotels, coral-stucco shops |

Architectural identity:

- **Downtown.** Glass curtain wall, podiums built to the sidewalk, a 90 m street grid, cool gray-blue glass. One tower is allowed to be the tallest thing in the city. The rest step down toward the park and the bay.
- **Brickell Heights.** Residential floor plates, curved balconies, blue-green glass, more space between towers than Downtown. Rooftop pools read as setbacks, not as copies of any real building.
- **Palm Grove.** One and two stories, stucco, small lawns, palms and broadleaf trees in the planting strip. Streets bend. No towers.
- **Azure Shores.** Houses face the canals and keep a dock. A few 8–12 story buildings sit only at the lock and the canal mouths. Walls are sand and white stucco.
- **Oceanfront.** A public beach and dune on the Atlantic side of Lantern Road. Hotels stand on the inland side, set back from the dune. Two-story shops use coral stucco and cloth awnings. Palms are in a regular row, not a forest.
- **Marina District.** Piers, slips, and buildings under about 20 m, except Harbor Light. This district contains the game that already runs.
- **Portside.** Long sheds, container rows, cranes, and paved yards. One control tower. Little glass, no balconies.
- **Bayview Parklands.** Mowed ground, mangrove edge, paths, and one amphitheater. Buildings are pavilions.

## 3. Roads

Widths are the full right-of-way.

| Class | Width | Roads |
| --- | --- | --- |
| Freeway | 32–36 m | Coast Highway, Port Expressway |
| Boulevard | 22–24 m | Palm Avenue, Meridian Boulevard, Grove Connector, Waterfront Boulevard |
| Causeway | 16–18 m | North Causeway, Central Causeway, Brickell Bridge |
| Beach road | 16 m | Lantern Road |
| Downtown street | 12 m | 90 m grid inside Downtown |
| Residential | 10 m | Collectors in Palm Grove and Azure Shores |
| Service | 8 m | Port yards |
| Alley | 6 m | Mid-block in the Downtown grid, offset 45 m |

How they meet:

- **Coast Highway** is the only road that runs the full north–south length, at X = −1750.
- **Port Expressway** crosses it at (−1750, −1850) and ends at the port quay, X = 200. It does not bridge the shipping channel.
- **Palm Avenue** (X = −2300) crosses both freeways and is the spine of Palm Grove and Azure Shores.
- **Meridian Boulevard** (X = −520) carries Brickell Heights into Downtown.
- **Grove Connector** (Z = 1100) links Coast Highway to the Downtown grid.
- **Waterfront Boulevard** follows the mainland shore from Bayview Parklands to the marina quay.
- **Three bay crossings.** North Causeway at Z = 1980, through the park and the north inlet. Central Causeway at Z = 480, a bascule over the yacht basin, then onto the island. Brickell Bridge at Z = −240, the south crossing onto the island.
- **Lantern Road** runs the Atlantic side of the barrier island and meets all three crossings.
- **Harbor Avenue** loops the yacht basin and meets the Central Causeway.
- The **Downtown grid** is bounded by the district: X = −980 to 240, Z = 600 to 1600. It does not cross the bay.
- Palm Grove and Azure Shores show collectors on this map, about 500–700 m apart. Later lot streets are 9–10 m wide, blocks about 80–110 m, and no dead end longer than 180 m. Every local street must reach Palm Avenue, Coast Highway, or a collector.
- Port service roads stay inside Portside and reach the expressway.

## 4. Building density

Coverage is the share of land under a footprint, not counting roads and water.

| Place | Usual height | Peak | Coverage | Rule that keeps it from repeating |
| --- | --- | --- | --- | --- |
| Downtown core, X −600 to 100, Z 800 to 1400 | 80–160 m | 276 m | 0.42 | One peak parcel. Neighbors cannot share both height and facade. |
| Rest of Downtown | 25–60 m | 90 m | 0.35 | Podium of 2–4 floors, then a setback. |
| Brickell Heights | 36–110 m | 168 m | 0.28 | Towers stand apart. Curved plates, not a copied skyline. |
| Palm Grove | 6–9 m | 12 m | 0.22 | Houses. Trees in the right-of-way. |
| Azure Shores houses | 7–12 m | 14 m | 0.18 | Frontage on a canal or a street, not both as towers. |
| Azure canal nodes | 24–40 m | 48 m | 0.15 | Only at Azure Lock and the canal mouths. |
| Oceanfront hotels | 28–55 m | 72 m | 0.20 | At least 40 m behind the dune. |
| Oceanfront shops | 8–12 m | 14 m | 0.30 | Two stories, awnings, no tower on the beach road. |
| Marina District | 8–18 m | 32 m | 0.20 | Piers stay low. |
| Portside | 10–18 m | 55 m | 0.35 | Big sheds. The peak is the control tower only. |
| Bayview Parklands | 0–6 m | 12 m | 0.02 | Pavilions and the amphitheater. |

Heights are chosen per parcel from the range, then snapped to a 3.2 m residential floor or a 4 m commercial floor. Adjacent parcels must differ in height or in facade family. Each district has four facade families. The family is a hash of the parcel id, not a hand-placed clone stamp.

Setbacks: Downtown podiums may meet the sidewalk. Brickell towers sit 8 m back. Houses sit 3 m back. Hotels sit 40 m behind the dune line. Nothing is built in a road polygon or a water polygon.

## 5. Landmarks

These parcels are reserved. The generator does not replace them.

| Name | District | X | Z | Height | Role |
| --- | --- | --- | --- | --- | --- |
| Helion Tower | Downtown | −240 | 1080 | 276 m | Tallest building, glass shaft and crown |
| Civic Hall | Downtown | 40 | 1460 | 42 m | Low public building on the north grid |
| The Meridian | Brickell Heights | −180 | −80 | 168 m | Pair of curved residential towers |
| Grove Market | Palm Grove | −2300 | 1560 | 10 m | Neighborhood market hall |
| Azure Lock | Azure Shores | −1480 | −1280 | 8 m | Canal gate where the collector meets the north canal |
| Lantern Hotel | Oceanfront | 1680 | 460 | 64 m | Beach hotel, inland of Lantern Road |
| East Pier | Oceanfront | 2140 | 180 | 4 m | Public pier into the Atlantic |
| Marina Office | Marina District | 612 | 620.5 | 5.4 m | The office that already exists in the game |
| Harbor Light | Marina District | 1040 | 560 | 22 m | Light on the basin quay |
| Port Beacon | Portside | −700 | −1400 | 55 m | Port control tower, on land north of the channel |
| Bayview Shell | Bayview Parklands | 80 | 2080 | 8 m | Amphitheater |
| Central Bascule | Marina District | 900 | 480 | 12 m | Drawbridge where the Central Causeway crosses the basin |

## 6. Where the current game sits

The playable district is about 96 m by 62 m. Its local origin moves to world (640, 620) with no rotation:

```
worldX = localX + 640
worldZ = localZ + 620
worldY = localY
```

The seawall, local Z = −23.55, lands on world Z = 596.45. That is the north edge of the yacht basin. Water in the current game is to the south of the player. In this plan that water is the basin, which opens into the bay and, through the inlets, the Atlantic. The Atlantic itself is east of the barrier island, about 1.5 km from the Marina Office.

Spawn, local (−6, −19.6), is world (634, 600.4), on the quay. The Marina Office, local (−28, 0.5), is world (612, 620.5).

The in-game minimap keeps drawing the playable district. This masterplan map does not replace it.

## 7. Procedural generation, when building starts

The frame module is in the game. The generator is not. `world.json` is still the data model. A later generator would:

1. Cut the world into 200 m chunks. 6400 / 200 = 32 columns and 5200 / 200 = 26 rows. A chunk id is `floor((x + 3200) / 200)` and `floor((z + 2600) / 200)`.
2. Rasterize water, islands, and district ids into the chunk.
3. Clip the road graph to the chunk and build sidewalks from the right-of-way.
4. Turn closed street blocks into parcels. Apply the density table and the setback rules.
5. Stamp landmark parcels on top of the random parcels.
6. Scatter trees from the district coverage, denser in Palm Grove and Bayview, almost none in Portside.
7. Build colliders only for the chunk the player is in and its neighbors, using the same footprint-then-mesh pattern as `layout.ts`.

The active game would stream a handful of chunks, not 832. Buildings are a small grammar per district (podium, shaft, crown, or house, or shed), instanced, not a unique mesh for every address. Water stays one surface. The playable marina chunk keeps the hand-authored `layout.ts` footprints until a later change replaces that chunk on purpose.

Unreal is still the note in `docs/UNREAL_58.md`. The same polygons would convert with `UE (X, Y, Z) = (z, x, height) × 100`. This plan does not create an Unreal project.

## 8. Free assets

No new purchases. A file enters the game only with a license row in `public/models/ASSETS.md`.

| Need | Where it can come from | License |
| --- | --- | --- |
| Ground, asphalt, concrete, plaster, glass | Poly Haven, ambientCG | CC0 |
| Sky and reflections | Poly Haven HDRIs | CC0, sky-only when a real city would show in the reflection |
| Trees, shrubs, rocks | Kenney or other packs that allow redistribution | Confirm the pack, not the site banner |
| People | The CC0 figures already in the game, until a redistributable clothed set exists | Already recorded |
| Cars and boats | Original meshes, or CC0 if the file may be shipped | — |
| Towers, houses, sheds | Built in Blender 5.3 from the district grammar | Original |

Do not use Megascans, Fab, or any paid library. Do not drop in a Sketchfab model that has no redistribution grant. Do not trace the reference photographs into textures. Quaternius packs that forbid redistribution stay out, as they already do.

Facades that repeat are a Blender script problem: four families per district, generated from the parcel hash, exported with the rules in `docs/BLENDER_EXPORT.md`.

## Map

`docs/masterplan/coast-masterplan.svg` is the top-down drawing. `node docs/masterplan/render-map.mjs` redraws it from `world.json` and refuses to write if two districts overlap or a landmark sits outside its district.

## Approval

Accepted on 26 Nov 2026, as written:

1. Atlantic on the east, and the current water remaining the south side of the yacht basin.
2. The eight district rectangles and their height ranges.
3. Coast Highway on the west side of Downtown, and three bay crossings.
4. Landmark sites in the table above.
5. 200 m chunks, with `layout.ts` still owning the playable marina until that chunk is replaced on purpose.

The playable block crosses the corner of chunks (19, 15) and (19, 16) because the anchor sits near a chunk boundary. The near basin water covers the south of that corner. Later chunks wait.
