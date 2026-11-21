// Leonida Heat: Sixth City, build script for the make.fun Make GTA 6 bounty.
// Node 22.18 or later. Run it yourself to write out/:
//   node main.ts
// This copies the playable static game in game/ to out/.
// It is a placeholder build script for this repo.
// The bounty also requires vendor/makefun-game.ts, copied from the make.fun
// kit unchanged, and that file must be added in the recorded submission
// session. Do not invent it here.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, 'out');
const gameDir = join(root, 'game');

if (!existsSync(gameDir)) {
  throw new Error('game/ not found next to main.ts');
}
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(gameDir, outDir, { recursive: true });
console.log('Leonida Heat built to out/. Open out/index.html in desktop Chrome to play.');
