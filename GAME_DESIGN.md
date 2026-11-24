# THE COAST — game design

THE COAST is an original coastal city. The player starts short on money and, over time, can earn, buy, and run things. The fantasy is freedom inside one city: walk, drive, take work, own a place, and decide what the money goes toward.

The city is not Miami, Los Angeles, San Diego, New York, or any existing game map. Districts, buildings, people, and vehicles are original. Visual references are only the feeling of a modern American coast: sun, water, concrete, glass, palms, and a working port next to a marina.

## What the player can do now

- Walk the waterfront in third person. Movement is relative to the camera, speeds up while a direction is held, and slows after it is released.
- Look with the mouse after a click. Escape releases the pointer.
- Talk to Inez, accept one delivery, collect three packages, and get paid once.
- Spend time in the district. Nothing else is for sale yet.

Starting cash is $250. The delivery pays $500. That is the whole economy in the playable build.

## What the city should become

One connected map, built district by district:

- Downtown
- Luxury waterfront
- Marina and beaches
- Industrial port
- Warehouses
- Residential streets
- A suburb
- Shopping
- Hotels and nightlife
- Highways and bridges

The current block is the marina and the first warehouse street. It is the seed, not the map. Buildings should end up with real proportions, windows, doors, and materials. Roads need markings, lights, sidewalks, and street furniture. The blockout may stay until a model is ready. New work should not add meaningless cubes that are not a place.

Later, the city needs pedestrians, traffic, a day and night cycle, weather, and ambient sound. Those are not in the playable build.

## Money

Money is the long progression, not a score that only ticks up.

The economy should grow to cover cash, a bank balance, income, expenses, purchases, business revenue, wages, vehicle prices, upgrades, and repeating costs. Every change is a transaction: amount, type, description, time, and the business or property involved when there is one. A reward cannot be claimed twice. A purchase cannot drive cash below zero.

The live delivery already follows that rule for one payout. There is no bank, no wage, and no catalog of prices yet. The HUD shows cash. It does not show a bank balance, because there is no bank.

The session owns the balance. Buttons do not add money by themselves.

## Ways to earn

The first job is a delivery with a walk, a pickup, and a return. Later work should not be the same loop with a new label. Transportation, a business, a property, a race, a build, and a contract should ask for different time and pay different money. The player should be able to ignore the story and do something else.

## Ownership

Businesses and properties are a later pillar. Buying one should change what the player has to manage: staff, costs, upgrades, and whether the place makes money. A collect button is not management. Properties need a price, an owner, and either a use or an income and an expense. None of that is playable yet.

## Missions

Missions need an objective, a reward, progress, and a finished state. The structure should allow a story mission, a side job, a repeatable contract, and a discovery at the same time. The player is not locked to one path.

Today there is one mission, A First Opportunity. Its states are available, active, and complete. Packages cannot be collected early, and the payout happens once.

## People and traffic

Inez is a stationary contact. Parked cars do not drive. There are no pedestrians. The next simulation step is a few people and cars that move believably and stay cheap to simulate, not a full schedule system.

## Presentation

The on-screen layer should feel like a game: cash, the current job, the objective, an interaction prompt, a mini-map, and later a phone, a pause menu, a transaction list, and ownership screens. The current HUD has cash, the mission, the objective, the package count, a notice, the E prompt, and a north-up mini-map. M opens the same map larger. The world keeps simulating. Walking keys are ignored until the map closes.

## Controls

Arrow keys move. Shift sprints. Space jumps. E interacts. M toggles the map. The mouse looks. Escape closes the map, or releases the pointer when the map is closed. Letter keys are not a second move set, so the control line stays one thing.

The Marina Office is the first building you can walk into. The door is a gap in the wall. The desk and the inner rooms have collision. More interiors should reuse that shell instead of a separate empty scene.
