# Northline

Northline is a small open district that runs in the browser. The city is built in code so the game plays before any art files are added. Drop glTF models into `public/models` later; the folders are already there.

## Run

```bash
npm install
npm run dev
```

Open the home page, pick a callsign, and enter the city.

| Key | Action |
| --- | --- |
| Click | Look around (pointer lock) |
| WASD | Walk, or drive |
| Shift | Sprint |
| Space | Jump on foot, brake in the cab |
| F | Enter or leave the cab |
| E | Buy or inspect a door |
| M | City map. Click to drop a pin |
| I | Pockets and properties |
| Esc | Pause |

The first fare is the yellow cab on Pier 4. Drive it to the park in Harbor Heights, step out, and the fare pays $500. The Night Loft on Civic Core is $600, so the shift is what makes the door affordable. The Yard Office stays out of reach.

Saves stay in this browser. Cloud sync is optional.

## Layout

```
public/                 models, textures, audio, fonts
src/app/                home, city, login, settings
src/game/engine/        loop, config, the Game object
src/game/world/         districts, streets, lighting
src/game/player/        body, input, camera
src/game/vehicles/      the cab and parked traffic
src/game/physics/       circle collision and gravity
src/game/npcs/          sidewalk walkers
src/game/missions/      First Fare
src/game/economy/       cash and the ledger
src/game/properties/    doors you can buy
src/game/inventory/     what you carry
src/game/audio/         footsteps, engine, stingers
src/game/interaction/   nearby prompts
src/components/         HUD, menus, map, management
src/lib/supabase/       browser client, server client, proxy session refresh
src/services/           profile, save, ledger
supabase/migrations/    Postgres schema and row level security
supabase/functions/     apply-transaction
```

## Supabase

The city runs with no project connected. Saves and the cash ledger stay in `localStorage`.

To sync them:

1. Create a project and copy the URL and publishable key into `.env.local` (see `.env.example`).
2. Apply `supabase/migrations/20261124140000_game_schema.sql`.
3. Deploy `apply-transaction`. It accepts a signed-in user, checks the new balance against the previous ledger row, and inserts with the user's own RLS client.

```bash
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
supabase functions deploy apply-transaction
```

The Next.js proxy (`src/proxy.ts`) refreshes the session with `getClaims()` when those keys exist. Profiles, saves, the ledger, properties, and inventory are readable only by the signed-in user. The new-user trigger lives in the `private` schema and is not exposed to the API. Callsigns in user metadata are display text only; policies use `auth.uid()`.

Do not put a secret key in the Next app. The edge function reads its keys from the Supabase runtime.

## Add a block

District geometry lives in `src/game/world/District.ts`. Buildings, the pier, trees, and the water volumes are one list. `staticColliders()` is what the player and the cab collide with, and the meshes are built from that same list. `tests/city.test.ts` fails if a building covers a road, the spawn, the cab, or a door.
