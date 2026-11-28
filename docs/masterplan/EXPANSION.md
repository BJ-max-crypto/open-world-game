# The Coast — city expansion

The built block is the downtown. Solara, Caliza, Vanta, and Cayo stay where they stand. This map puts the rest of the city around them. Nothing outside Phase 1 is generated.

Local meters become world meters by adding the anchor (640, 620). North is +Z. East is +X. The world is still 6.4 km by 5.2 km, flat, with the Atlantic on the east.

The older rectangles in `world.json` stay in code so the marina tests keep passing. They described the site before these towers existed. Build from this file, not from those rectangles.

## Districts

| District | Phase | World extent | Character |
| --- | --- | --- | --- |
| Downtown | 1, then more downtown only when asked | X −200 to 1200, Z 200 to 1600 | The towers already built, plus blocks, a hotel, shops, and a garage |
| Urban residential | 2 | X −1600 to −200, Z 200 to 1100 | Mid-rise apartments, local shops, wider residential streets |
| Luxury coastal | 3 | X −3200 to −200, Z −2600 to 200 | Canal houses, docks, pools, a few low apartment buildings |
| Lower-income neighborhood | 4 | X −1600 to −200, Z 1100 to 2600 | Older blocks, narrower streets, small businesses |
| Marina | 5 | X −200 to 1200, Z −800 to 200 | Yachts, docks, waterfront restaurants |
| Port | 5 | X −200 to 1700, Z −2600 to −800 | Warehouses and yards, separated from the marina by open land |
| Beachfront | 5 | X 1700 to 2450, Z −1500 to 1800 | Barrier-island beach, hotels set back from the dune |
| Suburbs | 6 | X −3200 to −1600, Z 200 to 2600 | Houses and lawns |
| Bayview park | 6 | X −200 to 1400, Z 1600 to 2600 | Park north of downtown |

Water sits in the bay (X 1200 to 1700) and the Atlantic (east of X 2450). The south edge of downtown, Z = 200, is the future shoreline. The towers are on land. The beach is not a straight yellow strip. It is the Atlantic face of the barrier island, with a dune between the sand and the hotels.

## How the roads connect later

Phase 1 builds the frame around the towers. The long roads are drawn on the map and stop at the edge of this phase.

- Meridian, the wide street north of Vanta, continues west into the urban residential streets and east toward the causeway.
- The south wharf road is the seam to the marina.
- Bay Street points east at the future bridge to the beach.
- The lower-income grid starts north of the urban band, on narrower streets.
- The port road stays south of the marina and does not enter the yacht basin.

## Phase 1, and only Phase 1

Four new buildings, on blocks that were empty:

- Lumen, a hotel east of Vanta, about 80 m, with a cut corner and balconies on the south face.
- Brisa, a stepped residential tower east of Solara, about 56 m, with three setbacks.
- Mercado, a retail block southwest of Cayo, about 21 m, with an arcade and awnings.
- Nave, a parking structure northwest of Caliza, open decks over a shopfront.

A plaza fills the southeast block instead of another tower. The new streets are Wharf, Meridian, Palm Court, and Bay Street. They meet the ring that is already around Solara. Solara remains the tallest building.
