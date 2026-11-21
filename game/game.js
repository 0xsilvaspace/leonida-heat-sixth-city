// Leonida Heat: Sixth City
// An original open-world crime game, written for the make.fun gta6-01 bounty.
// Top-down 2D canvas game. No external assets, no network requests, all sound
// synthesised with WebAudio. Original city, characters, and story.

'use strict';

var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
var minimap = document.getElementById('minimap');
var mctx = minimap.getContext('2d');

var VIEW_W = 1280;
var VIEW_H = 800;
var WORLD_W = 3200;
var WORLD_H = 2400;
var ROAD_W = 130;
var SAVE_KEY = 'leonida-heat-save-v1';
var DEBT = 5000;

// Roads: horizontal road centre lines and vertical road centre lines.
var H_ROADS = [300, 900, 1500, 2100];
var V_ROADS = [400, 1100, 1800, 2500];

var HIDEOUT = { x: 280, y: 2300 };
var DOCKS_PICKUP = { x: 2900, y: 2100 };
var BAYFRONT_DROP = { x: 400, y: 150 };
var STRIP_VAULT = { x: 1800, y: 900 };

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function angDiff(a, b) {
  var d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Deterministic random so the city layout is stable between runs.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
var rng = mulberry32(20261121);
function rand(lo, hi) { return lo + rng() * (hi - lo); }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }

function onRoad(x, y) {
  for (var i = 0; i < H_ROADS.length; i++) {
    if (Math.abs(y - H_ROADS[i]) < ROAD_W / 2 + 24) return true;
  }
  for (var j = 0; j < V_ROADS.length; j++) {
    if (Math.abs(x - V_ROADS[j]) < ROAD_W / 2 + 24) return true;
  }
  return false;
}

function districtAt(x, y) {
  if (x >= 465 && x <= 1035 && y >= 965 && y <= 1435) return 'Palm Park';
  if (x < 465 && y >= 2035) return 'Hideout';
  if (x >= 2565 && y >= 1565) return 'The Docks';
  if (x >= 1165 && x <= 2435 && y >= 1565) return 'Night Market';
  if (y < 900 && x < 1100) return 'Bayfront';
  if (y < 900) return 'The Strip';
  if (x < 1100) return 'Palm Park';
  return 'The Strip';
}

// ---- City: buildings only in the blocks between roads, never on roads ----
var BUILDING_COLORS = ['#5b6b8c', '#7a5b6b', '#5b7a6b', '#8c7a4a', '#6b5b8c', '#4a6b7a', '#8c5b4a'];
var buildings = [];
var trees = [];

function buildCity() {
  buildings = [];
  trees = [];
  var xs = [0, 465, 1165, 1865, 2565];
  var xe = [335, 1035, 1735, 2435, 3200];
  var ys = [0, 365, 965, 1565, 2165];
  var ye = [235, 835, 1435, 2035, 2400];
  for (var bi = 0; bi < xs.length; bi++) {
    for (var bj = 0; bj < ys.length; bj++) {
      var bx0 = xs[bi] + 30, by0 = ys[bj] + 30;
      var bx1 = xe[bi] - 30, by1 = ye[bj] - 30;
      // Palm Park block: trees, no buildings.
      if (bi === 1 && bj === 2) {
        for (var t = 0; t < 26; t++) {
          trees.push({ x: rand(bx0, bx1), y: rand(by0, by1), r: rand(10, 18) });
        }
        continue;
      }
      // Hideout block: keep it mostly open, one small hideout building.
      if (bi === 0 && bj === 4) {
        buildings.push({ x: 60, y: 2200, w: 150, h: 110, color: '#3d4a5c', label: 'HIDEOUT' });
        continue;
      }
      var cols = (bx1 - bx0) > 420 ? 2 : 1;
      var rows = (by1 - by0) > 380 ? 2 : 1;
      var cw = (bx1 - bx0) / cols, ch = (by1 - by0) / rows;
      for (var ci = 0; ci < cols; ci++) {
        for (var cj = 0; cj < rows; cj++) {
          var w = rand(cw * 0.45, cw * 0.72);
          var h = rand(ch * 0.45, ch * 0.72);
          var x = bx0 + ci * cw + (cw - w) / 2 + rand(-12, 12);
          var y = by0 + cj * ch + (ch - h) / 2 + rand(-12, 12);
          buildings.push({ x: x, y: y, w: w, h: h, color: pick(BUILDING_COLORS), label: '' });
        }
      }
    }
  }
}

function circleHitsBuilding(x, y, r) {
  for (var i = 0; i < buildings.length; i++) {
    var b = buildings[i];
    var nx = clamp(x, b.x, b.x + b.w);
    var ny = clamp(y, b.y, b.y + b.h);
    var dx = x - nx, dy = y - ny;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

function pointInBuilding(x, y) {
  for (var i = 0; i < buildings.length; i++) {
    var b = buildings[i];
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
  }
  return false;
}

function randomRoadsidePoint() {
  for (var tries = 0; tries < 40; tries++) {
    var x, y;
    if (rng() < 0.5) {
      x = rand(60, WORLD_W - 60);
      y = pick(H_ROADS) + rand(-ROAD_W / 2 - 30, ROAD_W / 2 + 30);
    } else {
      x = pick(V_ROADS) + rand(-ROAD_W / 2 - 30, ROAD_W / 2 + 30);
      y = rand(60, WORLD_H - 60);
    }
    if (!pointInBuilding(x, y)) return { x: x, y: y };
  }
  return { x: 1100, y: 900 };
}

// ---- Audio: everything synthesised, no audio files ----
var audioCtx = null;
var engineOsc = null, engineGain = null;
var lastSirenAt = 0;
var sirenHigh = false;

function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    engineOsc = audioCtx.createOscillator();
    engineGain = audioCtx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 40;
    engineGain.gain.value = 0;
    var filt = audioCtx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 400;
    engineOsc.connect(filt);
    filt.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();
  } catch (e) { audioCtx = null; }
}

function beep(freq, dur, type, vol, when) {
  if (!audioCtx) return;
  var t = audioCtx.currentTime + (when || 0);
  var o = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  o.type = type || 'square';
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol || 0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseBurst(dur, vol) {
  if (!audioCtx) return;
  var len = Math.floor(audioCtx.sampleRate * dur);
  var buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  var data = buf.getChannelData(0);
  for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  var src = audioCtx.createBufferSource();
  src.buffer = buf;
  var g = audioCtx.createGain();
  g.gain.value = vol || 0.2;
  src.connect(g);
  g.connect(audioCtx.destination);
  src.start();
}

function sfx(name) {
  if (!audioCtx) return;
  if (name === 'shot') noiseBurst(0.12, 0.25);
  else if (name === 'punch') noiseBurst(0.07, 0.15);
  else if (name === 'pickup') { beep(660, 0.09, 'sine', 0.12); beep(990, 0.14, 'sine', 0.12, 0.09); }
  else if (name === 'cash') { beep(880, 0.08, 'sine', 0.12); beep(1174, 0.08, 'sine', 0.12, 0.08); beep(1568, 0.16, 'sine', 0.12, 0.16); }
  else if (name === 'mission') { beep(523, 0.12, 'square', 0.08); beep(659, 0.12, 'square', 0.08, 0.12); beep(784, 0.2, 'square', 0.08, 0.24); }
  else if (name === 'busted') { beep(220, 0.4, 'sawtooth', 0.1); beep(165, 0.6, 'sawtooth', 0.1, 0.4); }
  else if (name === 'steal') { beep(330, 0.08, 'square', 0.1); beep(440, 0.1, 'square', 0.1, 0.08); }
}

// Siren: one short two-tone blip, at most once every 650 ms, never every frame.
function maybeSiren(now) {
  if (!audioCtx || state.wanted < 1) return;
  if (now - lastSirenAt < 650) return;
  lastSirenAt = now;
  sirenHigh = !sirenHigh;
  beep(sirenHigh ? 880 : 660, 0.28, 'sine', 0.05);
}

// ---- Game state ----
var state = {
  mode: 'menu', // menu | playing | paused | ended
  endReason: '',
  time: 0,
  clockMin: 8 * 60,
  cash: 0,
  score: 0,
  wanted: 0,
  lastCrimeAt: -999,
  wantedTickAt: 0,
  missionIndex: 0,
  missionTarget: null,
  missionTimer: 0,
  missionTimerMax: 0,
  nightStashesLeft: 0,
  bustedTimer: 0,
  cam: { x: 0, y: 0 },
  mouse: { x: 640, y: 400, wx: 0, wy: 0 },
};

var player = {
  x: 1100, y: 830, angle: -Math.PI / 2, speed: 0,
  health: 100, onFoot: true, car: null,
  weapon: 'fists', ammo: 0, walkFrame: 0,
};

var cars = [];
var peds = [];
var police = [];
var bullets = [];
var stashes = [];
var pickups = [];
var particles = [];
var CAR_COLORS = ['#e03131', '#1971c2', '#f08c00', '#2f9e44', '#e599f7', '#adb5bd', '#1098ad', '#ffd43b', '#862e9c', '#495057'];

var MISSIONS = [
  { title: 'MISSION 1: FIRST JOB', text: 'Drive to the Docks and pick up the package.', target: DOCKS_PICKUP, reward: 400 },
  { title: 'MISSION 2: PAY THE BAYFRONT', text: 'Deliver the package to the Bayfront contact.', target: BAYFRONT_DROP, reward: 500 },
  { title: 'MISSION 3: NIGHT MARKET RUN', text: 'Grab 3 stashes in the Night Market. Beat the clock.', target: null, reward: 700, timer: 120 },
  { title: 'MISSION 4: HEAT AT THE DOCKS', text: 'The cops are on you. Reach the Hideout and lose them.', target: HIDEOUT, reward: 1000 },
  { title: 'MISSION 5: THE BIG SCORE', text: 'Hit the Strip vault, then get back to the Hideout.', target: STRIP_VAULT, reward: 1500 },
];

var STASH_SPOTS = [
  { x: 700, y: 200, v: 150 }, { x: 1500, y: 200, v: 200 }, { x: 2500, y: 600, v: 150 },
  { x: 2900, y: 900, v: 200 }, { x: 600, y: 1200, v: 100 }, { x: 1400, y: 1500, v: 150 },
  { x: 1800, y: 1750, v: 200 }, { x: 1500, y: 2100, v: 150 }, { x: 2300, y: 2100, v: 250 },
  { x: 300, y: 2100, v: 100 }, { x: 2700, y: 350, v: 200 }, { x: 900, y: 2100, v: 150 },
];

function makeCar(x, y, angle, parked, traffic, road, line, dir) {
  return {
    x: x, y: y, angle: angle, speed: 0, color: pick(CAR_COLORS),
    parked: parked, traffic: !!traffic, road: road || null, line: line || 0,
    dir: dir || 1, police: false, hp: 3, driver: null,
  };
}

function spawnEntities() {
  cars = [];
  peds = [];
  police = [];
  bullets = [];
  stashes = [];
  pickups = [];
  particles = [];
  // 12 parked cars along road shoulders, near the spawn area and across the city.
  var parkedSpots = [
    [1100, 800, 0], [1130, 760, 0], [1050, 1010, Math.PI], [1100, 1200, Math.PI],
    [500, 240, Math.PI / 2], [1900, 240, -Math.PI / 2], [2600, 840, 0], [450, 1440, Math.PI],
    [2400, 1440, 0], [1150, 2040, Math.PI], [1850, 2040, 0], [2950, 2040, Math.PI],
  ];
  for (var i = 0; i < parkedSpots.length; i++) {
    var s = parkedSpots[i];
    cars.push(makeCar(s[0], s[1], s[2], true, false));
  }
  // 14 traffic cars, spread over the roads.
  for (var j = 0; j < 14; j++) {
    var horiz = j % 2 === 0;
    var line = horiz ? H_ROADS[j % H_ROADS.length] : V_ROADS[j % V_ROADS.length];
    var t;
    if (horiz) t = makeCar(rand(100, WORLD_W - 100), line + (j % 3 === 0 ? 34 : -34), j % 4 === 0 ? Math.PI : 0, false, true, 'h', line, j % 4 === 0 ? -1 : 1);
    else t = makeCar(line + (j % 3 === 0 ? 34 : -34), rand(100, WORLD_H - 100), j % 4 === 0 ? -Math.PI / 2 : Math.PI / 2, false, true, 'v', line, j % 4 === 0 ? -1 : 1);
    t.speed = rand(90, 150);
    cars.push(t);
  }
  for (var p = 0; p < 26; p++) {
    var pt = randomRoadsidePoint();
    peds.push({ x: pt.x, y: pt.y, angle: rand(0, Math.PI * 2), speed: rand(35, 65), color: pick(['#f1c27d', '#e0ac69', '#8d5524', '#ffdbac']), shirt: pick(['#e03131', '#1971c2', '#2f9e44', '#f08c00', '#862e9c', '#adb5bd']), tx: pt.x, ty: pt.y, flee: false, down: 0, respawnAt: 0 });
  }
  for (var s2 = 0; s2 < STASH_SPOTS.length; s2++) {
    stashes.push({ x: STASH_SPOTS[s2].x, y: STASH_SPOTS[s2].y, v: STASH_SPOTS[s2].v, taken: false });
  }
  pickups.push({ x: 800, y: 950, kind: 'health' });
  pickups.push({ x: 2200, y: 950, kind: 'pistol' });
  pickups.push({ x: 1400, y: 1560, kind: 'health' });
  pickups.push({ x: 2800, y: 1560, kind: 'pistol' });
  pickups.push({ x: 600, y: 900, kind: 'pistol' });
  pickups.push({ x: 2600, y: 900, kind: 'health' });
}

function newGame() {
  buildCity();
  state.time = 0;
  state.clockMin = 8 * 60;
  state.cash = 0;
  state.score = 0;
  state.wanted = 0;
  state.lastCrimeAt = -999;
  state.missionIndex = 0;
  state.bustedTimer = 0;
  player.x = 1100; player.y = 830; player.angle = -Math.PI / 2; player.speed = 0;
  player.health = 100; player.onFoot = true; player.car = null;
  player.weapon = 'fists'; player.ammo = 0;
  spawnEntities();
  startMission(0);
  state.mode = 'playing';
  initAudio();
  showScreen(null);
  toast('Mission 1: First Job. Steal a car with E and drive to the Docks.');
}

function loadSave() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    var s = JSON.parse(raw);
    buildCity();
    state.time = 0;
    state.clockMin = s.clockMin || 8 * 60;
    state.cash = s.cash || 0;
    state.score = s.score || 0;
    state.wanted = 0;
    state.lastCrimeAt = -999;
    state.missionIndex = s.missionIndex || 0;
    state.bustedTimer = 0;
    player.x = s.x || 1100; player.y = s.y || 830; player.angle = -Math.PI / 2; player.speed = 0;
    player.health = s.health || 100; player.onFoot = true; player.car = null;
    player.weapon = s.weapon || 'fists'; player.ammo = s.ammo || 0;
    spawnEntities();
    for (var i = 0; i < stashes.length && i < (s.takenStashes || []).length; i++) {
      if (s.takenStashes.indexOf(i) >= 0) stashes[i].taken = true;
    }
    startMission(state.missionIndex);
    state.mode = 'playing';
    initAudio();
    showScreen(null);
    toast('Save loaded. Mission ' + (state.missionIndex + 1) + ' continues.');
    return true;
  } catch (e) { return false; }
}

function saveGame() {
  try {
    var taken = [];
    for (var i = 0; i < stashes.length; i++) if (stashes[i].taken) taken.push(i);
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash, score: state.score, missionIndex: state.missionIndex,
      health: player.health, x: player.x, y: player.y,
      weapon: player.weapon, ammo: player.ammo, clockMin: state.clockMin,
      takenStashes: taken,
    }));
  } catch (e) { /* storage unavailable, game continues without saving */ }
}

function addWanted(n) {
  state.wanted = clamp(state.wanted + n, 0, 5);
  state.lastCrimeAt = state.time;
}

function startMission(i) {
  state.missionIndex = i;
  var m = MISSIONS[i];
  if (!m) { state.missionTarget = null; return; }
  state.missionTarget = m.target;
  state.missionTimer = m.timer || 0;
  state.missionTimerMax = m.timer || 0;
  m.phase = null;
  if (i === 2) {
    state.nightStashesLeft = 3;
    state.missionTarget = { x: 1800, y: 1750 };
  }
  if (i === 3) addWanted(3);
  updateMissionBox();
}

function completeMission() {
  var m = MISSIONS[state.missionIndex];
  state.cash += m.reward;
  state.score += m.reward * 2;
  sfx('mission');
  toast('Mission complete! +$' + m.reward + '  (debt: $' + state.cash + ' of $' + DEBT + ')');
  saveGame();
  var next = state.missionIndex + 1;
  if (next >= MISSIONS.length) {
    endGame('complete');
    return;
  }
  startMission(next);
  toast('Mission ' + (next + 1) + ': ' + MISSIONS[next].title.replace('MISSION ' + (next + 1) + ': ', ''));
}

function endGame(reason) {
  state.mode = 'ended';
  state.endReason = reason;
  sfx('busted');
  saveGame();
  var title = document.getElementById('end-title');
  var text = document.getElementById('end-text');
  var retry = document.getElementById('btn-retry');
  if (reason === 'busted') {
    title.textContent = 'BUSTED';
    text.textContent = 'The Sixth City police caught Marcus. The Bayfront crew still wants its $5,000. You ended with $' + state.cash + ' and ' + state.score + ' points.';
    retry.textContent = 'TRY AGAIN';
  } else if (reason === 'wasted') {
    title.textContent = 'WASTED';
    text.textContent = 'Marcus went down in Sixth City. The debt is still $5,000. You ended with $' + state.cash + ' and ' + state.score + ' points.';
    retry.textContent = 'TRY AGAIN';
  } else if (reason === 'timeup') {
    title.textContent = 'TIME UP';
    text.textContent = 'The Night Market run ran out of time. The stashes are gone, the crew is not happy. You ended with $' + state.cash + ' and ' + state.score + ' points.';
    retry.textContent = 'TRY AGAIN';
  } else {
    title.textContent = 'DEBT PAID';
    text.textContent = 'Marcus and Nia paid back the $5,000. Sixth City is theirs again. Final score: ' + state.score + '. Free roam is open if you want to keep driving.';
    retry.textContent = 'KEEP PLAYING';
  }
  showScreen('end');
}

// ---- Input ----
var keys = {};
var touchKeys = {};

function isDown(code) { return !!(keys[code] || touchKeys[code]); }

window.addEventListener('keydown', function (e) {
  keys[e.code] = true;
  if (state.mode === 'playing') {
    if (e.code === 'KeyE') trySteal();
    if (e.code === 'KeyF') punch();
    if (e.code === 'Space') { shoot(); e.preventDefault(); }
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  } else if (state.mode === 'paused' && (e.code === 'KeyP' || e.code === 'Escape')) {
    togglePause();
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
});
window.addEventListener('keyup', function (e) { keys[e.code] = false; });

canvas.addEventListener('mousemove', function (e) {
  var r = canvas.getBoundingClientRect();
  state.mouse.x = (e.clientX - r.left) * (VIEW_W / r.width);
  state.mouse.y = (e.clientY - r.top) * (VIEW_H / r.height);
});
canvas.addEventListener('mousedown', function (e) {
  if (state.mode !== 'playing') return;
  var r = canvas.getBoundingClientRect();
  state.mouse.x = (e.clientX - r.left) * (VIEW_W / r.width);
  state.mouse.y = (e.clientY - r.top) * (VIEW_H / r.height);
  shoot();
});

function togglePause() {
  if (state.mode === 'playing') {
    state.mode = 'paused';
    saveGame();
    toast('Paused. Game saved.');
  } else if (state.mode === 'paused') {
    state.mode = 'playing';
  }
}

function trySteal() {
  if (!player.onFoot) {
    // Leave the car.
    var c = player.car;
    player.car = null;
    player.onFoot = true;
    player.x = c.x + Math.cos(c.angle + Math.PI / 2) * 34;
    player.y = c.y + Math.sin(c.angle + Math.PI / 2) * 34;
    player.angle = c.angle;
    c.speed = 0;
    c.parked = true;
    toast('You left the car.');
    return;
  }
  var best = null, bestD = 60;
  for (var i = 0; i < cars.length; i++) {
    var c2 = cars[i];
    if (c2.driver) continue;
    var d = dist(player.x, player.y, c2.x, c2.y);
    if (d < bestD) { bestD = d; best = c2; }
  }
  if (!best) { toast('No car close enough. Walk up to a car and press E.'); return; }
  player.car = best;
  player.onFoot = false;
  best.driver = 'player';
  best.parked = false;
  best.traffic = false;
  best.angle = player.angle;
  sfx('steal');
  addWanted(1);
  toast('Car stolen. The cops noticed, wanted level up.');
}

function punch() {
  if (!player.onFoot) return;
  sfx('punch');
  var hx = player.x + Math.cos(player.angle) * 34;
  var hy = player.y + Math.sin(player.angle) * 34;
  for (var i = 0; i < peds.length; i++) {
    var p = peds[i];
    if (p.down > 0) continue;
    if (dist(hx, hy, p.x, p.y) < 34) {
      p.down = 3; p.respawnAt = state.time + 4;
      addWanted(1);
      state.score += 10;
      toast('You knocked a pedestrian down. That was not wise.');
      return;
    }
  }
  for (var j = 0; j < police.length; j++) {
    var pc = police[j];
    if (dist(hx, hy, pc.x, pc.y) < 40) {
      pc.hp -= 1;
      if (pc.hp <= 0) { pc.disabled = true; state.score += 50; addWanted(1); }
      return;
    }
  }
}

function shoot() {
  if (!player.onFoot || player.weapon !== 'pistol' || player.ammo <= 0) {
    if (player.onFoot && player.weapon === 'pistol' && player.ammo <= 0) toast('Out of ammo. Find a pistol pickup.');
    return;
  }
  player.ammo -= 1;
  sfx('shot');
  var wx = state.cam.x + state.mouse.x;
  var wy = state.cam.y + state.mouse.y;
  var a = angleTo(player.x, player.y, wx, wy);
  player.angle = a;
  bullets.push({ x: player.x + Math.cos(a) * 24, y: player.y + Math.sin(a) * 24, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, life: 0.9 });
  addWanted(1);
}

// ---- Update ----
function update(dt) {
  state.time += dt;
  state.clockMin += dt * 0.5; // one game minute every 2 real seconds
  if (state.clockMin >= 24 * 60) state.clockMin -= 24 * 60;
  maybeSiren(state.time);

  // Mission timer.
  if (state.missionTimer > 0) {
    state.missionTimer -= dt;
    if (state.missionTimer <= 0) { state.missionTimer = 0; endGame('timeup'); return; }
  }

  updatePlayer(dt);
  updateTraffic(dt);
  updatePeds(dt);
  updatePolice(dt);
  updateBullets(dt);
  updatePickupsAndStashes(dt);
  updateWanted(dt);

  // Camera follows the player.
  state.cam.x = clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  state.cam.y = clamp(player.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
  state.mouse.wx = state.cam.x + state.mouse.x;
  state.mouse.wy = state.cam.y + state.mouse.y;

  // Engine sound follows speed, only retuned when it changes enough.
  if (engineOsc && engineGain) {
    var target = player.onFoot ? 0 : 0.03 + Math.min(0.05, Math.abs(player.speed) / 520 * 0.05);
    var freq = 40 + Math.abs(player.speed) * 0.12;
    if (Math.abs(engineOsc.frequency.value - freq) > 6) engineOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.1);
    engineGain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.1);
  }
}

function updatePlayer(dt) {
  var up = isDown('KeyW') || isDown('ArrowUp');
  var down = isDown('KeyS') || isDown('ArrowDown');
  var left = isDown('KeyA') || isDown('ArrowLeft');
  var right = isDown('KeyD') || isDown('ArrowRight');

  if (player.onFoot) {
    var mx = (right ? 1 : 0) - (left ? 1 : 0);
    var my = (down ? 1 : 0) - (up ? 1 : 0);
    if (mx || my) {
      var len = Math.sqrt(mx * mx + my * my);
      var nx = player.x + (mx / len) * 230 * dt;
      var ny = player.y + (my / len) * 230 * dt;
      player.angle = Math.atan2(my, mx);
      player.walkFrame += dt * 10;
      if (!circleHitsBuilding(nx, player.y, 14)) player.x = nx;
      if (!circleHitsBuilding(player.x, ny, 14)) player.y = ny;
      player.x = clamp(player.x, 20, WORLD_W - 20);
      player.y = clamp(player.y, 20, WORLD_H - 20);
    }
    player.speed = 0;
  } else {
    var car = player.car;
    if (!car) { player.onFoot = true; return; }
    if (up) car.speed += 620 * dt;
    if (down) car.speed -= 460 * dt;
    car.speed = clamp(car.speed, -160, 540);
    if (!up && !down) car.speed *= Math.pow(0.35, dt);
    if (Math.abs(car.speed) > 12) {
      car.angle += ((right ? 1 : 0) - (left ? 1 : 0)) * 2.1 * dt * (car.speed > 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 160);
    }
    var nx2 = car.x + Math.cos(car.angle) * car.speed * dt;
    var ny2 = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!circleHitsBuilding(nx2, car.y, 17)) car.x = nx2; else car.speed *= 0.4;
    if (!circleHitsBuilding(car.x, ny2, 17)) car.y = ny2; else car.speed *= 0.4;
    car.x = clamp(car.x, 20, WORLD_W - 20);
    car.y = clamp(car.y, 20, WORLD_H - 20);
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    player.speed = car.speed;
    // Ramming a pedestrian at speed.
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      if (p.down > 0) continue;
      if (dist(car.x, car.y, p.x, p.y) < 26 && Math.abs(car.speed) > 60) {
        p.down = 3; p.respawnAt = state.time + 4;
        addWanted(1);
        state.score += 10;
      }
    }
  }
}

function updateTraffic(dt) {
  var trafficCount = 0;
  for (var i = 0; i < cars.length; i++) {
    var c = cars[i];
    if (!c.traffic) continue;
    trafficCount++;
    var sp = c.speed;
    if (c.road === 'h') {
      c.x += c.dir * sp * dt;
      if (c.x < 40) c.x = WORLD_W - 40;
      if (c.x > WORLD_W - 40) c.x = 40;
      c.angle = c.dir > 0 ? 0 : Math.PI;
    } else {
      c.y += c.dir * sp * dt;
      if (c.y < 40) c.y = WORLD_H - 40;
      if (c.y > WORLD_H - 40) c.y = 40;
      c.angle = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }
  // Keep 14 traffic cars on the road: replace any that were stolen.
  if (trafficCount < 14 && state.time % 1 < dt) {
    var horiz = rng() < 0.5;
    var line = horiz ? pick(H_ROADS) : pick(V_ROADS);
    var nc;
    if (horiz) nc = makeCar(60, line + 34, 0, false, true, 'h', line, 1);
    else nc = makeCar(line + 34, 60, Math.PI / 2, false, true, 'v', line, 1);
    nc.speed = rand(90, 150);
    cars.push(nc);
  }
}

function updatePeds(dt) {
  for (var i = 0; i < peds.length; i++) {
    var p = peds[i];
    if (p.down > 0) {
      p.down -= dt;
      if (p.down <= 0 && state.time >= p.respawnAt) {
        var pt = randomRoadsidePoint();
        p.x = pt.x; p.y = pt.y; p.tx = pt.x; p.ty = pt.y; p.flee = false;
      }
      continue;
    }
    var fleeing = state.wanted > 0 && dist(p.x, p.y, player.x, player.y) < 260;
    var tx = p.tx, ty = p.ty;
    if (fleeing) {
      var a = angleTo(player.x, player.y, p.x, p.y);
      tx = p.x + Math.cos(a) * 120;
      ty = p.y + Math.sin(a) * 120;
    }
    var d = dist(p.x, p.y, tx, ty);
    if (d < 12) {
      var np = randomRoadsidePoint();
      p.tx = np.x; p.ty = np.y;
    } else {
      var sp = fleeing ? p.speed * 2.2 : p.speed;
      p.angle = angleTo(p.x, p.y, tx, ty);
      var nx = p.x + Math.cos(p.angle) * sp * dt;
      var ny = p.y + Math.sin(p.angle) * sp * dt;
      if (!pointInBuilding(nx, ny)) { p.x = nx; p.y = ny; }
      p.x = clamp(p.x, 20, WORLD_W - 20);
      p.y = clamp(p.y, 20, WORLD_H - 20);
    }
  }
}

function updatePolice(dt) {
  // Wanted level sets how many police cars chase.
  var want = state.wanted;
  var active = 0;
  for (var i = 0; i < police.length; i++) if (!police[i].disabled) active++;
  if (want > active) {
    for (var s = 0; s < want - active; s++) {
      var a = rand(0, Math.PI * 2);
      var px = clamp(player.x + Math.cos(a) * 650, 60, WORLD_W - 60);
      var py = clamp(player.y + Math.sin(a) * 650, 60, WORLD_H - 60);
      var pc = makeCar(px, py, 0, false, false);
      pc.police = true;
      pc.color = '#111111';
      pc.speed = 0;
      police.push(pc);
    }
  }
  if (want === 0) {
    for (var r = police.length - 1; r >= 0; r--) {
      if (dist(police[r].x, police[r].y, player.x, player.y) > 900) police.splice(r, 1);
    }
  }
  var touching = false;
  for (var j = 0; j < police.length; j++) {
    var p = police[j];
    if (p.disabled) continue;
    var d = dist(p.x, p.y, player.x, player.y);
    var ta = angleTo(p.x, p.y, player.x, player.y);
    var diff = angDiff(ta, p.angle);
    p.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
    var sp = d > 320 ? 470 : (d > 120 ? 400 : 300);
    p.speed = sp;
    var nx = p.x + Math.cos(p.angle) * p.speed * dt;
    var ny = p.y + Math.sin(p.angle) * p.speed * dt;
    if (!circleHitsBuilding(nx, p.y, 17)) p.x = nx;
    if (!circleHitsBuilding(p.x, ny, 17)) p.y = ny;
    if (d < 34) {
      touching = true;
      if (!player.onFoot) {
        player.health -= 14 * dt;
        if (player.car) player.car.speed *= Math.pow(0.5, dt);
        if (player.health <= 0) { player.health = 0; endGame('wasted'); return; }
      }
    }
  }
  if (touching && player.onFoot) {
    state.bustedTimer += dt;
    if (state.bustedTimer > 1.2) { endGame('busted'); return; }
  } else {
    state.bustedTimer = Math.max(0, state.bustedTimer - dt * 2);
  }
}

function updateBullets(dt) {
  for (var i = bullets.length - 1; i >= 0; i--) {
    var b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    var hit = b.life <= 0 || circleHitsBuilding(b.x, b.y, 2) !== null;
    if (!hit) {
      for (var j = 0; j < peds.length; j++) {
        var p = peds[j];
        if (p.down > 0) continue;
        if (dist(b.x, b.y, p.x, p.y) < 16) {
          p.down = 3; p.respawnAt = state.time + 4;
          state.score += 20;
          hit = true;
          break;
        }
      }
    }
    if (!hit) {
      for (var k = 0; k < police.length; k++) {
        var pc = police[k];
        if (pc.disabled) continue;
        if (dist(b.x, b.y, pc.x, pc.y) < 22) {
          pc.hp -= 1;
          if (pc.hp <= 0) { pc.disabled = true; state.score += 100; }
          hit = true;
          break;
        }
      }
    }
    if (hit) bullets.splice(i, 1);
  }
}

function updatePickupsAndStashes(dt) {
  for (var i = 0; i < stashes.length; i++) {
    var s = stashes[i];
    if (s.taken) continue;
    if (dist(player.x, player.y, s.x, s.y) < 34) {
      s.taken = true;
      state.cash += s.v;
      state.score += 100;
      sfx('cash');
      toast('Cash stash: +$' + s.v + ' (debt: $' + state.cash + ' of $' + DEBT + ')');
      if (state.missionIndex === 2) {
        var inMarket = s.x >= 1165 && s.x <= 2435 && s.y >= 1565 && s.y <= 2400;
        if (inMarket) {
          state.nightStashesLeft -= 1;
          if (state.nightStashesLeft <= 0) completeMission();
        }
      }
    }
  }
  for (var j = 0; j < pickups.length; j++) {
    var pk = pickups[j];
    if (pk.taken) continue;
    if (dist(player.x, player.y, pk.x, pk.y) < 32) {
      pk.taken = true;
      if (pk.kind === 'health') {
        player.health = Math.min(100, player.health + 40);
        toast('Health +40.');
      } else {
        player.weapon = 'pistol';
        player.ammo += 12;
        toast('Pistol picked up. 12 rounds. Click or Space to shoot.');
      }
      sfx('pickup');
    }
  }
  // Mission targets.
  var m = MISSIONS[state.missionIndex];
  if (!m || state.mode !== 'playing') return;
  if (state.missionIndex === 0 && dist(player.x, player.y, DOCKS_PICKUP.x, DOCKS_PICKUP.y) < 44) completeMission();
  else if (state.missionIndex === 1 && dist(player.x, player.y, BAYFRONT_DROP.x, BAYFRONT_DROP.y) < 44) completeMission();
  else if (state.missionIndex === 3 && dist(player.x, player.y, HIDEOUT.x, HIDEOUT.y) < 60 && state.wanted === 0) completeMission();
  else if (state.missionIndex === 4) {
    if (m.phase !== 'return' && dist(player.x, player.y, STRIP_VAULT.x, STRIP_VAULT.y) < 44) {
      m.phase = 'return';
      state.missionTarget = HIDEOUT;
      state.cash += 500;
      state.score += 200;
      sfx('cash');
      toast('Vault hit: +$500. Now get back to the Hideout.');
      updateMissionBox();
    } else if (m.phase === 'return' && dist(player.x, player.y, HIDEOUT.x, HIDEOUT.y) < 60) {
      completeMission();
    }
  }
}

function updateWanted(dt) {
  if (state.wanted === 0) return;
  var inHideout = dist(player.x, player.y, HIDEOUT.x, HIDEOUT.y) < 220;
  var quietFor = state.time - state.lastCrimeAt;
  var nearPolice = false;
  for (var i = 0; i < police.length; i++) {
    if (!police[i].disabled && dist(police[i].x, police[i].y, player.x, player.y) < 500) { nearPolice = true; break; }
  }
  if (inHideout) {
    state.wantedTickAt += dt;
    if (state.wantedTickAt >= 3) { state.wantedTickAt = 0; state.wanted -= 1; toast('Laying low at the Hideout. Heat dropping.'); }
  } else if (quietFor > 12 && !nearPolice) {
    state.wantedTickAt += dt;
    if (state.wantedTickAt >= 8) { state.wantedTickAt = 0; state.wanted -= 1; }
  } else {
    state.wantedTickAt = 0;
  }
  if (state.wanted < 0) state.wanted = 0;
}

// ---- Rendering ----
function draw() {
  ctx.fillStyle = '#2e3d2f';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  var cam = state.cam;
  var x0 = cam.x, y0 = cam.y, x1 = cam.x + VIEW_W, y1 = cam.y + VIEW_H;

  // Ground and district tints.
  ctx.fillStyle = '#3a4a3a';
  ctx.fillRect(-x0, -y0, WORLD_W, WORLD_H);
  ctx.fillStyle = '#3d5a3d';
  ctx.fillRect(465 - x0, 965 - y0, 570, 470); // Palm Park
  ctx.fillStyle = '#2f4a63';
  ctx.fillRect(3120 - x0, 0, 80, WORLD_H); // Docks water edge

  // Roads.
  ctx.fillStyle = '#33383f';
  for (var i = 0; i < H_ROADS.length; i++) ctx.fillRect(0 - x0, H_ROADS[i] - ROAD_W / 2 - y0, WORLD_W, ROAD_W);
  for (var j = 0; j < V_ROADS.length; j++) ctx.fillRect(V_ROADS[j] - ROAD_W / 2 - x0, 0 - y0, ROAD_W, WORLD_H);
  // Lane dashes.
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 22]);
  ctx.beginPath();
  for (var i2 = 0; i2 < H_ROADS.length; i2++) {
    ctx.moveTo(0 - x0, H_ROADS[i2] - y0);
    ctx.lineTo(WORLD_W - x0, H_ROADS[i2] - y0);
  }
  for (var j2 = 0; j2 < V_ROADS.length; j2++) {
    ctx.moveTo(V_ROADS[j2] - x0, 0 - y0);
    ctx.lineTo(V_ROADS[j2] - x0, WORLD_H - y0);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Trees in Palm Park.
  for (var t = 0; t < trees.length; t++) {
    var tr = trees[t];
    if (tr.x < x0 - 30 || tr.x > x1 + 30 || tr.y < y0 - 30 || tr.y > y1 + 30) continue;
    ctx.fillStyle = '#2f9e44';
    ctx.beginPath();
    ctx.arc(tr.x - x0, tr.y - y0, tr.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f6b2e';
    ctx.beginPath();
    ctx.arc(tr.x - x0 - 4, tr.y - y0 - 4, tr.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  // Buildings.
  for (var b = 0; b < buildings.length; b++) {
    var bd = buildings[b];
    if (bd.x > x1 || bd.x + bd.w < x0 || bd.y > y1 || bd.y + bd.h < y0) continue;
    ctx.fillStyle = '#00000033';
    ctx.fillRect(bd.x - x0 + 5, bd.y - y0 + 6, bd.w, bd.h);
    ctx.fillStyle = bd.color;
    ctx.fillRect(bd.x - x0, bd.y - y0, bd.w, bd.h);
    ctx.fillStyle = '#ffffff22';
    var wx = bd.x - x0 + 10, wy = bd.y - y0 + 10;
    while (wy + 14 < bd.y - y0 + bd.h - 8) {
      wx = bd.x - x0 + 10;
      while (wx + 12 < bd.x - x0 + bd.w - 8) {
        ctx.fillRect(wx, wy, 12, 14);
        wx += 26;
      }
      wy += 28;
    }
    if (bd.label) {
      ctx.fillStyle = '#ffd43b';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(bd.label, bd.x - x0 + bd.w / 2, bd.y - y0 + bd.h / 2 + 6);
    }
  }

  // District labels.
  ctx.fillStyle = '#ffffff88';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  var labels = [['BAYFRONT', 550, 120], ['THE STRIP', 1800, 120], ['PALM PARK', 750, 1200], ['NIGHT MARKET', 1800, 1750], ['THE DOCKS', 2850, 1750], ['HIDEOUT', 170, 2160]];
  for (var l = 0; l < labels.length; l++) {
    ctx.fillText(labels[l][0], labels[l][1] - x0, labels[l][2] - y0);
  }

  // Cash stashes.
  for (var s = 0; s < stashes.length; s++) {
    var st = stashes[s];
    if (st.taken) continue;
    if (st.x < x0 - 30 || st.x > x1 + 30 || st.y < y0 - 30 || st.y > y1 + 30) continue;
    var pulse = 1 + Math.sin(state.time * 4) * 0.12;
    ctx.fillStyle = '#2f9e44';
    ctx.beginPath();
    ctx.arc(st.x - x0, st.y - y0, 15 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('$', st.x - x0, st.y - y0 + 6);
  }

  // Pickups.
  for (var pk = 0; pk < pickups.length; pk++) {
    var p = pickups[pk];
    if (p.taken) continue;
    if (p.x < x0 - 30 || p.x > x1 + 30 || p.y < y0 - 30 || p.y > y1 + 30) continue;
    ctx.fillStyle = p.kind === 'health' ? '#e03131' : '#ffd43b';
    ctx.fillRect(p.x - x0 - 12, p.y - y0 - 12, 24, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(p.kind === 'health' ? '+' : 'P', p.x - x0, p.y - y0 + 6);
  }

  // Mission target marker.
  if (state.missionTarget && state.mode === 'playing') {
    var mt = state.missionTarget;
    var bob = Math.sin(state.time * 5) * 6;
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.moveTo(mt.x - x0, mt.y - y0 - 26 + bob);
    ctx.lineTo(mt.x - x0 - 14, mt.y - y0 - 48 + bob);
    ctx.lineTo(mt.x - x0 + 14, mt.y - y0 - 48 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(mt.x - x0, mt.y - y0, 26 + Math.sin(state.time * 4) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cars.
  for (var c = 0; c < cars.length; c++) drawCar(cars[c], x0, y0);
  for (var pc = 0; pc < police.length; pc++) drawCar(police[pc], x0, y0, true);

  // Pedestrians.
  for (var pd = 0; pd < peds.length; pd++) {
    var ped = peds[pd];
    if (ped.x < x0 - 30 || ped.x > x1 + 30 || ped.y < y0 - 30 || ped.y > y1 + 30) continue;
    if (ped.down > 0) {
      ctx.fillStyle = ped.shirt;
      ctx.beginPath();
      ctx.ellipse(ped.x - x0, ped.y - y0, 14, 8, ped.angle, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    var bob2 = Math.sin(state.time * 8 + pd) * 2;
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(ped.x - x0, ped.y - y0 + bob2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(ped.x - x0 + Math.cos(ped.angle) * 4, ped.y - y0 + Math.sin(ped.angle) * 4 + bob2, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bullets.
  ctx.fillStyle = '#ffe066';
  for (var bl = 0; bl < bullets.length; bl++) {
    ctx.beginPath();
    ctx.arc(bullets[bl].x - x0, bullets[bl].y - y0, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player.
  drawPlayer(x0, y0);

  // Waypoint arrow at the screen edge.
  if (state.missionTarget && state.mode === 'playing') {
    var dx = state.missionTarget.x - player.x;
    var dy = state.missionTarget.y - player.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > 420) {
      var aa = Math.atan2(dy, dx);
      var ax = VIEW_W / 2 + Math.cos(aa) * 300;
      var ay = VIEW_H / 2 + Math.sin(aa) * 220;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(aa);
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -12);
      ctx.lineTo(-12, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffd43b';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(d) + 'm', ax, ay + 30);
    }
  }

  drawMinimap();
}

function drawCar(car, x0, y0, isPolice) {
  if (car.x < x0 - 60 || car.x > x0 + VIEW_W + 60 || car.y < y0 - 60 || car.y > y0 + VIEW_H + 60) return;
  ctx.save();
  ctx.translate(car.x - x0, car.y - y0);
  ctx.rotate(car.angle);
  ctx.fillStyle = '#00000044';
  ctx.fillRect(-20, -11, 44, 26);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-20, -11, 44, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#a5d8ff';
  ctx.fillRect(-4, -9, 12, 18);
  ctx.fillStyle = '#222222';
  ctx.fillRect(-20, -12, 7, 4);
  ctx.fillRect(-20, 8, 7, 4);
  ctx.fillRect(13, -12, 7, 4);
  ctx.fillRect(13, 8, 7, 4);
  if (isPolice) {
    var flash = Math.floor(state.time * 4) % 2 === 0;
    ctx.fillStyle = flash ? '#ff0000' : '#0066ff';
    ctx.beginPath();
    ctx.arc(-2, -6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#0066ff' : '#ff0000';
    ctx.beginPath();
    ctx.arc(-2, 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
  }
  ctx.restore();
}

function drawPlayer(x0, y0) {
  var px = player.x - x0, py = player.y - y0;
  if (player.onFoot) {
    var bob = Math.sin(player.walkFrame) * 2;
    ctx.fillStyle = '#ff5da2';
    ctx.beginPath();
    ctx.arc(px, py + bob, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f1c27d';
    ctx.beginPath();
    ctx.arc(px + Math.cos(player.angle) * 5, py + Math.sin(player.angle) * 5 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(player.angle) * 10, py + Math.sin(player.angle) * 10);
    ctx.lineTo(px + Math.cos(player.angle) * 24, py + Math.sin(player.angle) * 24);
    ctx.stroke();
  } else {
    // Small marker above the driven car.
    ctx.fillStyle = '#ff5da2';
    ctx.beginPath();
    ctx.moveTo(px, py - 30);
    ctx.lineTo(px - 8, py - 44);
    ctx.lineTo(px + 8, py - 44);
    ctx.closePath();
    ctx.fill();
  }
}

function drawMinimap() {
  var mw = minimap.width, mh = minimap.height;
  var sx = mw / WORLD_W, sy = mh / WORLD_H;
  mctx.fillStyle = '#141a14';
  mctx.fillRect(0, 0, mw, mh);
  mctx.fillStyle = '#3a4a3a';
  mctx.fillRect(0, 0, mw, mh);
  mctx.fillStyle = '#555c66';
  for (var i = 0; i < H_ROADS.length; i++) mctx.fillRect(0, H_ROADS[i] * sy - 3, mw, 6);
  for (var j = 0; j < V_ROADS.length; j++) mctx.fillRect(V_ROADS[j] * sx - 3, 0, 6, mh);
  mctx.fillStyle = '#6b7a8c';
  for (var b = 0; b < buildings.length; b++) {
    mctx.fillRect(buildings[b].x * sx, buildings[b].y * sy, Math.max(2, buildings[b].w * sx), Math.max(2, buildings[b].h * sy));
  }
  if (state.missionTarget) {
    mctx.fillStyle = '#ffd43b';
    mctx.beginPath();
    mctx.arc(state.missionTarget.x * sx, state.missionTarget.y * sy, 5 + Math.sin(state.time * 4) * 2, 0, Math.PI * 2);
    mctx.fill();
  }
  mctx.fillStyle = '#ff0000';
  for (var p = 0; p < police.length; p++) {
    if (police[p].disabled) continue;
    mctx.fillRect(police[p].x * sx - 2, police[p].y * sy - 2, 4, 4);
  }
  mctx.fillStyle = '#ffe066';
  mctx.beginPath();
  mctx.arc(player.x * sx, player.y * sy, 4, 0, Math.PI * 2);
  mctx.fill();
  mctx.strokeStyle = '#ffffff';
  mctx.lineWidth = 1;
  mctx.strokeRect(state.cam.x * sx, state.cam.y * sy, VIEW_W * sx, VIEW_H * sy);
}

// ---- HUD and screens ----
var toastTimer = null;
function toast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, 4200);
}

function updateMissionBox() {
  var m = MISSIONS[state.missionIndex];
  var title = document.getElementById('mission-title');
  var text = document.getElementById('mission-text');
  if (!m) {
    title.textContent = 'FREE ROAM';
    text.textContent = 'Debt paid. Sixth City is yours.';
    return;
  }
  title.textContent = m.title;
  var t = m.text;
  if (state.missionIndex === 4 && m.phase === 'return') t = 'Vault hit. Get back to the Hideout.';
  if (state.missionIndex === 3) t = 'The cops are on you. Reach the Hideout and lose them. Wanted: ' + state.wanted + ' stars.';
  text.textContent = t;
}

function updateHUD() {
  document.getElementById('health-fill').style.width = Math.max(0, player.health) + '%';
  document.getElementById('health-fill').style.background = player.health > 50 ? '#37b24d' : (player.health > 25 ? '#f08c00' : '#e03131');
  document.getElementById('cash').textContent = '$' + state.cash + ' / $' + DEBT;
  document.getElementById('score').textContent = String(state.score);
  var stars = '';
  for (var i = 0; i < 5; i++) stars += i < state.wanted ? '<span>&#9733;</span>' : '<span class="dim">&#9733;</span>';
  document.getElementById('wanted').innerHTML = stars;
  document.getElementById('weapon').textContent = player.weapon === 'pistol' ? 'Pistol (' + player.ammo + ')' : 'Fists';
  document.getElementById('speed').textContent = Math.round(Math.abs(player.speed) * 0.12) + ' mph';
  var hh = Math.floor(state.clockMin / 60);
  var mm = Math.floor(state.clockMin % 60);
  document.getElementById('clock').textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  document.getElementById('district').textContent = districtAt(player.x, player.y);
  var mt = document.getElementById('mission-timer');
  mt.textContent = state.missionTimer > 0 ? 'TIME LEFT: ' + Math.ceil(state.missionTimer) + 's' : '';
  if (state.missionIndex === 3 || (state.missionIndex === 4 && MISSIONS[4].phase !== 'return')) updateMissionBox();
}

function showScreen(which) {
  document.getElementById('start-screen').classList.toggle('hidden', which !== 'start');
  document.getElementById('end-screen').classList.toggle('hidden', which !== 'end');
  document.getElementById('hud').classList.toggle('hidden', which !== null);
  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  document.getElementById('touch').classList.toggle('hidden', !(which === null && isTouch));
}

// ---- Main loop ----
var lastTs = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  var dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  if (state.mode === 'playing') {
    update(dt);
    updateHUD();
  }
  if (state.mode === 'playing' || state.mode === 'paused' || state.mode === 'ended') draw();
}

document.getElementById('btn-new').addEventListener('click', function () { newGame(); });
document.getElementById('btn-continue').addEventListener('click', function () {
  if (!loadSave()) {
    toast('No saved game found. Starting a new game.');
    newGame();
  }
});
document.getElementById('btn-retry').addEventListener('click', function () {
  if (state.endReason === 'complete') {
    state.mode = 'playing';
    showScreen(null);
    startMission(5); // past the last mission: free roam
    updateMissionBox();
  } else {
    newGame();
  }
});
document.getElementById('btn-menu').addEventListener('click', function () {
  state.mode = 'menu';
  showScreen('start');
});

// Touch controls.
var dpad = document.querySelectorAll('#dpad button');
for (var d = 0; d < dpad.length; d++) {
  (function (btn) {
    var map = { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD' };
    var code = map[btn.getAttribute('data-k')];
    btn.addEventListener('touchstart', function (e) { e.preventDefault(); touchKeys[code] = true; });
    btn.addEventListener('touchend', function (e) { e.preventDefault(); touchKeys[code] = false; });
    btn.addEventListener('mousedown', function () { touchKeys[code] = true; });
    btn.addEventListener('mouseup', function () { touchKeys[code] = false; });
  })(dpad[d]);
}
document.getElementById('t-steal').addEventListener('click', function () { if (state.mode === 'playing') trySteal(); });
document.getElementById('t-shoot').addEventListener('click', function () { if (state.mode === 'playing') shoot(); });
document.getElementById('t-pause').addEventListener('click', function () { togglePause(); });

// Start screen preview: build the city and draw it behind the menu.
buildCity();
spawnEntities();
state.mode = 'menu';
state.cam.x = clamp(1100 - VIEW_W / 2, 0, WORLD_W - VIEW_W);
state.cam.y = clamp(830 - VIEW_H / 2, 0, WORLD_H - VIEW_H);
player.x = 1100; player.y = 830;
draw();
showScreen('start');
requestAnimationFrame(loop);

// Debug hook for automated playtesting (harmless in normal play).
window.Leonida = {
  get state() { return state; },
  get player() { return player; },
  get cars() { return cars; },
  get peds() { return peds; },
  get police() { return police; },
  teleport: function (x, y) { player.x = x; player.y = y; if (player.car) { player.car.x = x; player.car.y = y; } },
  inBuilding: pointInBuilding,
  hitsBuilding: circleHitsBuilding,
  giveCar: function () {
    var c = cars[0];
    player.car = c; player.onFoot = false; c.driver = 'player'; c.parked = false; c.traffic = false;
    c.x = player.x; c.y = player.y;
  },
  startMission: function (i) { startMission(i); },
  setWanted: function (n) { state.wanted = n; },
};
