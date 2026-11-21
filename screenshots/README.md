# Screenshots

Real renders of this game's own code, captured 2026-11-21 in headless Chromium (Playwright, Chromium 140) at 1280x800, from a local server serving game/ on http://127.0.0.1:8000/ . No stock images, no art from other games, no mockups. The game was played with real keyboard input and a real click on START NEW GAME. No changes were made to game.js.

1. `01-start.png` (417,523 bytes): start screen, LEONIDA HEAT title, story, controls, START NEW GAME and CONTINUE SAVED GAME buttons.
2. `02-driving.png` (44,105 bytes): driving, player car (pink, gold outline) near The Strip, police car chasing, traffic cars, HUD with 1 wanted star, health, cash $250, speed, live minimap, and the mission box for Mission 1. Note: the car is stopped at 1 mph, wedged at a building corner after the drive, so this shows a chase scene, not open road speed.
3. `03-mission.png` (37,735 bytes): mission in progress, on foot as Marcus next to the parked car to steal, mission box "MISSION 1: FIRST WHEELS", waypoint arrow, cash stash, traffic cars, HUD and minimap.
4. `04-city.png` (47,724 bytes): on foot in the city near The Strip, Marcus after leaving the car ("You left the car" toast), traffic cars on the road, buildings, cash stashes, waypoint arrow, HUD and minimap. Note: this was meant to be at the Docks, but the car got stuck on a building on the way there, so this shot is at The Strip instead. It still shows on foot play in the city.

## How they were captured

Chromium was not in this VM at first. Playwright 1.55.0 was installed in /tmp/leonida-shot (not in this repo), then Chromium was downloaded there. The script opened the game, clicked START NEW GAME, walked with WASD to the parked car at (380,460), pressed E to steal it (wanted level went to 1, cars stolen went to 1), drove toward the Strip with steering by the car angle, then got out with E for the on foot shot. State was checked after each step through the game's own test hook (window.__leonida.getState). All four shots were then opened and looked at.

## If Kenneth wants to retake any shot in his own Chrome

Open game/index.html in desktop Chrome, or serve game/ with `python3 -m http.server 8000` and open http://127.0.0.1:8000/ . Use a 1280x800 window.

1. Start screen: load the page, do not click anything, take the shot.
2. Driving: click START NEW GAME, walk with D then S to the pink parked car near (380,460), press E, then hold W and steer with A and D toward the Strip (1700,900). Take the shot while the car is moving in the middle of a road, with a wanted star showing.
3. Mission: after starting, walk to the same parked car without pressing E yet. The mission box and waypoint arrow will show Mission 1. Take the shot with Marcus next to the car.
4. City on foot at the Docks: drive to the Docks (2680,2120) by steering east then south on the roads, press E to get out, walk a few steps with A, and take the shot. Buildings there are labelled DOCKS.

Save any retake with the same names above, in this folder.
