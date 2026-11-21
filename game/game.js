// Leonida Heat: Sixth City. An original open world crime game.
// All city, characters, story, art and sound are original. No Rockstar
// content, no external requests, no audio files. Sound is synthesised
// with WebAudio. Play it offline in a desktop browser.
'use strict';

const W = 3200, H = 2400;
const VIEW_W = 1280, VIEW_H = 800;
const SAVE_KEY = 'leonida-heat-save';

// Seeded random so the city is the same every run.
let seed = 1337;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function rr(a, b) { return a + rnd() * (b - a); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

const ROADS_X = [400, 1100, 1800, 2500];
const ROADS_Y = [400, 1000, 1600, 2100];
const ROAD_W = 120;

const DISTRICTS = [
  { name: 'PALM PARK', x: 350, y: 300 },
  { name: 'NIGHT MARKET', x: 2500, y: 300 },
  { name: 'HIDEOUT', x: 2900, y: 300 },
  { name: 'THE STRIP', x: 1800, y: 1000 },
  { name: 'BAYFRONT', x: 350, y: 2100 },
  { name: 'DOCKS', x: 2850, y: 2100 },
];

// Buildings fill the blocks between roads.
const buildings = [];
(function buildCity() {
  // Blocks are the land BETWEEN roads. A road spans 60 px each side of its
  // centre line, so a block runs from one road's far edge to the next road's
  // near edge. Buildings never sit on a road.
  const xs = [0];
  for (const rx of ROADS_X) { xs.push(rx - ROAD_W / 2, rx + ROAD_W / 2); }
  xs.push(W);
  const ys = [0];
  for (const ry of ROADS_Y) { ys.push(ry - ROAD_W / 2, ry + ROAD_W / 2); }
  ys.push(H);
  const cols = ['#2e4a68', '#4a2e5e', '#5e3a2e', '#2e5e4a', '#5e5e2e', '#3a3a4a'];
  for (let i = 0; i < xs.length - 1; i += 2) {
    for (let j = 0; j < ys.length - 1; j += 2) {
      const bx = xs[i] + 30, by = ys[j] + 30;
      const bw = xs[i + 1] - xs[i] - 60, bh = ys[j + 1] - ys[j] - 60;
      if (bw < 120 || bh < 120) continue;
      // Palm Park stays open green space.
      if (i === 0 && j === 0) continue;
      const n = 1 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) {
        const w = rr(140, Math.max(150, bw - 40));
        const h = rr(120, Math.max(130, bh - 40));
        const x = bx + rr(0, Math.max(1, bw - w));
        const y = by + rr(0, Math.max(1, bh - h));
        buildings.push({ x, y, w, h, c: cols[Math.floor(rnd() * cols.length)] });
      }
    }
  }
})();

function onRoad(x, y) {
  for (const rx of ROADS_X) if (Math.abs(x - rx) < ROAD_W / 2 + 20) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) < ROAD_W / 2 + 20) return true;
  return false;
}
function hitsBuilding(x, y, r) {
  for (const b of buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}
function freeSpot(x, y, r) {
  return !hitsBuilding(x, y, r) && x > 40 && y > 40 && x < W - 40 && y < H - 40;
}

const PARKED_SPOTS = [
  [380, 460], [1080, 520], [1820, 430], [2480, 500], [430, 980], [1120, 1020],
  [1780, 1080], [2520, 990], [420, 1620], [1100, 1580], [1800, 1620], [2500, 1590],
];
const CAR_COLORS = ['#ff5da2', '#37b6ff', '#ffd75e', '#ff7a3c', '#9dff5e', '#c05eff'];
const STASH_SPOTS = [
  [700, 700], [1500, 700], [2200, 700], [2900, 700], [700, 1300], [1500, 1300],
  [2200, 1300], [2900, 1300], [700, 1900], [1500, 1900], [2200, 1900], [2900, 1900],
];

const MISSIONS = [
  { title: 'MISSION 1: FIRST WHEELS', text: 'Steal a car. Walk to a parked car and press E.', wp: null },
  { title: 'MISSION 2: BAYFRONT PICKUP', text: 'Drive to Bayfront, pick up the package, then deliver it to Palm Park.', wp: { x: 350, y: 2100, label: 'BAYFRONT' } },
  { title: 'MISSION 3: HEAT ON THE STRIP', text: 'Reach 2 wanted stars on the Strip, then lose the heat until you have 0 stars.', wp: { x: 1800, y: 1000, label: 'THE STRIP' } },
  { title: 'MISSION 4: DOCKSIDE DEAL', text: 'Grab the cash at the Docks and deal with the 3 rivals waiting there.', wp: { x: 2850, y: 2100, label: 'DOCKS' } },
  { title: 'MISSION 5: SIXTH CITY KING', text: 'Timed run: reach the Hideout in 90 seconds.', wp: { x: 2900, y: 300, label: 'HIDEOUT' } },
];

// ---- audio, all synthesised ----
let audioCtx = null, soundOn = true, engineOsc = null;
function ac() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; } }
  return audioCtx;
}
function beep(freq, dur, type, vol) {
  if (!soundOn) return;
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'square'; o.frequency.value = freq;
  g.gain.setValueAtTime(vol || 0.08, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + dur);
}
const sfx = {
  pickup() { beep(880, 0.12, 'sine', 0.12); setTimeout(() => beep(1320, 0.15, 'sine', 0.12), 90); },
  punch() { beep(160, 0.08, 'sawtooth', 0.1); },
  shot() { beep(1200, 0.06, 'square', 0.12); setTimeout(() => beep(300, 0.1, 'square', 0.08), 40); },
  steal() { beep(440, 0.1, 'square', 0.1); setTimeout(() => beep(660, 0.12, 'square', 0.1), 100); },
  siren() { beep(700, 0.18, 'sine', 0.06); setTimeout(() => beep(950, 0.18, 'sine', 0.06), 180); },
  mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'sine', 0.12), i * 130)); },
  fail() { [400, 300, 200].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'sawtooth', 0.1), i * 150)); },
};
function engine(on, speed) {
  if (!soundOn) on = false;
  const c = ac(); if (!c) return;
  if (on && !engineOsc) {
    engineOsc = c.createOscillator(); const g = c.createGain();
    engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 60;
    g.gain.value = 0.03; engineOsc.connect(g); g.connect(c.destination);
    engineOsc.start(); engineOsc._g = g;
  } else if (!on && engineOsc) {
    try { engineOsc.stop(); } catch (e) {}
    engineOsc = null;
  }
  if (engineOsc) engineOsc.frequency.value = 50 + Math.abs(speed) * 0.35;
}

// ---- game state ----
const S = {
  mode: 'title', // title | play | pause | end
  player: { x: 380, y: 560, angle: 0, health: 100, inCar: null, speed: 0 },
  cash: 0, score: 0, wanted: 0, weapon: 'fists', ammo: 0,
  mission: 0, missionStage: 0, missionTimer: 0, rivalsDown: 0,
  clockMin: 8 * 60, playSeconds: 0, carsStolen: 0, stashes: 0,
  wantedQuiet: 0, endReason: '', message: '', messageT: 0, banner: '', bannerT: 0,
  shots: 0, punches: 0,
};

const parked = PARKED_SPOTS.map((p, i) => ({ x: p[0], y: p[1], angle: (i % 2 ? 0 : Math.PI / 2), color: CAR_COLORS[i % CAR_COLORS.length], taken: false }));
const traffic = [];
for (let i = 0; i < 14; i++) {
  const horiz = i % 2 === 0;
  traffic.push({
    x: horiz ? rr(100, W - 100) : ROADS_X[i % ROADS_X.length],
    y: horiz ? ROADS_Y[i % ROADS_Y.length] : rr(100, H - 100),
    angle: horiz ? (i % 4 < 2 ? 0 : Math.PI) : (i % 4 < 2 ? Math.PI / 2 : -Math.PI / 2),
    speed: rr(90, 150), color: CAR_COLORS[(i + 2) % CAR_COLORS.length], horiz,
  });
}
const peds = [];
for (let i = 0; i < 26; i++) {
  let x, y, tries = 0;
  do { x = rr(100, W - 100); y = rr(100, H - 100); tries++; } while (onRoad(x, y) && tries < 20);
  peds.push({ x, y, angle: rr(0, Math.PI * 2), speed: rr(25, 45), hp: 1, pause: rr(0, 3) });
}
const stashes = STASH_SPOTS.map(p => ({ x: p[0], y: p[1], got: false }));
const healthPacks = [{ x: 700, y: 1000 }, { x: 2200, y: 1600 }, { x: 1500, y: 2200 }].map(p => ({ ...p, got: false }));
const pistolSpot = { x: 1800, y: 1300, got: false };
const rivals = [];
let police = [];
let bullets = [];
let lastSiren = 0;

function mission() { return MISSIONS[S.mission]; }
function setMissionText(t) { document.getElementById('mission-text').textContent = t; }
function toast(msg, secs) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.style.opacity = 1;
  S.message = msg; S.messageT = secs || 2.5;
}
function banner(text, secs) {
  const el = document.getElementById('banner');
  el.textContent = text; el.style.opacity = 1;
  S.banner = text; S.bannerT = secs || 2;
}
function addWanted(n) {
  S.wanted = clamp(S.wanted + n, 0, 5);
  S.wantedQuiet = 0;
  updateHUD();
}
function completeMission(reward) {
  S.cash += reward; S.score += reward * 2 + 500;
  sfx.mission();
  banner('MISSION COMPLETE', 2.5);
  toast('+' + reward + ' cash. Nia: nice work, Marcus.', 3);
  S.mission++;
  S.missionStage = 0; S.rivalsDown = 0;
  if (S.mission >= MISSIONS.length) {
    banner('YOU DID IT', 3);
    setMissionText('Free roam. You owe the Bayfront crew nothing. Collect the 12 cash stashes and build your score.');
    document.getElementById('mission-title').textContent = 'FREE ROAM';
  } else {
    document.getElementById('mission-title').textContent = mission().title;
    setMissionText(mission().text);
  }
  updateHUD();
}
function endGame(reason) {
  S.mode = 'end'; S.endReason = reason;
  engine(false);
  sfx.fail();
  const t = document.getElementById('end-title');
  const x = document.getElementById('end-text');
  if (reason === 'busted') { t.textContent = 'BUSTED'; x.textContent = 'The police caught you. The Bayfront crew is still waiting for its $5,000.'; }
  else if (reason === 'wasted') { t.textContent = 'WASTED'; x.textContent = 'Marcus went down. Nia will have to finish the jobs alone.'; }
  else { t.textContent = 'TIME UP'; x.textContent = 'The 90 seconds ran out before you reached the Hideout.'; }
  document.getElementById('end-stats').innerHTML =
    'Cash $' + S.cash + ' &nbsp; Score ' + S.score + ' &nbsp; Missions done ' + Math.min(S.mission, 5) +
    ' &nbsp; Cars stolen ' + S.carsStolen + ' &nbsp; Stashes ' + S.stashes + '/12';
  document.getElementById('end-screen').classList.remove('hidden');
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('pause-screen').classList.add('hidden');
  saveGame();
}

// ---- input ----
const keys = {};
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  if (S.mode !== 'play') return;
  if (e.key === 'e' || e.key === 'E') tryEnterCar();
  if (e.key === ' ') doAttack();
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') pauseGame();
  if (e.key === 'm' || e.key === 'M') { soundOn = !soundOn; toast(soundOn ? 'Sound on' : 'Sound off', 1.5); if (!soundOn) engine(false); }
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
document.querySelectorAll('#dpad .tbtn').forEach(b => {
  const map = { up: 'w', left: 'a', down: 's', right: 'd' };
  const k = map[b.dataset.k];
  b.addEventListener('touchstart', e => { e.preventDefault(); keys[k] = true; }, { passive: false });
  b.addEventListener('touchend', e => { e.preventDefault(); keys[k] = false; }, { passive: false });
});
document.getElementById('t-enter').addEventListener('click', () => { if (S.mode === 'play') tryEnterCar(); });
document.getElementById('t-hit').addEventListener('click', () => { if (S.mode === 'play') doAttack(); });
document.getElementById('t-run').addEventListener('click', () => { keys['shift'] = !keys['shift']; });
document.getElementById('game').addEventListener('click', () => { if (S.mode === 'play') doAttack(); });

function moveKeys() {
  return {
    up: keys['w'] || keys['arrowup'], down: keys['s'] || keys['arrowdown'],
    left: keys['a'] || keys['arrowleft'], right: keys['d'] || keys['arrowright'],
    run: keys['shift'],
  };
}

// ---- save / load ----
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      x: S.player.x, y: S.player.y, health: S.player.health, cash: S.cash,
      score: S.score, mission: S.mission, wanted: S.wanted, weapon: S.weapon,
      ammo: S.ammo, stashes: stashes.map(s => s.got), clockMin: S.clockMin,
    }));
  } catch (e) {}
}
function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!d) return false;
    S.player.x = d.x; S.player.y = d.y; S.player.health = d.health;
    S.cash = d.cash; S.score = d.score; S.mission = Math.min(d.mission, 4);
    S.wanted = d.wanted || 0; S.weapon = d.weapon || 'fists'; S.ammo = d.ammo || 0;
    S.clockMin = d.clockMin || 8 * 60;
    stashes.forEach((s, i) => { s.got = !!(d.stashes && d.stashes[i]); });
    S.stashes = stashes.filter(s => s.got).length;
    document.getElementById('mission-title').textContent = mission().title;
    setMissionText(mission().text);
    return true;
  } catch (e) { return false; }
}

// ---- actions ----
function nearestParked() {
  let best = null, bd = 90;
  for (const c of parked) {
    if (c.taken) continue;
    const d = dist(S.player.x, S.player.y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function tryEnterCar() {
  const p = S.player;
  if (p.inCar) {
    p.inCar = null; p.x += 30; p.y += 30; p.speed = 0;
    engine(false);
    toast('You left the car', 1.5);
    return;
  }
  const c = nearestParked();
  if (!c) { toast('No car close enough. Walk to a parked car.', 2); return; }
  c.taken = true; p.inCar = c; p.angle = c.angle; p.speed = 0;
  S.carsStolen++; S.score += 25;
  addWanted(1);
  sfx.steal();
  toast('You stole a car. Wanted level up.', 2.5);
  if (S.mission === 0) { setMissionText('Now drive to Bayfront, the marker on the south west side of the city.'); }
  updateHUD();
}
function doAttack() {
  const p = S.player;
  if (p.inCar) return; // no drive-by in this build
  if (S.weapon === 'pistol' && S.ammo > 0) {
    S.ammo--; S.shots++;
    bullets.push({ x: p.x + Math.cos(p.angle) * 24, y: p.y + Math.sin(p.angle) * 24, angle: p.angle, life: 0.6 });
    sfx.shot();
    if (S.ammo === 0) { S.weapon = 'fists'; toast('Out of ammo. Back to fists.', 2); }
  } else {
    S.punches++;
    sfx.punch();
    const reach = 46;
    const hx = p.x + Math.cos(p.angle) * reach, hy = p.y + Math.sin(p.angle) * reach;
    for (const ped of peds) {
      if (dist(hx, hy, ped.x, ped.y) < 34) {
        ped.hp = 0; addWanted(1);
        S.score += 10;
        toast('That pedestrian will not forget this. Wanted level up.', 2);
      }
    }
    for (const r of rivals) {
      if (r.hp > 0 && dist(hx, hy, r.x, r.y) < 40) {
        r.hp -= 1;
        if (r.hp <= 0) { S.rivalsDown++; S.score += 150; toast('Rival down. ' + (3 - S.rivalsDown) + ' left.', 2); }
      }
    }
  }
  updateHUD();
}

// ---- update ----
function moveWithCollision(ent, nx, ny, r) {
  if (!hitsBuilding(nx, ent.y, r)) ent.x = nx;
  if (!hitsBuilding(ent.x, ny, r)) ent.y = ny;
  ent.x = clamp(ent.x, 30, W - 30);
  ent.y = clamp(ent.y, 30, H - 30);
}
function update(dt) {
  const p = S.player;
  const mv = moveKeys();
  S.playSeconds += dt;
  S.clockMin = (S.clockMin + dt / 60) % (24 * 60);

  if (S.messageT > 0) { S.messageT -= dt; if (S.messageT <= 0) document.getElementById('toast').style.opacity = 0; }
  if (S.bannerT > 0) { S.bannerT -= dt; if (S.bannerT <= 0) document.getElementById('banner').style.opacity = 0; }

  // player movement
  if (p.inCar) {
    const car = p.inCar;
    if (mv.up) p.speed = Math.min(p.speed + 320 * dt, 520);
    else if (mv.down) p.speed = Math.max(p.speed - 320 * dt, -160);
    else p.speed *= (1 - 1.2 * dt);
    if (mv.left) p.angle -= 2.1 * dt * (p.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(p.speed) / 120 + 0.2);
    if (mv.right) p.angle += 2.1 * dt * (p.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(p.speed) / 120 + 0.2);
    const nx = p.x + Math.cos(p.angle) * p.speed * dt;
    const ny = p.y + Math.sin(p.angle) * p.speed * dt;
    if (hitsBuilding(nx, ny, 22)) { p.speed *= -0.25; } else { p.x = nx; p.y = ny; }
    p.x = clamp(p.x, 30, W - 30); p.y = clamp(p.y, 30, H - 30);
    car.x = p.x; car.y = p.y; car.angle = p.angle;
    engine(true, p.speed);
  } else {
    const sp = mv.run ? 340 : 210;
    let dx = (mv.right ? 1 : 0) - (mv.left ? 1 : 0);
    let dy = (mv.down ? 1 : 0) - (mv.up ? 1 : 0);
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      p.angle = Math.atan2(dy / len, dx / len);
      moveWithCollision(p, p.x + dx / len * sp * dt, p.y + dy / len * sp * dt, 16);
    }
    p.speed = (dx || dy) ? sp : 0;
    engine(false);
  }

  // traffic drives along its road and loops around the city
  for (const t of traffic) {
    t.x += Math.cos(t.angle) * t.speed * dt;
    t.y += Math.sin(t.angle) * t.speed * dt;
    if (t.x < 60) { t.x = W - 60; } if (t.x > W - 60) { t.x = 60; }
    if (t.y < 60) { t.y = H - 60; } if (t.y > H - 60) { t.y = 60; }
    // traffic nudges away from the player car
    if (p.inCar && dist(t.x, t.y, p.x, p.y) < 60) { t.x += Math.cos(t.angle) * 40 * dt; }
  }

  // pedestrians wander and pause
  for (const ped of peds) {
    if (ped.hp <= 0) continue;
    if (ped.pause > 0) { ped.pause -= dt; continue; }
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    if (hitsBuilding(ped.x, ped.y, 12) || ped.x < 60 || ped.y < 60 || ped.x > W - 60 || ped.y > H - 60) {
      ped.angle += Math.PI / 2 + rr(-0.5, 0.5);
      ped.x = clamp(ped.x, 60, W - 60); ped.y = clamp(ped.y, 60, H - 60);
    }
    if (rnd() < 0.002) ped.pause = rr(1, 3);
  }

  // bullets
  for (const b of bullets) {
    b.x += Math.cos(b.angle) * 700 * dt;
    b.y += Math.sin(b.angle) * 700 * dt;
    b.life -= dt;
    for (const r of rivals) {
      if (r.hp > 0 && dist(b.x, b.y, r.x, r.y) < 30) {
        r.hp -= 2; b.life = 0;
        if (r.hp <= 0) { S.rivalsDown++; S.score += 150; toast('Rival down. ' + (3 - S.rivalsDown) + ' left.', 2); }
      }
    }
    for (const pol of police) {
      if (dist(b.x, b.y, pol.x, pol.y) < 30) { pol.hp -= 1; b.life = 0; if (pol.hp <= 0) { pol.dead = true; S.score += 100; addWanted(1); } }
    }
  }
  bullets = bullets.filter(b => b.life > 0);

  // pickups
  for (const s of stashes) {
    if (!s.got && dist(p.x, p.y, s.x, s.y) < 34) {
      s.got = true; S.stashes++; S.cash += 150; S.score += 150;
      sfx.pickup(); toast('Cash stash found: +$150', 2); updateHUD();
    }
  }
  for (const hp of healthPacks) {
    if (!hp.got && dist(p.x, p.y, hp.x, hp.y) < 34) {
      hp.got = true; p.health = Math.min(100, p.health + 40);
      sfx.pickup(); toast('Health +40', 2); updateHUD();
    }
  }
  if (!pistolSpot.got && dist(p.x, p.y, pistolSpot.x, pistolSpot.y) < 34) {
    pistolSpot.got = true; S.weapon = 'pistol'; S.ammo = 24;
    sfx.pickup(); toast('Pistol picked up. 24 rounds. Space to shoot.', 3); updateHUD();
  }

  // police
  const wantCount = S.wanted === 0 ? 0 : Math.min(S.wanted + 1, 6);
  while (police.length < wantCount) {
    const a = rr(0, Math.PI * 2);
    police.push({ x: clamp(p.x + Math.cos(a) * 700, 60, W - 60), y: clamp(p.y + Math.sin(a) * 700, 60, H - 60), angle: 0, speed: 0, hp: 2, dead: false, bustT: 0 });
  }
  if (S.wanted === 0) police = police.filter(pol => dist(pol.x, pol.y, p.x, p.y) < 400);
  let nearPolice = false;
  for (const pol of police) {
    if (pol.dead) continue;
    const d = dist(pol.x, pol.y, p.x, p.y);
    if (d < 700) nearPolice = true;
    const want = Math.atan2(p.y - pol.y, p.x - pol.x);
    let da = want - pol.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    pol.angle += clamp(da, -2.4 * dt, 2.4 * dt);
    pol.speed = Math.min(pol.speed + 260 * dt, 430);
    const nx = pol.x + Math.cos(pol.angle) * pol.speed * dt;
    const ny = pol.y + Math.sin(pol.angle) * pol.speed * dt;
    if (!hitsBuilding(nx, ny, 22)) { pol.x = nx; pol.y = ny; } else { pol.speed *= 0.4; }
    if (d < 46) {
      if (!p.inCar && S.wanted >= 3) {
        pol.bustT += dt;
        if (pol.bustT > 1.5) { endGame('busted'); return; }
      } else {
        p.health -= 22 * dt;
        if (p.health <= 0) { p.health = 0; updateHUD(); endGame('wasted'); return; }
      }
    } else pol.bustT = 0;
  }
  police = police.filter(pol => !pol.dead);
  if (S.wanted > 0) {
    if (nearPolice) {
      S.wantedQuiet = 0;
      if (performance.now() - lastSiren > 4000) { lastSiren = performance.now(); sfx.siren(); }
    }
    else {
      S.wantedQuiet += dt;
      if (S.wantedQuiet > 12) { S.wanted--; S.wantedQuiet = 0; toast('You lost the heat. Wanted down to ' + S.wanted + ' star' + (S.wanted === 1 ? '' : 's') + '.', 2.5); updateHUD(); }
    }
  }

  // missions
  updateMissions(dt);
  if (S.player.health <= 0) { endGame('wasted'); return; }
  updateHUD();
}

function atWaypoint(wp, r) {
  return wp && dist(S.player.x, S.player.y, wp.x, wp.y) < (r || 90);
}
function updateMissions(dt) {
  const p = S.player;
  if (S.mission === 0) {
    if (p.inCar && atWaypoint({ x: 350, y: 2100 }, 130)) completeMission(250);
    else if (p.inCar) setMissionText('Now drive to Bayfront, the marker on the south west side of the city.');
  } else if (S.mission === 1) {
    if (S.missionStage === 0) {
      if (atWaypoint({ x: 350, y: 2100 }, 110)) {
        S.missionStage = 1; sfx.pickup();
        document.getElementById('mission-title').textContent = 'MISSION 2: BAYFRONT PICKUP';
        setMissionText('Package collected. Deliver it to Palm Park, north west.');
        toast('Package collected. Now to Palm Park.', 2.5);
      }
    } else if (atWaypoint({ x: 350, y: 300 }, 120)) completeMission(400);
  } else if (S.mission === 2) {
    if (S.missionStage === 0) {
      setMissionText('On the Strip, get the police after you until you have 2 stars. Steal a car or start trouble.');
      if (S.wanted >= 2) { S.missionStage = 1; setMissionText('2 stars. Now lose the heat until you have 0 stars. Stay out of sight.'); toast('2 stars. Now lose them.', 2.5); }
    } else if (S.wanted === 0) completeMission(500);
  } else if (S.mission === 3) {
    if (S.missionStage === 0) {
      if (atWaypoint({ x: 2850, y: 2100 }, 130)) {
        S.missionStage = 1;
        for (let i = 0; i < 3; i++) rivals.push({ x: 2780 + i * 60, y: 2050 + (i % 2) * 60, angle: 0, hp: 3 });
        setMissionText('Rivals at the Docks. Deal with all 3, then grab the cash.');
        toast('3 rivals. Deal with them.', 2.5);
        sfx.siren();
      }
    } else if (S.rivalsDown >= 3) {
      S.cash += 600; completeMission(600);
    }
  } else if (S.mission === 4) {
    if (S.missionStage === 0) {
      S.missionStage = 1; S.missionTimer = 90;
      setMissionText('90 seconds. Reach the Hideout, north east, before the clock runs out.');
      banner('90 SECONDS', 2);
    } else {
      S.missionTimer -= dt;
      setMissionText('Reach the Hideout. ' + Math.max(0, Math.ceil(S.missionTimer)) + ' seconds left.');
      if (S.missionTimer <= 0) { endGame('timeout'); return; }
      if (atWaypoint({ x: 2900, y: 300 }, 120)) completeMission(1000);
    }
  }
}

// ---- render ----
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const mm = document.getElementById('minimap');
const mctx = mm.getContext('2d');
let camX = 0, camY = 0;

function drawCar(c, x, y, angle, color, isPolice) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = isPolice ? '#1a1a1a' : '#111';
  ctx.fillRect(-22, -13, 44, 26);
  ctx.fillStyle = color;
  ctx.fillRect(-20, -11, 40, 22);
  ctx.fillStyle = '#bfe8ff';
  ctx.fillRect(-6, -9, 12, 18);
  ctx.fillStyle = isPolice ? '#ff2e2e' : '#222';
  ctx.fillRect(14, -11, 5, 22);
  ctx.fillStyle = '#ffd75e';
  ctx.fillRect(18, -9, 3, 4); ctx.fillRect(18, 5, 3, 4);
  if (isPolice) { ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial'; ctx.fillText('PD', -8, 3); }
  ctx.restore();
}
function drawPerson(x, y, angle, color, label) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(6, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (label) { ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.fillText(label, x, y - 18); ctx.textAlign = 'left'; }
}

function render() {
  const p = S.player;
  camX = clamp(p.x - VIEW_W / 2, 0, W - VIEW_W);
  camY = clamp(p.y - VIEW_H / 2, 0, H - VIEW_H);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  // ground
  ctx.fillStyle = '#24303c';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#2f5e3a';
  ctx.fillRect(-camX + 60, -camY + 60, 560, 560); // Palm Park
  ctx.fillStyle = '#3a6e8f';
  ctx.fillRect(-camX + 60, -camY + 2160, W - 120, 180); // Bayfront beach

  // roads
  ctx.fillStyle = '#3d3d46';
  for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_W / 2 - camX, -camY, ROAD_W, H);
  for (const ry of ROADS_Y) ctx.fillRect(-camX, ry - ROAD_W / 2 - camY, W, ROAD_W);
  ctx.strokeStyle = '#ffd75e'; ctx.setLineDash([24, 20]); ctx.lineWidth = 3;
  for (const rx of ROADS_X) { ctx.beginPath(); ctx.moveTo(rx - camX, -camY); ctx.lineTo(rx - camX, H - camY); ctx.stroke(); }
  for (const ry of ROADS_Y) { ctx.beginPath(); ctx.moveTo(-camX, ry - camY); ctx.lineTo(W - camX, ry - camY); ctx.stroke(); }
  ctx.setLineDash([]);

  // district labels
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
  for (const d of DISTRICTS) ctx.fillText(d.name, d.x - camX, d.y - camY);
  ctx.textAlign = 'left';

  // buildings
  for (const b of buildings) {
    if (b.x + b.w < camX - 50 || b.x > camX + VIEW_W + 50 || b.y + b.h < camY - 50 || b.y > camY + VIEW_H + 50) continue;
    ctx.fillStyle = b.c;
    ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
    ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let wx = b.x + 16; wx < b.x + b.w - 14; wx += 34) {
      for (let wy = b.y + 16; wy < b.y + b.h - 14; wy += 34) ctx.fillRect(wx - camX, wy - camY, 14, 18);
    }
  }

  // waypoint arrow and marker
  const wp = S.mission < MISSIONS.length ? mission().wp : null;
  if (wp) {
    const pulse = 1 + Math.sin(S.playSeconds * 4) * 0.15;
    ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(wp.x - camX, wp.y - camY, 46 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText(wp.label, wp.x - camX, wp.y - camY - 56);
    ctx.textAlign = 'left';
    const ang = Math.atan2(wp.y - p.y, wp.x - p.x);
    ctx.save();
    ctx.translate(p.x - camX + Math.cos(ang) * 44, p.y - camY + Math.sin(ang) * 44);
    ctx.rotate(ang); ctx.fillStyle = '#ffd75e';
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // stashes, health, pistol
  for (const s of stashes) {
    if (s.got) continue;
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath(); ctx.arc(s.x - camX, s.y - camY, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText('$', s.x - camX, s.y - camY + 5); ctx.textAlign = 'left';
  }
  for (const hp of healthPacks) {
    if (hp.got) continue;
    ctx.fillStyle = '#37c24a';
    ctx.fillRect(hp.x - camX - 11, hp.y - camY - 11, 22, 22);
    ctx.fillStyle = '#fff'; ctx.fillRect(hp.x - camX - 2, hp.y - camY - 8, 4, 16); ctx.fillRect(hp.x - camX - 8, hp.y - camY - 2, 16, 4);
  }
  if (!pistolSpot.got) {
    ctx.fillStyle = '#c05eff';
    ctx.fillRect(pistolSpot.x - camX - 12, pistolSpot.y - camY - 5, 24, 10);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillText('PISTOL', pistolSpot.x - camX, pistolSpot.y - camY - 14); ctx.textAlign = 'left';
  }

  // parked cars
  for (const c of parked) if (!c.taken) drawCar(c, c.x - camX, c.y - camY, c.angle, c.color, false);
  // traffic
  for (const t of traffic) drawCar(t, t.x - camX, t.y - camY, t.angle, t.color, false);
  // police
  for (const pol of police) drawCar(pol, pol.x - camX, pol.y - camY, pol.angle, '#3a7bff', true);
  // rivals
  for (const r of rivals) if (r.hp > 0) drawPerson(r.x - camX, r.y - camY, r.angle, '#e33', 'RIVAL');
  // pedestrians
  for (const ped of peds) if (ped.hp > 0) drawPerson(ped.x - camX, ped.y - camY, ped.angle, '#e8b23a', null);
  // bullets
  ctx.fillStyle = '#ffe27a';
  for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x - camX, b.y - camY, 4, 0, Math.PI * 2); ctx.fill(); }

  // player
  if (p.inCar) drawCar(p.inCar, p.x - camX, p.y - camY, p.angle, '#ff5da2', false);
  else drawPerson(p.x - camX, p.y - camY, p.angle, '#ff5da2', 'MARCUS');

  renderMinimap();
}
function renderMinimap() {
  const sx = 220 / W, sy = 160 / H;
  mctx.fillStyle = '#111'; mctx.fillRect(0, 0, 220, 160);
  mctx.fillStyle = '#3d3d46';
  for (const rx of ROADS_X) mctx.fillRect(rx * sx - 2, 0, 4, 160);
  for (const ry of ROADS_Y) mctx.fillRect(0, ry * sy - 2, 220, 4);
  mctx.fillStyle = '#ffd75e';
  for (const s of stashes) if (!s.got) mctx.fillRect(s.x * sx - 1, s.y * sy - 1, 3, 3);
  const wp = S.mission < MISSIONS.length ? mission().wp : null;
  if (wp) { mctx.fillStyle = '#ff5da2'; mctx.beginPath(); mctx.arc(wp.x * sx, wp.y * sy, 5, 0, Math.PI * 2); mctx.fill(); }
  mctx.fillStyle = '#fff';
  mctx.beginPath(); mctx.arc(S.player.x * sx, S.player.y * sy, 4, 0, Math.PI * 2); mctx.fill();
  mctx.strokeStyle = '#fff'; mctx.strokeRect(0, 0, 220, 160);
}

// ---- HUD ----
function updateHUD() {
  document.getElementById('health-bar').style.width = S.player.health + '%';
  document.getElementById('health-num').textContent = Math.round(S.player.health);
  document.getElementById('cash').textContent = '$' + S.cash;
  document.getElementById('score').textContent = S.score;
  document.getElementById('weapon').textContent = S.weapon === 'pistol' ? 'Pistol (' + S.ammo + ')' : 'Fists';
  const mph = S.player.inCar ? Math.round(Math.abs(S.player.speed) * 0.55) : Math.round(S.player.speed * 0.55);
  document.getElementById('speed').textContent = mph + ' mph';
  document.getElementById('wanted').textContent = S.wanted > 0 ? '★'.repeat(S.wanted) : '';
  const hh = String(Math.floor(S.clockMin / 60)).padStart(2, '0');
  const mm2 = String(Math.floor(S.clockMin % 60)).padStart(2, '0');
  document.getElementById('clock').textContent = hh + ':' + mm2;
}

// ---- screens and flow ----
function showScreen(name) {
  for (const id of ['start-screen', 'pause-screen', 'end-screen']) document.getElementById(id).classList.add('hidden');
  if (name) document.getElementById(name).classList.remove('hidden');
}
function startGame(fresh) {
  if (fresh) {
    S.player.x = 380; S.player.y = 560; S.player.health = 100; S.player.angle = 0;
    S.player.inCar = null; S.player.speed = 0;
    S.cash = 0; S.score = 0; S.wanted = 0; S.weapon = 'fists'; S.ammo = 0;
    S.mission = 0; S.missionStage = 0; S.rivalsDown = 0; S.clockMin = 8 * 60;
    S.playSeconds = 0; S.carsStolen = 0; S.stashes = 0; S.shots = 0; S.punches = 0;
    parked.forEach(c => { c.taken = false; });
    stashes.forEach(s => { s.got = false; });
    healthPacks.forEach(h => { h.got = false; });
    pistolSpot.got = false;
    rivals.length = 0; police = []; bullets = [];
    document.getElementById('mission-title').textContent = MISSIONS[0].title;
    setMissionText(MISSIONS[0].text);
  }
  S.mode = 'play';
  showScreen(null);
  ac();
  updateHUD();
}
function pauseGame() {
  if (S.mode !== 'play') return;
  S.mode = 'pause';
  engine(false);
  document.getElementById('pause-info').textContent =
    'Cash $' + S.cash + '  Score ' + S.score + '  Mission ' + (Math.min(S.mission, 5) + 1) + ' of 5  Wanted ' + S.wanted + ' stars';
  showScreen('pause-screen');
}
document.getElementById('btn-start').addEventListener('click', () => startGame(true));
document.getElementById('btn-continue').addEventListener('click', () => {
  if (loadGame()) startGame(false);
  else toast('No saved game found. Start a new game.', 2.5);
});
document.getElementById('btn-resume').addEventListener('click', () => { S.mode = 'play'; showScreen(null); });
document.getElementById('btn-save').addEventListener('click', () => { saveGame(); toast('Game saved.', 2); });
document.getElementById('btn-restart').addEventListener('click', () => startGame(true));
document.getElementById('btn-quit').addEventListener('click', () => { saveGame(); S.mode = 'title'; showScreen('start-screen'); render(); });
document.getElementById('btn-again').addEventListener('click', () => startGame(true));
document.getElementById('btn-title').addEventListener('click', () => { S.mode = 'title'; showScreen('start-screen'); render(); });
window.addEventListener('beforeunload', saveGame);

// ---- test hook for playtesting ----
window.__leonida = {
  getState() {
    return {
      mode: S.mode, x: Math.round(S.player.x), y: Math.round(S.player.y),
      health: Math.round(S.player.health), cash: S.cash, score: S.score,
      wanted: S.wanted, weapon: S.weapon, ammo: S.ammo, mission: S.mission,
      missionStage: S.missionStage, inCar: !!S.player.inCar, speed: Math.round(S.player.speed),
      carsStolen: S.carsStolen, stashes: S.stashes, rivalsDown: S.rivalsDown,
      timer: Math.round(S.missionTimer),
    };
  },
  start(fresh) { startGame(fresh !== false); },
  teleport(x, y) {
    S.player.x = x; S.player.y = y;
    if (S.player.inCar) { S.player.inCar.x = x; S.player.inCar.y = y; }
  },
  setWanted(n) { S.wanted = n; updateHUD(); },
};

// ---- main loop ----
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (S.mode === 'play') update(dt);
  if (S.mode !== 'title') render();
  requestAnimationFrame(loop);
}
updateHUD();
render();
requestAnimationFrame(loop);
