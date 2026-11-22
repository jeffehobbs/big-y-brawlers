/* BIG Y BRAWLERS — core game state, exploration, loop */
"use strict";

function rand(a, b){ return a + Math.floor(Math.random() * (b - a + 1)); }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function dist(ax, ay, bx, by){ return Math.hypot(ax - bx, ay - by); }

const TILE = 16;
const VIEW_W = 800, VIEW_H = 512;
const VIEW_TW = VIEW_W / TILE, VIEW_TH = VIEW_H / TILE;

const GAME = {
  state: "TITLE",
  map: null,
  player: null,
  enemies: [],
  pickups: [],
  npcs: [],
  bossSpawned: false,
  timeMin: 7 * 60,
  stepAcc: 0,
  stockUnlocked: false,
  bossDefeated: false,
  zoneDone: {},
  cam: { x: 0, y: 0 },
  msg: null,
  msgT: 0,
  dialog: null,
  intro: null,
  lastZone: "",
  battleCooldown: 0,
  hasSave: false,
  gameOverWhy: "",
  keys: {},
};

function toast(text, t){ GAME.msg = text; GAME.msgT = t || 2.5; }

function newRun(charId){
  const def = CHARS[charId];
  GAME.map = buildMap();
  GAME.player = {
    id: charId, name: def.name,
    px: 27 * TILE + 8, py: 37 * TILE + 8,
    dir: "up", moving: false,
    hp: def.hp, maxHp: def.hp, atk: def.atk, spd: def.spd,
    lvl: 1, xp: 0, xpNext: 35,
    inv: { apple: 2, coupon: 1 },
    talks: 0,
  };
  GAME.timeMin = 7 * 60;
  GAME.stepAcc = 0;
  GAME.stockUnlocked = false;
  GAME.bossDefeated = false;
  GAME.bossSpawned = false;
  GAME.zoneDone = {};
  GAME.zoneCollected = {};
  GAME.battleCooldown = 0;
  GAME.enemies = [];
  GAME.pickups = [];
  GAME.dialog = null;
  GAME.intro = null;
  GAME.lastZone = "";
  for (const z of ZONES){
    GAME.zoneCollected[z.id] = 0;
    for (const [x, y, item] of z.picks) GAME.pickups.push({ x: x * TILE + 8, y: y * TILE + 8, item, zone: z.id, bob: Math.random() * 6 });
  }
  /* initial enemy placement: half of zone max */
  for (const z of ZONES){
    const n = Math.ceil(z.max / 2);
    for (let i = 0; i < n; i++) spawnEnemy(z, true);
  }
  /* NPCs: the two staff who are not the player */
  GAME.npcs = [];
  for (const id of ["sedona", "calvin", "corey"]){
    if (id === charId) continue;
    const pos = NPC_INFO[id].pos;
    GAME.npcs.push({ id, x: pos[0] * TILE + 8, y: pos[1] * TILE + 8 });
  }
  GAME.player.talked = {};
  saveGame();
}

function spawnEnemy(zone, initial){
  if (zone.id === "stock") return;
  const alive = GAME.enemies.filter(e => e.zone.id === zone.id && !e.dead).length;
  if (alive >= zone.max) return;
  /* find a non-solid tile in the zone */
  for (let tries = 0; tries < 40; tries++){
    const x = rand(zone.rect[0], zone.rect[2]) * TILE + 8;
    const y = rand(zone.rect[1], zone.rect[3]) * TILE + 8;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (isSolid(GAME.map, tx, ty)) continue;
    if (dist(x, y, GAME.player.px, GAME.player.py) < 90) continue;
    const id = zone.pool[Math.floor(Math.random() * zone.pool.length)];
    const def = ENEMIES[id];
    const scale = initial ? 1 : (0.9 + Math.random() * 0.25);
    GAME.enemies.push({
      id, def, zone, dead: false,
      x, y,
      hp: Math.round(def.hp * scale), maxHp: Math.round(def.hp * scale),
      atk: def.atk, spd: def.spd,
      dir: "down", moving: false,
      wanderT: 0, dx: 0, dy: 0, pause: 0,
      respawn: 0,
    });
    return;
  }
}

function ensureEnemies(dt){
  for (const z of ZONES){
    const alive = GAME.enemies.filter(e => e.zone.id === z.id && !e.dead).length;
    if (alive < z.max && Math.random() < dt * 0.05) spawnEnemy(z, false);
  }
}

function playerZone(px, py){
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (tx >= 25 && tx <= 38 && ty >= 1 && ty <= 5) return ZONES.find(z => z.id === "aisles"); // stock handled separately
  for (const z of ZONES){
    const [x0, y0, x1, y1] = z.rect;
    if (tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1) return z;
  }
  return null;
}

function solidAtPx(x, y){
  return isSolid(GAME.map, Math.floor(x / TILE), Math.floor(y / TILE));
}
function canStand(x, y){
  const r = 5;
  return !solidAtPx(x - r, y - r) && !solidAtPx(x + r, y - r) &&
         !solidAtPx(x - r, y + r) && !solidAtPx(x + r, y + r) &&
         !solidAtPx(x - r, y) && !solidAtPx(x + r, y);
}

function moveEntity(e, dx, dy, dt){
  const speed = e.chase ? 62 : 42;
  let vx = dx * speed * dt, vy = dy * speed * dt;
  const ox = e.x, oy = e.y;
  if (canStand(e.x + vx, e.y)) e.x += vx;
  if (canStand(e.x, e.y + vy)) e.y += vy;
  if (e.x !== ox || e.y !== oy) e.moving = true; else e.moving = false;
  if (Math.abs(dx) > Math.abs(dy)) e.dir = dx > 0 ? "side" : "side";
  else if (Math.abs(dy) > Math.abs(dx)) e.dir = dy > 0 ? "down" : "up";
  if (dx < 0) e.faceLeft = true; else if (dx > 0) e.faceLeft = false;
  return (e.x !== ox || e.y !== oy);
}

function updateExplore(dt, t){
  const P = GAME.player;
  if (GAME.dialog){
    if (GAME.dialog.wait){ GAME.dialog.wait -= dt; if (GAME.dialog.wait <= 0) GAME.dialog.wait = null; }
    return;
  }
  /* movement */
  let dx = 0, dy = 0;
  const k = GAME.keys;
  if (k["left"] || k["arrowleft"] || k["a"]) dx -= 1;
  if (k["right"] || k["arrowright"] || k["d"]) dx += 1;
  if (k["up"] || k["arrowup"] || k["w"]) dy -= 1;
  if (k["down"] || k["arrowdown"] || k["s"]) dy += 1;
  P.moving = !!(dx || dy);
  if (P.moving){
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    const speed = 78;
    const ox = P.px, oy = P.py;
    const vx = dx * speed * dt, vy = dy * speed * dt;
    if (canStand(P.px + vx, P.py)) P.px += vx;
    if (canStand(P.px, P.py + vy)) P.py += vy;
    P.px = clamp(P.px, TILE + 6, (MW - 1) * TILE - 6);
    P.py = clamp(P.py, TILE + 6, (MH - 1) * TILE - 6);
    if (Math.abs(dx) > Math.abs(dy)) P.dir = "side";
    else P.dir = dy > 0 ? "down" : "up";
    P.faceLeft = dx < 0;
    GAME.stepAcc += Math.hypot(P.px - ox, P.py - oy);
    if (GAME.stepAcc >= 16){
      GAME.stepAcc -= 16;
      GAME.timeMin += 0.25; /* 15 game-seconds per tile-step */
      AudioFX.play("step");
    }
  }

  /* zone toast */
  const tz = playerZone(P.px, P.py);
  const zoneId = tz ? tz.id : "";
  if (P.px / TILE >= 25 && P.px / TILE <= 38 && P.py / TILE >= 1 && P.py / TILE <= 5){
    if (GAME.stockUnlocked && !GAME.bossSpawned && !GAME.bossDefeated){
      GAME.bossSpawned = true;
      const def = ENEMIES.captain;
      GAME.enemies.push({
        id: "captain", def, zone: { id: "stock", name: "STOCKROOM", rect: [25,1,38,5], pool: [], max: 1 },
        dead: false, x: 31 * TILE + 8, y: 3 * TILE + 8,
        hp: def.hp, maxHp: def.hp, atk: def.atk, spd: def.spd,
        dir: "down", moving: false, wanderT: 0, dx: 0, dy: 0, pause: 0, boss: true,
      });
      toast("THE CARTEL CAPTAIN IS HERE. NO ESCAPE.", 3.5);
      AudioFX.play("battle");
    }
  }
  if (zoneId && zoneId !== GAME.lastZone){
    GAME.lastZone = zoneId;
    if (tz) toast("ZONE: " + tz.name, 2.0);
  }

  /* enemies */
  ensureEnemies(dt);
  GAME.battleCooldown = Math.max(0, GAME.battleCooldown - dt);
  for (const e of GAME.enemies){
    if (e.dead) continue;
    const d = dist(e.x, e.y, P.px, P.py);
    e.chase = d < 70 && GAME.battleCooldown <= 0;
    if (e.chase && !e.boss){
      const ang = Math.atan2(P.py - e.y, P.px - e.x);
      e.dx = Math.cos(ang); e.dy = Math.sin(ang);
    } else if (!e.boss){
      e.wanderT -= dt;
      if (e.wanderT <= 0){
        e.wanderT = 1 + Math.random() * 2.5;
        const r = Math.random();
        if (r < 0.35){ e.dx = 0; e.dy = 0; }
        else {
          const a = rand(0, 3);
          e.dx = [0, 1, 0, -1][a]; e.dy = [1, 0, -1, 0][a];
        }
      }
    }
    if (e.dx || e.dy){
      if (!moveEntity(e, e.dx, e.dy, dt)){
        e.wanderT = 0;
      }
    }
    /* contact -> battle */
    if (d < 15 && GAME.battleCooldown <= 0 && !GAME.dialog){
      startBattle(e);
      return;
    }
  }

  /* pickups */
  for (const p of GAME.pickups){
    if (p.taken) continue;
    p.bob += dt * 3;
    if (dist(p.x, p.y, P.px, P.py) < 14){
      p.taken = true;
      GAME.giveItem(p.item, true);
      GAME.zoneCollected[p.zone] = (GAME.zoneCollected[p.zone] || 0) + 1;
      const z = ZONES.find(z => z.id === p.zone);
      const left = z.picks.length - (GAME.zoneCollected[p.zone] || 0);
      AudioFX.play("pickup");
      const it = ITEMS[p.item];
      const hpGain = (it.kind === "heal") ? Math.ceil(it.v / 2) : (it.kind === "both" ? 6 : 4);
      const before = P.hp;
      P.hp = Math.min(P.maxHp, P.hp + hpGain);
      const got = Math.round(P.hp - before);
      toast("BAGGED " + it.name + (got > 0 ? "  +" + got + " HP" : "") + "  (" + collectedCount() + "/" + TOTAL_PICKS + ")", 2.0);
      if (left === 0){
        GAME.zoneDone[p.zone] = true;
        toast(z.name + " RESTOCKED!", 3.0);
        AudioFX.play("restock");
      }
      if (!GAME.stockUnlocked && collectedCount() >= UNLOCK_AT){
        GAME.stockUnlocked = true;
        toast("STOCKROOM UNLOCKED! HEAD TO THE TOP-RIGHT.", 3.5);
        AudioFX.play("door");
      }
      saveGame();
    }
  }

  /* NPC proximity + talk */
  GAME.nearNpc = null;
  for (const n of GAME.npcs){
    if (dist(n.x, n.y, P.px, P.py) < 26) GAME.nearNpc = n;
  }

  /* break room healing */
  const tt = GAME.map[Math.floor(P.py / TILE)] ? GAME.map[Math.floor(P.py / TILE)][Math.floor(P.px / TILE)] : ".";
  if (tt === "R" && P.hp < P.maxHp){
    P.hp = Math.min(P.maxHp, P.hp + 3 * dt);
  }

  /* exit gap */
  const py = Math.floor(P.py / TILE);
  if (py === 38){
    toast("THE DOORS ARE LOCKED. RESTOCK THE STORE FIRST!", 2.5);
    P.py = 37 * TILE + 8;
  }

  /* closing time */
  if (GAME.timeMin >= 21 * 60){
    GAME.gameOverWhy = "THE STORE CLOSED AT 9 PM. THE CARTEL KEEPS THE GROCERIES.";
    GAME.state = "GAMEOVER";
    AudioFX.play("lose");
  }
}

function collectedCount(){
  return GAME.pickups.filter(p => p.taken).length;
}
function giveItem(id, silent){
  GAME.player.inv[id] = (GAME.player.inv[id] || 0) + 1;
  if (!silent) toast("GOT " + ITEMS[id].name + "!", 1.5);
}

function startBattle(enemy){
  const zid = enemy.boss ? "stock" : enemy.zone.id;
  const zc = { checkout:"#3a3540", aisles:"#403a30", fresh:"#30402e", dairy:"#2e3a48", deli:"#403030", stock:"#2a2a30" }[zid];
  Combat.zone = { id: zid, name: enemy.boss ? "STOCKROOM" : enemy.zone.name };
  Combat.start(Combat.zone, enemy.id, !!enemy.boss);
  enemy.dead = true; /* removed from map during battle */
  GAME.battleRef = enemy;
  GAME.battleCooldown = 1.2;
  GAME.state = "BATTLE";
  GAME.timeMin += 8; /* a fight takes 8 minutes */
}

function endBattle(){
  Combat.active = false;
  const e = GAME.battleRef;
  if (Combat.over === "flee"){
    if (e){ e.dead = false; e.dx = 0; e.dy = 0; }
    GAME.battleCooldown = 2.5;
  }
  if (Combat.over === "lose"){
    GAME.state = "GAMEOVER";
    GAME.gameOverWhy = "YOU WERE OVERRUN BY THE CROWD. THE SHIFT IS OVER.";
    return;
  }
  if (GAME.bossDefeated){
    GAME.state = "VICTORY";
    clearSave();
    return;
  }
  GAME.state = "EXPLORE";
  GAME.battleCooldown = Math.max(GAME.battleCooldown, 1.0);
  saveGame();
}

/* ---- save / load ---- */
function saveGame(){
  try {
    const P = GAME.player;
    const data = {
      char: P.id, hp: Math.round(P.hp), maxHp: P.maxHp, atk: P.atk, spd: P.spd,
      lvl: P.lvl, xp: P.xp, xpNext: P.xpNext, inv: P.inv,
      timeMin: Math.round(GAME.timeMin * 4) / 4,
      taken: GAME.pickups.filter(p => p.taken).map(p => p.item),
      stockUnlocked: GAME.stockUnlocked, bossDefeated: GAME.bossDefeated,
      zoneDone: GAME.zoneDone, zoneCollected: GAME.zoneCollected,
      talked: P.talked,
    };
    localStorage.setItem("bigy_brawlers_save", JSON.stringify(data));
    GAME.hasSave = true;
  } catch (e){}
}
function loadGame(){
  try {
    const raw = localStorage.getItem("bigy_brawlers_save");
    if (!raw) return false;
    const d = JSON.parse(raw);
    newRun(d.char);
    const P = GAME.player;
    P.hp = d.hp; P.maxHp = d.maxHp; P.atk = d.atk; P.spd = d.spd;
    P.lvl = d.lvl; P.xp = d.xp; P.xpNext = d.xpNext; P.inv = d.inv;
    P.talked = d.talked || {};
    GAME.timeMin = d.timeMin;
    GAME.stockUnlocked = d.stockUnlocked;
    GAME.bossDefeated = d.bossDefeated;
    GAME.zoneDone = d.zoneDone || {};
    GAME.zoneCollected = d.zoneCollected || {};
    /* restore taken pickups */
    const pool = d.taken.slice();
    for (const p of GAME.pickups){
      const i = pool.indexOf(p.item);
      if (i >= 0){ p.taken = true; pool.splice(i, 1); }
    }
    if (GAME.bossDefeated) GAME.bossSpawned = true;
    return true;
  } catch (e){ return false; }
}
function clearSave(){
  try { localStorage.removeItem("bigy_brawlers_save"); } catch (e){}
  GAME.hasSave = false;
}

GAME.giveItem = giveItem;
