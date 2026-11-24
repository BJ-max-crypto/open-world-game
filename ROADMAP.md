# THE COAST — roadmap

This is the order of work. One milestone lands at a time. A line is not done until it has been typechecked, built, and played.

## Already in the playable build

- Browser scene on React Three Fiber, with Rapier, a follow camera, and pointer lock.
- One waterfront district as a shared layout of meshes and colliders.
- Arrow-key movement relative to the camera, with acceleration, sprint, and jump.
- A rigged humanoid with idle, walk, run, jump, and land clips. The shipped mesh is a CC0 mannequin, not a final clothed character.
- A north-up mini-map and an M map that share the district layout. The world keeps running while the map is open.
- The Marina Office can be walked into. One door, two rooms, furniture collision.
- One delivery mission, a $250 start, and a one-time $500 payout.
- Local save for cash and that mission.
- No sign-in on the way into the city.

## Next milestones

1. **Arrow-key controller.** Done in this pass. Arrow keys walk relative to the camera. Shift, Space, E, mouse, and Escape stay. WASD no longer walks. Arrow keys do not scroll the page. Speed eases in and out.

2. **A believable first district.** The marina block exists as a blockout. Next is architecture, windows, entrances, road markings, sidewalks, and street furniture that read as a place. Keep the footprints in `layout.ts` so collision does not drift from the art. Do not grow the map yet.

3. **A character and environmental models.** Replace the capsule and the box buildings with original glTF from Blender. Colliders stay on the layout footprints.

4. **People and usable objects.** Inez can already be talked to. Add a few pedestrians with simple movement, and more than one kind of interaction, without simulating a whole day.

5. **Mission structure.** Generalize past the single delivery: objectives, rewards, progress, and more than one available job. Keep the rule that a payout happens once.

6. **Transactions.** Extend the ledger past cash-for-a-mission: type, description, time, and a refusal for invalid amounts. Still no bank until a later step needs one. The session remains the only writer.

7. **One vehicle.** Enter, drive, brake, steer, reverse, and exit a single original car. Physics should feel heavy. Ownership and a garage come after it is fun to drive.

8. **A business and a property.** One business with real costs and one property with a price and an owner. No collect button that skips the management.

9. **More ways to spend an hour.** A second kind of work that is not a delivery, plus light traffic. Leave weather, a full clock, and a phone until this is fun.

10. **A larger city and optional accounts.** New districts only after the first one holds up. Accounts and cloud saves stay off the play path until the single-player loop is stable. No multiplayer.

## Explicitly later

Day and night, weather, a mini-map, a phone, inventory, a bank balance, vehicle shops, employee wages, and highways. They are part of the design and not part of the current milestone.
