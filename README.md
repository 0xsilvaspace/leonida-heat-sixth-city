# Leonida Heat: Sixth City

An original open world crime game, in the spirit of GTA 6, built for the make.fun bounty **Make GTA 6** (gta6-01, $1,666, ends Tue Nov 24 2026 at 3:00 PM UTC).

Play it offline, in a desktop browser, from its own files. No network requests, no Rockstar content, no copied art, no copied music. All city, characters, vehicles, names, story, art and sound are original.

## The story

Marcus Reed and Nia Solano owe $5,000 to the Bayfront crew. Five jobs stand between them and freedom. Steal cars, lose the police, run the deliveries, and do not get caught.

## How to play

Open `game/index.html` in Chrome, or serve the `game/` folder and open it:

```bash
cd game
python3 -m http.server 8000
```

Then open http://127.0.0.1:8000/ in your browser and press **START NEW GAME**.

Your save is stored in this browser only, under localStorage. Press **CONTINUE SAVED GAME** to pick up where you left off.

## Controls

| Action | Key |
|---|---|
| Move on foot | WASD or Arrow keys |
| Run | Shift |
| Enter or steal a car | E |
| Drive | W accelerate, S brake or reverse, A and D steer |
| Hit, or shoot if you have the pistol | Space, or click the mouse |
| Pause | P or Esc |
| Sound on or off | M |

Touch: on screen D-pad, ENTER, HIT and RUN buttons appear on touch devices.

## What is in the game

- A city on foot and by car, with roads, buildings, Palm Park, Bayfront beach, the Strip, the Night Market and the Docks
- Traffic cars and pedestrians, with parked cars to steal
- A wanted level, 1 to 5 stars, with police cars that chase you
- 5 story missions with a waypoint marker, rewards and a final timed run
- Combat, on foot and with a pistol pickup, plus rival gang members at the Docks
- A HUD with health, cash, score, wanted stars, weapon, speed, clock, and a live minimap
- Cash stashes, health and pistol pickups around the city
- Start screen, pause screen, Busted, Wasted and Time Up screens, and save and continue
- Synthesised sound effects only, made with WebAudio, no audio files

## Missions

1. First Wheels: steal a car and drive to Bayfront
2. Bayfront Pickup: collect the package, deliver it to Palm Park
3. Heat on the Strip: reach 2 stars wanted, then lose them
4. Dockside Deal: grab the cash at the Docks and deal with rivals
5. Sixth City King: final timed drive to the Hideout, 90 seconds

Free roam continues after mission 5. Collect the 12 cash stashes and build your score.

## Files

- `game/index.html` : the playable game page
- `game/style.css` : HUD, menus and touch controls
- `game/game.js` : the whole game, canvas rendering, missions, police, traffic and save
- `main.ts` : a small Node 22 build script, it copies `game/` to `out/`
- `screenshots/` : 3 or 4 real renders of the game, to be captured in desktop Chrome before submission
- `LICENSE` : MIT

## Bounty notes, read before submitting

This repo alone is not a complete make.fun entry yet. The bounty also asks for:

- `vendor/makefun-game.ts`, copied from the make.fun kit unchanged
- 3 or 4 screenshots under `screenshots/`, real renders of this game's own code
- The sealed recordings of the agent sessions that built it, made by the kit's record command while the agent worked

Those three items must be produced in a recorded agent session, using the kit, before submission. Do not submit this repo as it stands without them. At most 5 submissions a day and 10 in all, and your last submission before the deadline is your final entry.

## License

MIT. See `LICENSE`.
