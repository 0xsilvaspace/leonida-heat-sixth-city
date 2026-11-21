// Leonida Heat: Sixth City
// Original open world crime game. All names, art and sound are original.
// No Rockstar content, no copied assets, no copyrighted music.
(function () {
  'use strict';
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var mini = document.getElementById('minimap');
  var mctx = mini.getContext('2d');

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var WORLD_W = 3200, WORLD_H = 2400;
  var ROADS_X = [500, 1100, 1700, 2300, 2850];
  var ROADS_Y = [400, 900, 1400, 1900];
  var ROAD_W = 110;

  // Buildings, generated in blocks between roads. Deterministic-ish, hand tuned zones.
  var buildings = [];
  function addBuilding(x, y, w, h, color, label) {
    buildings.push({ x: x, y: y, w: w, h: h, color: color, label: label || '' });
  }
  (function buildCity() {
    var colors = ['#3a4a6b', '#5b3a6b', '#2f5d50', '#6b4a3a', '#44506b', '#5d3a4a'];
    var xs = [80, 620, 1220, 1820, 2420];
    var ys = [80, 520, 1020, 1520, 2020];
    var ci = 0;
    for (var i = 0; i < xs.length; i++) {
      for (var j = 0; j < ys.length; j++) {
        // Leave the park and the hideout plaza clear
        if (i === 1 && j === 2) continue;
        if (i === 0 && j === 0) continue;
        var w = 200 + ((i * 37 + j * 53) % 120);
        var h = 130 + ((i * 29 + j * 41) % 110);
        addBuilding(xs[i], ys[j], w, h, colors[ci % colors.length]);
        ci++;
      }
    }
    // Docks warehouses, south east
    addBuilding(2550, 2050, 260, 140, '#4a4a55', 'DOCKS');
    addBuilding(2550, 2220, 200, 120, '#3a3a4a', 'DOCKS');
  })();

  function isRoad(x, y) {
    for (var i = 0; i < ROADS_X.length; i++) if (Math.abs(x - ROADS_X[i]) < ROAD_W / 2) return true;
    for (var j = 0; j < ROADS_Y.length; j++) if (Math.abs(y - ROADS_Y[j]) < ROAD_W / 2) return true;
    return false;
  }
  function hitsBuilding(x, y, r) {
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    }
    return null;
  }
  function onBeach(x, y) { return x > 2950; }

  var CAR_COLORS = ['#ff4d6d', '#ffd23e', '#4dc3ff', '#7dff9a', '#c77dff', '#ff8c42', '#e8e8e8', '#2b2b2b'];
  var PLACES = {
    hideout: { x: 300, y: 280, name: 'Hideout' },
    bayfront: { x: 2850, y: 420, name: 'Bayfront' },
    strip: { x: 1700, y: 900, name: 'The Strip' },
    docks: { x: 2680, y: 2120, name: 'Docks' },
    park: { x: 850, y: 1250, name: 'Palm Park' },
    market: { x: 1100, y: 1900, name: 'Night Market' }
  };

  var MISSIONS = [
    { id: 1, title: 'MISSION 1: FIRST WHEELS', text: 'Steal a car. Walk up to any parked car and press E, then drive to Bayfront.', target: PLACES.bayfront, type: 'drive', reward: 200 },
    { id: 2, title: 'MISSION 2: BAYFRONT PICKUP', text: 'On foot or by car, reach the green package at Bayfront, then deliver it to Palm Park.', target: PLACES.bayfront, type: 'pickup', reward: 350 },
    { id: 3, title: 'MISSION 3: HEAT ON THE STRIP', text: 'The crew wants heat. Get a 2 star wanted level, then lose it. Hiding in the park helps it fall.', target: PLACES.strip, type: 'wanted', reward: 400 },
    { id: 4, title: 'MISSION 4: DOCKSIDE DEAL', text: 'Go to the Docks. Grab the cash, watch for rivals, then get out alive.', target: PLACES.docks, type: 'collect', reward: 600 },
    { id: 5, title: 'MISSION 5: SIXTH CITY KING', text: 'Final run. Drive to the Hideout before time runs out. You have 90 seconds.', target: PLACES.hideout, type: 'timed', time: 90, reward: 1000 }
  ];

  var state = null;
  function newState() {
    return {
      started: false, paused: false, over: false, overReason: '',
      time: 0, day: 1, clockMin: 9 * 60,
      player: { x: 300, y: 320, angle: 0, health: 100, money: 250, score: 0, wanted: 0, wantedTimer: 0, inCar: null, weapon: 'FISTS', ammo: 0, run: false },
      cam: { x: 0, y: 0 },
      cars: [], traffic: [], peds: [], police: [], pickups: [], bullets: [], rivals: [],
      missionIndex: 0, missionStage: 0, missionTimer: 0, hasPackage: false, collected: 0,
      cashFound: 0, carsStolen: 0, bustedMeter: 0, message: '', muted: false
    };
  }

  function spawnCars() {
    state.cars = [];
    var spots = [
      [380, 460, '#ff4d6d'], [760, 940, '#4dc3ff'], [1180, 460, '#ffd23e'], [1780, 1440, '#7dff9a'],
      [2380, 940, '#c77dff'], [520, 1480, '#ff8c42'], [1720, 460, '#e8e8e8'], [2620, 1440, '#2b2b2b'],
      [1140, 1980, '#ff4d6d'], [2340, 1980, '#4dc3ff'], [640, 1980, '#ffd23e'], [2900, 900, '#7dff9a']
    ];
    for (var i = 0; i < spots.length; i++) {
      state.cars.push({ x: spots[i][0], y: spots[i][1], angle: pick([0, 1.57, 3.14, -1.57]), color: spots[i][2], speed: 0, parked: true, isPolice: false, isPlayer: false });
    }
    state.traffic = [];
    for (var t = 0; t < 14; t++) {
      var rx = pick(ROADS_X), ry = pick(ROADS_Y);
      var horiz = Math.random() < 0.5;
      state.traffic.push({ x: horiz ? rand(100, WORLD_W - 100) : rx, y: horiz ? ry : rand(100, WORLD_H - 100), angle: horiz ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2), color: pick(CAR_COLORS), speed: rand(90, 150), parked: false, isPolice: false });
    }
    state.peds = [];
    for (var p = 0; p < 26; p++) {
      state.peds.push({ x: rand(100, WORLD_W - 200), y: rand(100, WORLD_H - 100), angle: rand(0, 6.28), speed: rand(30, 60), color: pick(['#ffd23e', '#ff8fb8', '#9be7ff', '#ffffff', '#ffb347']), flee: 0 });
    }
  }
  function spawnPickups() {
    state.pickups = [];
    var spots = [[850, 1250, 'cash'], [1700, 900, 'cash'], [2680, 2120, 'cash'], [1100, 1900, 'cash'], [2850, 420, 'cash'], [500, 900, 'health'], [2300, 1400, 'pistol'], [1400, 400, 'cash'], [700, 1900, 'cash'], [2000, 500, 'health'], [2600, 900, 'cash'], [900, 500, 'cash']];
    for (var i = 0; i < spots.length; i++) state.pickups.push({ x: spots[i][0], y: spots[i][1], kind: spots[i][2], taken: false });
  }

  // Audio, all synthesized, no files.
  var audioCtx = null;
  function beep(freq, dur, type, vol) {
    if (!state || state.muted) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.value = vol || 0.05; o.connect(g); g.connect(audioCtx.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (dur || 0.12)); o.stop(audioCtx.currentTime + (dur || 0.12));
    } catch (e) { /* audio is optional */ }
  }
  function sfx(name) {
    if (name === 'pickup') { beep(880, 0.12, 'sine', 0.08); setTimeout(function () { beep(1320, 0.15, 'sine', 0.08); }, 80); }
    else if (name === 'hit') beep(180, 0.1, 'sawtooth', 0.06);
    else if (name === 'siren') beep(700, 0.25, 'sawtooth', 0.04);
    else if (name === 'mission') { beep(523, 0.12, 'sine', 0.08); setTimeout(function () { beep(659, 0.12, 'sine', 0.08); }, 110); setTimeout(function () { beep(784, 0.2, 'sine', 0.08); }, 220); }
    else if (name === 'busted') beep(220, 0.4, 'sawtooth', 0.08);
  }


  // Input
  var keys = {};
  var mouse = { x: 0, y: 0, down: false };
  window.addEventListener('keydown', function (e) {
    keys[e.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(e.key.toLowerCase()) >= 0) e.preventDefault();
    if (e.key.toLowerCase() === 'e') tryEnterCar();
    if (e.key.toLowerCase() === ' ') tryAttack();
    if (e.key.toLowerCase() === 'p' || e.key === 'Escape') togglePause();
    if (e.key.toLowerCase() === 'm' && state) { state.muted = !state.muted; toast(state.muted ? 'Sound off' : 'Sound on'); }
  });
  window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  canvas.addEventListener('mousemove', function (e) { var r = canvas.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * (canvas.width / r.width); mouse.y = (e.clientY - r.top) * (canvas.height / r.height); });
  canvas.addEventListener('mousedown', function () { mouse.down = true; tryAttack(); });
  window.addEventListener('mouseup', function () { mouse.down = false; });

  // Touch controls
  if ('ontouchstart' in window) document.body.classList.add('touch');
  document.querySelectorAll('#dpad button').forEach(function (b) {
    var k = b.getAttribute('data-k');
    var map = { up: 'w', down: 's', left: 'a', right: 'd' };
    b.addEventListener('touchstart', function (e) { e.preventDefault(); keys[map[k]] = true; }, { passive: false });
    b.addEventListener('touchend', function () { keys[map[k]] = false; });
  });
  document.getElementById('btn-enter').addEventListener('click', tryEnterCar);
  document.getElementById('btn-action').addEventListener('click', tryAttack);
  document.getElementById('btn-run').addEventListener('touchstart', function () { keys['shift'] = true; });
  document.getElementById('btn-run').addEventListener('touchend', function () { keys['shift'] = false; });

  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function nearestCar(maxD) {
    var best = null, bd = maxD;
    var all = state.cars.concat(state.traffic);
    for (var i = 0; i < all.length; i++) {
      var d = dist(state.player.x, state.player.y, all[i].x, all[i].y);
      if (d < bd) { bd = d; best = all[i]; }
    }
    return best;
  }
  function tryEnterCar() {
    if (!state || !state.started || state.paused || state.over) return;
    var p = state.player;
    if (p.inCar) {
      var c = p.inCar; c.isPlayer = false; c.speed = 0; c.parked = true;
      p.inCar = null; p.x = c.x + 40; p.y = c.y + 30;
      toast('You left the car'); return;
    }
    var car = nearestCar(70);
    if (car) {
      if (car.isPolice) { toast('That is a police car. Too risky.'); return; }
      p.inCar = car; car.isPlayer = true; car.parked = false;
      // Remove from traffic list if it was traffic
      state.traffic = state.traffic.filter(function (t) { return t !== car; });
      if (state.cars.indexOf(car) < 0) state.cars.push(car);
      state.carsStolen++;
      addWanted(1, 'Car stolen in the open');
      beep(440, 0.1, 'square', 0.06);
      toast('Car stolen. Drive!');
      if (state.missionIndex === 0) { state.missionStage = 1; updateMissionText(); }
    } else {
      toast('No car close enough. Walk to a parked car.');
    }
  }
  function tryAttack() {
    if (!state || !state.started || state.paused || state.over) return;
    var p = state.player;
    if (p.inCar) return;
    if (p.weapon === 'PISTOL' && p.ammo > 0) {
      p.ammo--;
      var wx = state.cam.x + mouse.x, wy = state.cam.y + mouse.y;
      var ang = Math.atan2(wy - p.y, wx - p.x);
      state.bullets.push({ x: p.x, y: p.y, vx: Math.cos(ang) * 700, vy: Math.sin(ang) * 700, life: 0.6 });
      beep(1200, 0.06, 'square', 0.07);
      addWanted(1, 'Shots fired');
      return;
    }
    // Punch, short range
    beep(180, 0.08, 'sawtooth', 0.05);
    var hit = false;
    for (var i = 0; i < state.peds.length; i++) {
      if (dist(p.x, p.y, state.peds[i].x, state.peds[i].y) < 46) { state.peds[i].flee = 3; hit = true; }
    }
    for (var j = 0; j < state.rivals.length; j++) {
      if (dist(p.x, p.y, state.rivals[j].x, state.rivals[j].y) < 50) { state.rivals[j].health -= 34; hit = true; if (state.rivals[j].health <= 0) { state.player.money += 80; state.player.score += 150; toast('Rival down. +$80'); state.rivals.splice(j, 1); j--; } }
    }
    if (hit) addWanted(1, 'Assault in public');
  }
  function addWanted(n, reason) {
    var p = state.player;
    var before = p.wanted;
    p.wanted = clamp(p.wanted + n, 0, 5);
    p.wantedTimer = 0;
    if (p.wanted > before && p.wanted >= 2) { sfx('siren'); toast('WANTED: ' + p.wanted + ' stars. ' + (reason || '')); }
  }

  function currentMission() { return MISSIONS[state.missionIndex] || null; }
  function updateMissionText() {
    var m = currentMission();
    var box = document.getElementById('mission-title');
    var txt = document.getElementById('mission-text');
    var prog = document.getElementById('mission-progress');
    if (!m) { box.textContent = 'ALL MISSIONS DONE'; txt.textContent = 'You cleared the debt. Keep driving, collect cash, and stay free in Sixth City.'; prog.textContent = 'Free roam. Score: ' + state.player.score; return; }
    box.textContent = m.title;
    if (m.type === 'drive' && state.missionStage === 1) txt.textContent = 'Good. Now drive to Bayfront on the east beach. Follow the yellow marker.';
    else if (m.type === 'pickup' && state.hasPackage) txt.textContent = 'Package picked up. Deliver it to Palm Park, west side of the city.';
    else if (m.type === 'wanted' && state.missionStage === 1) txt.textContent = 'You hit 2 stars. Now lose them. Stay out of sight, avoid police, wait it out.';
    else txt.textContent = m.text;
    var extra = '';
    if (m.type === 'timed') extra = 'Time left: ' + Math.max(0, Math.ceil(state.missionTimer)) + 's';
    if (m.type === 'collect') extra = 'Cash collected here: ' + state.collected + ' / 1';
    prog.textContent = 'Reward $' + m.reward + '  ' + extra + '  |  Cash found: ' + state.cashFound + ' / 12';
  }
  function completeMission() {
    var m = currentMission(); if (!m) return;
    state.player.money += m.reward; state.player.score += m.reward * 2 + 200;
    sfx('mission'); toast('Mission complete! +$' + m.reward);
    state.missionIndex++; state.missionStage = 0; state.hasPackage = false; state.collected = 0;
    if (state.missionIndex === 3) spawnRivals();
    if (state.missionIndex >= MISSIONS.length) { toast('All 5 missions done. Debt cleared!'); }
    saveGame(); updateMissionText();
  }
  function spawnRivals() {
    state.rivals = [];
    for (var i = 0; i < 4; i++) state.rivals.push({ x: PLACES.docks.x + rand(-120, 120), y: PLACES.docks.y + rand(-100, 100), health: 100, speed: 110 });
    toast('Rivals at the Docks. Be ready.');
  }

  function checkMission() {
    var m = currentMission(); if (!m) return;
    var p = state.player;
    var px = p.inCar ? p.inCar.x : p.x, py = p.inCar ? p.inCar.y : p.y;
    if (m.type === 'drive' && state.missionStage === 1 && dist(px, py, m.target.x, m.target.y) < 130) completeMission();
    else if (m.type === 'pickup') {
      if (!state.hasPackage && dist(px, py, PLACES.bayfront.x, PLACES.bayfront.y) < 120) { state.hasPackage = true; toast('Package picked up. Now to Palm Park.'); updateMissionText(); }
      else if (state.hasPackage && dist(px, py, PLACES.park.x, PLACES.park.y) < 130) completeMission();
    } else if (m.type === 'wanted') {
      if (p.wanted >= 2 && state.missionStage === 0) { state.missionStage = 1; toast('2 stars. Now lose them.'); updateMissionText(); }
      else if (state.missionStage === 1 && p.wanted === 0) completeMission();
    } else if (m.type === 'collect' && dist(px, py, PLACES.docks.x, PLACES.docks.y) < 130 && state.collected === 0) {
      state.collected = 1; state.player.money += 150; toast('Dock cash grabbed. +$150'); updateMissionText();
      if (state.rivals.length === 0) completeMission();
      else setTimeout(function () { if (currentMission() && currentMission().type === 'collect') completeMission(); }, 1200);
    } else if (m.type === 'timed') {
      if (dist(px, py, m.target.x, m.target.y) < 130) completeMission();
    }
  }


  function update(dt) {
    if (!state.started || state.paused || state.over) return;
    state.time += dt;
    state.clockMin += dt * 2;
    if (state.clockMin >= 24 * 60) { state.clockMin = 0; state.day++; }
    var p = state.player;
    var speed = (keys['shift'] ? 340 : 220);

    // Movement, on foot or driving
    if (p.inCar) {
      var car = p.inCar;
      var forward = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 0.6 : 0);
      var steer = (keys['a'] || keys['arrowleft'] ? 1 : 0) - (keys['d'] || keys['arrowright'] ? 1 : 0);
      // Note: left is positive steer in this top down layout, handled below
      if (keys['a'] || keys['arrowleft']) car.angle -= 2.4 * dt * (car.speed >= 0 ? 1 : -1) * (Math.abs(car.speed) > 20 ? 1 : 0);
      if (keys['d'] || keys['arrowright']) car.angle += 2.4 * dt * (car.speed >= 0 ? 1 : -1) * (Math.abs(car.speed) > 20 ? 1 : 0);
      car.speed += forward * 420 * dt;
      car.speed *= Math.pow(0.4, dt);
      car.speed = clamp(car.speed, -180, 540);
      var nx = car.x + Math.cos(car.angle) * car.speed * dt;
      var ny = car.y + Math.sin(car.angle) * car.speed * dt;
      if (!hitsBuilding(nx, car.y, 22)) car.x = nx; else car.speed *= -0.3;
      if (!hitsBuilding(car.x, ny, 22)) car.y = ny; else car.speed *= -0.3;
      car.x = clamp(car.x, 30, WORLD_W - 30); car.y = clamp(car.y, 30, WORLD_H - 30);
      p.x = car.x; p.y = car.y; p.angle = car.angle;
      if (Math.abs(car.speed) > 300 && Math.random() < dt * 0.5) { /* fast driving, small wanted risk if near police handled below */ }
      // Hitting peds while driving is a crime, and slows the car a little
      for (var pi = 0; pi < state.peds.length; pi++) {
        if (dist(car.x, car.y, state.peds[pi].x, state.peds[pi].y) < 28) {
          state.peds[pi].flee = 4; state.peds[pi].x += rand(-80, 80); state.peds[pi].y += rand(-80, 80);
          addWanted(1, 'Pedestrian hit'); car.speed *= 0.6; sfx('hit');
        }
      }
    } else {
      var mx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
      var my = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
      if (mx !== 0 || my !== 0) {
        var len = Math.sqrt(mx * mx + my * my); mx /= len; my /= len;
        p.angle = Math.atan2(my, mx);
        var nx2 = p.x + mx * speed * dt, ny2 = p.y + my * speed * dt;
        if (!hitsBuilding(nx2, p.y, 16)) p.x = nx2;
        if (!hitsBuilding(p.x, ny2, 16)) p.y = ny2;
        p.x = clamp(p.x, 20, WORLD_W - 20); p.y = clamp(p.y, 20, WORLD_H - 20);
      }
    }

    // Traffic
    for (var ti = 0; ti < state.traffic.length; ti++) {
      var t = state.traffic[ti];
      t.x += Math.cos(t.angle) * t.speed * dt; t.y += Math.sin(t.angle) * t.speed * dt;
      if (t.x < 40) { t.x = 40; t.angle = 0; } if (t.x > WORLD_W - 40) { t.x = WORLD_W - 40; t.angle = Math.PI; }
      if (t.y < 40) { t.y = 40; t.angle = Math.PI / 2; } if (t.y > WORLD_H - 40) { t.y = WORLD_H - 40; t.angle = -Math.PI / 2; }
      if (!isRoad(t.x, t.y)) { t.x = pick(ROADS_X); t.y = pick(ROADS_Y); }
    }
    // Pedestrians
    for (var pe = 0; pe < state.peds.length; pe++) {
      var pd = state.peds[pe];
      if (pd.flee > 0) { pd.flee -= dt; pd.x += Math.cos(pd.angle) * 160 * dt; pd.y += Math.sin(pd.angle) * 160 * dt; }
      else { pd.x += Math.cos(pd.angle) * pd.speed * dt; pd.y += Math.sin(pd.angle) * pd.speed * dt; if (Math.random() < dt * 0.2) pd.angle = rand(0, 6.28); }
      pd.x = clamp(pd.x, 30, WORLD_W - 30); pd.y = clamp(pd.y, 30, WORLD_H - 30);
    }
    // Pickups
    for (var pk = 0; pk < state.pickups.length; pk++) {
      var up = state.pickups[pk];
      if (!up.taken && dist(p.x, p.y, up.x, up.y) < 42) {
        up.taken = true;
        if (up.kind === 'cash') { p.money += 50; p.score += 50; state.cashFound++; toast('Cash stash +$50'); }
        if (up.kind === 'health') { p.health = Math.min(100, p.health + 40); toast('Health +40'); }
        if (up.kind === 'pistol') { p.weapon = 'PISTOL'; p.ammo = 24; toast('Pistol found. Click to shoot, Space also fires.'); }
        sfx('pickup'); updateMissionText();
      }
    }
    // Bullets
    for (var bi = state.bullets.length - 1; bi >= 0; bi--) {
      var b = state.bullets[bi]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      var dead = b.life <= 0;
      for (var ri = 0; ri < state.rivals.length; ri++) {
        if (dist(b.x, b.y, state.rivals[ri].x, state.rivals[ri].y) < 26) {
          state.rivals[ri].health -= 50; dead = true;
          if (state.rivals[ri].health <= 0) { p.money += 80; p.score += 150; toast('Rival down. +$80'); state.rivals.splice(ri, 1); }
          break;
        }
      }
      if (dead) state.bullets.splice(bi, 1);
    }
    // Rivals chase
    for (var rv = 0; rv < state.rivals.length; rv++) {
      var r = state.rivals[rv]; var ra = Math.atan2(p.y - r.y, p.x - r.x);
      r.x += Math.cos(ra) * r.speed * dt; r.y += Math.sin(ra) * r.speed * dt;
      if (dist(r.x, r.y, p.x, p.y) < 34) { p.health -= 22 * dt; if (p.health <= 0) endGame('WASTED', 'A rival at the Docks got you.'); }
    }

    // Wanted decay and police
    if (p.wanted > 0) {
      p.wantedTimer += dt;
      var inPark = dist(p.x, p.y, PLACES.park.x, PLACES.park.y) < 220;
      var decayAfter = inPark ? 6 : 14;
      if (p.wantedTimer > decayAfter) { p.wanted--; p.wantedTimer = 0; if (p.wanted === 0) toast('You lost the police. Wanted level clear.'); updateMissionText(); }
    }
    var wantPolice = p.wanted > 0 ? Math.min(p.wanted + 1, 4) : 0;
    while (state.police.length < wantPolice) {
      state.police.push({ x: p.x + rand(-500, 500), y: p.y + rand(-500, 500), angle: 0, speed: 0, color: '#1a1a2e', isPolice: true });
    }
    while (state.police.length > wantPolice) state.police.pop();
    for (var po = 0; po < state.police.length; po++) {
      var pc = state.police[po];
      var pa = Math.atan2(p.y - pc.y, p.x - pc.x); pc.angle = pa;
      var ps = 300 + p.wanted * 30;
      pc.x += Math.cos(pa) * ps * dt; pc.y += Math.sin(pa) * ps * dt;
      if (dist(pc.x, pc.y, p.x, p.y) < 46) {
        if (p.inCar) { p.health -= 8 * dt; pc.x -= Math.cos(pa) * 30; }
        else {
          state.bustedMeter += dt;
          if (state.bustedMeter > 2.2) endGame('BUSTED', 'The Sixth City police caught you on foot. You lost $100 in bail.');
        }
      }
    }
    if (p.wanted === 0) state.bustedMeter = 0;

    // Timed mission
    var m = currentMission();
    if (m && m.type === 'timed') {
      if (state.missionTimer === 0) state.missionTimer = m.time;
      state.missionTimer -= dt;
      if (state.missionTimer <= 0) { state.missionTimer = 0; endGame('TIME UP', 'You ran out of time on the final run. The crew is not happy.'); }
      updateMissionText();
    }
    checkMission();
    // Camera
    state.cam.x = clamp(p.x - canvas.width / 2, 0, WORLD_W - canvas.width);
    state.cam.y = clamp(p.y - canvas.height / 2, 0, WORLD_H - canvas.height);
    updateHUD();
  }

  function updateHUD() {
    var p = state.player;
    var stars = '';
    for (var i = 0; i < 5; i++) stars += i < p.wanted ? '&#9733;' : '<span class="off">&#9733;</span>';
    document.getElementById('stars').innerHTML = stars;
    document.getElementById('health-fill').style.width = Math.max(0, p.health) + '%';
    document.getElementById('money').textContent = '$' + p.money;
    document.getElementById('score').textContent = 'SCORE ' + p.score;
    document.getElementById('weapon').textContent = p.weapon;
    document.getElementById('ammo').textContent = p.weapon === 'PISTOL' ? ('Ammo ' + p.ammo) : '';
    document.getElementById('speed').textContent = p.inCar ? ('Speed ' + Math.round(Math.abs(p.inCar.speed) * 0.12) + ' mph') : 'On foot';
    var hh = Math.floor(state.clockMin / 60), mm = Math.floor(state.clockMin % 60);
    document.getElementById('clock').textContent = 'DAY ' + state.day + ' - ' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    // Waypoint arrow
    var mm2 = currentMission();
    var wp = document.getElementById('waypoint');
    if (mm2 && state.started && !state.over) {
      var tx = mm2.target.x, ty = mm2.target.y;
      if (mm2.type === 'pickup' && state.hasPackage) { tx = PLACES.park.x; ty = PLACES.park.y; }
      var sx = tx - state.cam.x, sy = ty - state.cam.y;
      if (sx > 40 && sx < canvas.width - 40 && sy > 40 && sy < canvas.height - 40) { wp.style.display = 'none'; }
      else {
        wp.style.display = 'block';
        var ang = Math.atan2(sy - canvas.height / 2, sx - canvas.width / 2);
        var rx = canvas.width / 2 + Math.cos(ang) * 180, ry = canvas.height / 2 + Math.sin(ang) * 180;
        var rect = canvas.getBoundingClientRect();
        wp.style.left = (rx / canvas.width * rect.width) + 'px'; wp.style.top = (ry / canvas.height * rect.height) + 'px';
        wp.textContent = '➤';
        wp.style.transform = 'rotate(' + (ang * 180 / Math.PI) + 'deg)';
      }
    } else wp.style.display = 'none';
  }


  function drawCar(c, isPlayerCar) {
    ctx.save(); ctx.translate(c.x - state.cam.x, c.y - state.cam.y); ctx.rotate(c.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-20, -10, 44, 24);
    ctx.fillStyle = c.isPolice ? '#1a1a2e' : c.color;
    ctx.fillRect(-22, -12, 44, 24);
    ctx.fillStyle = c.isPolice ? '#ffffff' : '#222';
    ctx.fillRect(-6, -10, 14, 20);
    ctx.fillStyle = '#bfe9ff'; ctx.fillRect(14, -9, 5, 18);
    if (c.isPolice) { ctx.fillStyle = '#ff2e4d'; ctx.fillRect(-20, -12, 10, 5); ctx.fillStyle = '#2e7dff'; ctx.fillRect(-8, -12, 10, 5); }
    if (isPlayerCar) { ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 3; ctx.strokeRect(-24, -14, 48, 28); }
    ctx.restore();
  }
  function render() {
    if (!state) return;
    var vw = canvas.width, vh = canvas.height;
    // Ground
    ctx.fillStyle = '#2a4d3a'; ctx.fillRect(0, 0, vw, vh);
    // Beach and water, east edge
    ctx.fillStyle = '#e8c98a'; ctx.fillRect(2950 - state.cam.x, 0, 250, vh);
    ctx.fillStyle = '#2e7dc2'; ctx.fillRect(3080 - state.cam.x, 0, 220, vh);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px Arial'; ctx.fillText('LEONIDA BAY', 2980 - state.cam.x, 60);
    // Park
    ctx.fillStyle = '#3f8f4f'; ctx.fillRect(PLACES.park.x - 220 - state.cam.x, PLACES.park.y - 180 - state.cam.y, 440, 360);
    ctx.fillStyle = '#2f7a3f';
    for (var pi = 0; pi < 12; pi++) { var px = PLACES.park.x - 180 + (pi % 4) * 120, py = PLACES.park.y - 140 + Math.floor(pi / 4) * 110; ctx.beginPath(); ctx.arc(px - state.cam.x, py - state.cam.y, 22, 0, 6.29); ctx.fill(); }
    // Roads
    ctx.fillStyle = '#2b2b33';
    for (var i = 0; i < ROADS_X.length; i++) ctx.fillRect(ROADS_X[i] - ROAD_W / 2 - state.cam.x, 0, ROAD_W, vh);
    for (var j = 0; j < ROADS_Y.length; j++) ctx.fillRect(0, ROADS_Y[j] - ROAD_W / 2 - state.cam.y, vw, ROAD_W);
    ctx.strokeStyle = '#ffd23e'; ctx.setLineDash([18, 16]); ctx.lineWidth = 3;
    for (var i2 = 0; i2 < ROADS_X.length; i2++) { ctx.beginPath(); ctx.moveTo(ROADS_X[i2] - state.cam.x, 0); ctx.lineTo(ROADS_X[i2] - state.cam.x, vh); ctx.stroke(); }
    for (var j2 = 0; j2 < ROADS_Y.length; j2++) { ctx.beginPath(); ctx.moveTo(0, ROADS_Y[j2] - state.cam.y); ctx.lineTo(vw, ROADS_Y[j2] - state.cam.y); ctx.stroke(); }
    ctx.setLineDash([]);
    // Buildings
    for (var b = 0; b < buildings.length; b++) {
      var bl = buildings[b];
      ctx.fillStyle = bl.color; ctx.fillRect(bl.x - state.cam.x, bl.y - state.cam.y, bl.w, bl.h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (var wx = 12; wx < bl.w - 10; wx += 28) for (var wy = 12; wy < bl.h - 10; wy += 28) ctx.fillRect(bl.x - state.cam.x + wx, bl.y - state.cam.y + wy, 12, 14);
      if (bl.label) { ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.fillText(bl.label, bl.x - state.cam.x + 10, bl.y - state.cam.y + 24); }
    }
    // Place markers
    function marker(place, color, label) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(place.x - state.cam.x, place.y - state.cam.y, 12, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.fillText(label, place.x - state.cam.x - 28, place.y - state.cam.y - 18);
    }
    marker(PLACES.hideout, '#ffd23e', 'HIDEOUT');
    marker(PLACES.bayfront, '#4dc3ff', 'BAYFRONT');
    marker(PLACES.docks, '#ff8c42', 'DOCKS');
    marker(PLACES.strip, '#ff4d8d', 'THE STRIP');
    // Pickups
    for (var pk = 0; pk < state.pickups.length; pk++) {
      var up = state.pickups[pk]; if (up.taken) continue;
      ctx.fillStyle = up.kind === 'cash' ? '#37e08a' : (up.kind === 'health' ? '#ff5d5d' : '#ffd23e');
      ctx.beginPath(); ctx.arc(up.x - state.cam.x, up.y - state.cam.y, 10, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = 'bold 12px Arial'; ctx.fillText(up.kind === 'cash' ? '$' : (up.kind === 'health' ? '+' : 'P'), up.x - state.cam.x - 4, up.y - state.cam.y + 4);
    }
    // Mission target ring
    var m = currentMission();
    if (m) {
      var tx = m.target.x, ty = m.target.y;
      if (m.type === 'pickup' && state.hasPackage) { tx = PLACES.park.x; ty = PLACES.park.y; }
      ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(tx - state.cam.x, ty - state.cam.y, 34 + Math.sin(state.time * 3) * 6, 0, 6.29); ctx.stroke();
    }
    // Traffic, parked cars, police, rivals, peds
    for (var ti = 0; ti < state.traffic.length; ti++) drawCar(state.traffic[ti], false);
    for (var ci = 0; ci < state.cars.length; ci++) drawCar(state.cars[ci], state.cars[ci].isPlayer);
    for (var po = 0; po < state.police.length; po++) drawCar(state.police[po], false);
    for (var ri = 0; ri < state.rivals.length; ri++) {
      var r = state.rivals[ri];
      ctx.fillStyle = '#c22'; ctx.beginPath(); ctx.arc(r.x - state.cam.x, r.y - state.cam.y, 14, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.fillText('RIVAL', r.x - state.cam.x - 20, r.y - state.cam.y - 20);
    }
    for (var pe = 0; pe < state.peds.length; pe++) {
      var pd = state.peds[pe];
      ctx.fillStyle = pd.color; ctx.beginPath(); ctx.arc(pd.x - state.cam.x, pd.y - state.cam.y, 9, 0, 6.29); ctx.fill();
    }
    // Bullets
    ctx.fillStyle = '#ffe14d';
    for (var bi = 0; bi < state.bullets.length; bi++) { ctx.beginPath(); ctx.arc(state.bullets[bi].x - state.cam.x, state.bullets[bi].y - state.cam.y, 4, 0, 6.29); ctx.fill(); }
    // Player
    var p = state.player;
    if (!p.inCar) {
      ctx.save(); ctx.translate(p.x - state.cam.x, p.y - state.cam.y); ctx.rotate(p.angle);
      ctx.fillStyle = '#ff4d8d'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(8, -4, 14, 8);
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.fillText('MARCUS', p.x - state.cam.x - 26, p.y - state.cam.y - 22);
    }
    // Minimap
    mctx.fillStyle = '#16233d'; mctx.fillRect(0, 0, 180, 135);
    mctx.fillStyle = '#2e7dc2'; mctx.fillRect(165, 0, 15, 135);
    mctx.fillStyle = '#444'; for (var mx = 0; mx < ROADS_X.length; mx++) mctx.fillRect(ROADS_X[mx] / WORLD_W * 180 - 2, 0, 4, 135);
    for (var my = 0; my < ROADS_Y.length; my++) mctx.fillRect(0, ROADS_Y[my] / WORLD_H * 135 - 2, 180, 4);
    mctx.fillStyle = '#37e08a'; for (var mp = 0; mp < state.pickups.length; mp++) if (!state.pickups[mp].taken) mctx.fillRect(state.pickups[mp].x / WORLD_W * 180 - 1, state.pickups[mp].y / WORLD_H * 135 - 1, 3, 3);
    if (m) { mctx.fillStyle = '#ffd23e'; mctx.beginPath(); mctx.arc(m.target.x / WORLD_W * 180, m.target.y / WORLD_H * 135, 5, 0, 6.29); mctx.fill(); }
    mctx.fillStyle = '#ff4d8d'; mctx.beginPath(); mctx.arc(p.x / WORLD_W * 180, p.y / WORLD_H * 135, 5, 0, 6.29); mctx.fill();
    mctx.fillStyle = '#fff'; mctx.beginPath(); mctx.arc(p.x / WORLD_W * 180, p.y / WORLD_H * 135, 2, 0, 6.29); mctx.fill();
    for (var mp2 = 0; mp2 < state.police.length; mp2++) { mctx.fillStyle = '#2e7dff'; mctx.fillRect(state.police[mp2].x / WORLD_W * 180 - 2, state.police[mp2].y / WORLD_H * 135 - 2, 4, 4); }
  }

  function resize() {
    var wrap = document.getElementById('game-wrap');
    canvas.width = wrap.clientWidth; canvas.height = wrap.clientHeight;
  }
  window.addEventListener('resize', resize);

  var last = 0;
  function loop(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
    if (state && state.started && !state.paused && !state.over) update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function saveGame() {
    if (!state) return;
    try {
      localStorage.setItem('leonidaHeatSaveV1', JSON.stringify({
        money: state.player.money, score: state.player.score, missionIndex: state.missionIndex,
        cashFound: state.cashFound, carsStolen: state.carsStolen, health: state.player.health,
        x: state.player.x, y: state.player.y
      }));
    } catch (e) { /* save is best effort */ }
  }
  function loadGame() {
    try {
      var raw = localStorage.getItem('leonidaHeatSaveV1');
      if (!raw) return null; return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function startGame(fromSave) {
    state = newState();
    spawnCars(); spawnPickups();
    if (fromSave) {
      var s = loadGame();
      if (s) {
        state.player.money = s.money || 250; state.player.score = s.score || 0;
        state.missionIndex = s.missionIndex || 0; state.cashFound = s.cashFound || 0;
        state.player.health = s.health || 100; state.player.x = s.x || 300; state.player.y = s.y || 320;
        toast('Saved game loaded. Mission ' + (state.missionIndex + 1));
      }
    }
    state.started = true;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    updateMissionText(); updateHUD();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    sfx('mission');
  }
  function endGame(title, text) {
    if (!state || state.over) return;
    state.over = true; state.overReason = title;
    sfx('busted');
    document.getElementById('end-title').textContent = title;
    document.getElementById('end-text').textContent = text;
    document.getElementById('end-stats').textContent = 'Score ' + state.player.score + '  |  Cash $' + state.player.money + '  |  Missions done ' + state.missionIndex + ' of 5  |  Cars stolen ' + state.carsStolen;
    document.getElementById('end-screen').classList.remove('hidden');
    if (title === 'BUSTED') state.player.money = Math.max(0, state.player.money - 100);
  }
  function togglePause() {
    if (!state || !state.started || state.over) return;
    state.paused = !state.paused;
    document.getElementById('pause-screen').classList.toggle('hidden', !state.paused);
  }

  document.getElementById('btn-start').addEventListener('click', function () { startGame(false); });
  document.getElementById('btn-continue').addEventListener('click', function () {
    if (!loadGame()) { toast('No saved game yet. Start a new game.'); return; }
    startGame(true);
  });
  document.getElementById('btn-restart').addEventListener('click', function () { startGame(false); });
  document.getElementById('btn-menu').addEventListener('click', function () {
    state = newState(); document.getElementById('end-screen').classList.add('hidden'); document.getElementById('start-screen').classList.remove('hidden');
  });
  document.getElementById('btn-resume').addEventListener('click', togglePause);
  document.getElementById('btn-save').addEventListener('click', function () { saveGame(); toast('Game saved.'); });
  document.getElementById('btn-quit').addEventListener('click', function () {
    saveGame(); state.paused = false; state.started = false;
    document.getElementById('pause-screen').classList.add('hidden'); document.getElementById('start-screen').classList.remove('hidden');
  });

  // Boot
  state = newState();
  spawnCars(); spawnPickups();
  resize();
  updateMissionText();
  // Show Continue only if there is a save, otherwise keep it visible but it will warn
  requestAnimationFrame(loop);
  // Expose a tiny test hook, used by local checks only
  window.__leonida = { getState: function () { return state; }, start: startGame, missions: MISSIONS };
})();
