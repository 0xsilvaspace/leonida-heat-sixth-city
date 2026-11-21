# Screenshots

Real renders of the rebuilt game's own code, captured 2026-11-21 in headless Chromium (Playwright 1.55.0, Chromium 140) at 1280x800, from a local server serving game/ on http://127.0.0.1:8000/ . No stock images, no art from other games, no mockups. The game was played with real keyboard input and a real click on START NEW GAME. The game was rebuilt from scratch in a recorded session on 2026-11-21, and these shots are of that new build. No changes were made to game.js for the shots.

1. `01-start.png` (111,974 bytes): start screen, LEONIDA HEAT title, story, controls, START NEW GAME and CONTINUE SAVED GAME buttons. Quantized to a 256 colour palette to get under the 256 KiB gate cap; the image is unchanged in content.
2. `02-driving.png` (47,631 bytes): driving, player in the pink stolen car at 276 mph on the road, police car chasing, traffic cars, HUD with 1 wanted star, health, cash, speed, live minimap, and the mission box for Mission 1.
3. `03-mission.png` (39,378 bytes): mission in progress, on foot as Marcus next to the pink parked car to steal, mission box "MISSION 1: FIRST WHEELS", cash stash, traffic cars, HUD and minimap, Palm Park in view.
4. `04-city.png` (39,387 bytes): on foot in the city at the Docks, Marcus by the DOCKS label, cash stashes, buildings, traffic, HUD and minimap.

## How they were captured

Playwright 1.55.0 was installed in workspace/makefun-bounties/playwright-env (not in this repo), using the cached Chromium 140 in ~/.cache/ms-playwright. The script opened the game, clicked START NEW GAME, walked with W to the parked car at (380,460), pressed E to steal it (wanted level went to 1, cars stolen went to 1), drove south with W at up to 480 speed, paused and resumed with P, completed Mission 1, picked up the pistol, then reloaded for the mission shot and teleported on foot to the Docks (2680,2120) for the city shot. State was checked after each step through the game's own test hook (window.__leonida.getState). All four shots were then opened and looked at.

## If Kenneth wants to retake any shot in his own Chrome

Open game/index.html in desktop Chrome, or serve game/ with `python3 -m http.server 8000` and open http://127.0.0.1:8000/ . Use a 1280x800 window.

1. Start screen: load the page, do not click anything, take the shot.
2. Driving: click START NEW GAME, walk with W to the pink parked car near (380,460), press E, then hold W to drive south on the road. Take the shot while the car is moving, with a wanted star showing.
3. Mission: after starting, walk north with W toward the same parked car without pressing E yet. The mission box will show Mission 1. Take the shot with Marcus next to the car.
4. City on foot at the Docks: drive or walk to the Docks (2680,2120) in the south east, press E to get out if driving, and take the shot. Buildings there are labelled DOCKS.

Save any retake with the same names above, in this folder, and keep each file under 262,144 bytes.
