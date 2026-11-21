[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/0xsilvaspace/leonida-heat-sixth-city/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/0xsilvaspace/leonida-heat-sixth-city/reward.svg)](https://make.fun/bounty/gta6-01)

# Leonida Heat: Sixth City

An original open-world crime game for the [Make GTA 6 bounty on make.fun](https://make.fun/bounty/gta6-01). Built by an AI agent for Samuel Kenneth Silva-Eboagwu. It plays offline in a desktop browser from static files, with no network requests, no Rockstar assets, logos, or music, and all sound synthesised with WebAudio.

## Story

Marcus Reed and Nia Solano owe $5,000 to the Bayfront crew. Five jobs stand between them and freedom, across a city that never stops watching: The Strip, the Docks, Palm Park, Bayfront, Night Market, and the Hideout. Pay it back before the heat catches up.

## How to play

Open `game/index.html` in a desktop browser, or serve the `game/` folder with any static server. No install step, no build step.

- **Move:** WASD or arrow keys
- **Steal / enter a car:** E (walk up to a car first)
- **Leave a car:** E
- **Fight:** F for fists, click or Space to shoot once you have the pistol
- **Pause / save:** P or Esc (the game saves to localStorage, Continue on the menu resumes it)
- **Touch:** on-screen D-pad, STEAL and SHOOT buttons on touch devices

## Features

- Open city on foot and by car, with 12 parked cars and 14 traffic cars
- 26 pedestrians who wander the sidewalks and flee when trouble starts
- Steal any car with E; stealing, hitting pedestrians, and shooting all raise your wanted level
- Wanted system, 1 to 5 stars, with police cars that chase, ram, and try to bust you on foot
- Combat with fists and a pistol pickup (12 rounds per pickup)
- 5 story missions: a Docks pickup, a Bayfront delivery, a timed Night Market run, losing the cops at the Hideout, and the Big Score on the Strip
- 12 cash stashes, health and pistol pickups
- HUD with health, cash toward the $5,000 debt, score, wanted stars, weapon, speed, and an in-game clock
- Live minimap with the mission target, police, and your position
- Start, pause, save and continue via localStorage
- Busted, Wasted, and Time Up end states, plus a Debt Paid ending with free roam after
- Touch D-pad and buttons for mobile

## Layout

- `game/index.html`, `game/style.css`, `game/game.js`: the whole game, plain static files
- `main.ts`: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library
- `vendor/makefun-game.ts`: the kit library, copied unchanged
- `screenshots/`: 4 real renders of this build

## License

MIT. See [LICENSE](LICENSE).
