/* BIG Y BRAWLERS — turn-based combat */
"use strict";

const Combat = {
  active: false,
  zone: null, enemy: null, enemyId: "",
  turn: "player", round: 1,
  menu: 0, subMenu: -1, sel: 0,
  gauge: 0,
  log: "", logT: 0,
  pAnim: { shake: 0, lunge: 0, flash: 0 },
  eAnim: { shake: 0, lunge: 0, flash: 0 },
  pops: [],          // damage popups
  over: null,        // "win" | "lose" | "flee"
  overT: 0,
  eStunned: false,
  pGuard: false,
  pBuff: 0,
  pDouble: false,
  bossPhase: 0,
  lootBag: [],

  start(zone, enemyId, isBoss){
    const def = ENEMIES[enemyId];
    this.active = true;
    this.zone = zone;
    this.enemyId = enemyId;
    this.enemy = {
      def, id: enemyId, name: def.name,
      hp: def.hp, maxHp: def.hp, atk: def.atk, spd: def.spd,
      tier: def.tier, boss: !!def.boss, quote: def.quote[Math.floor(Math.random()*def.quote.length)],
    };
    this.turn = "player"; this.round = 1;
    this.menu = 0; this.subMenu = -1; this.sel = 0;
    this.gauge = Math.min(100, this.gauge);
    this.log = (isBoss ? "THE " : "") + def.name + " BLOCKS YOUR PATH!";
    this.logT = 2.2;
    this.pAnim = { shake:0, lunge:0, flash:0 };
    this.eAnim = { shake:0, lunge:0, flash:0 };
    this.pops = []; this.over = null; this.overT = 0;
    this.eStunned = false; this.pGuard = false; this.pBuff = 0; this.pDouble = false;
    this.bossPhase = 0;
    this.lootBag = [];
    this.ended = false;
    this.scroll = 0;
    AudioFX.play("battle");
  },

  say(msg){ this.log = msg; this.logT = 2.0; },

  playerAtkMult(){ return 1 + this.pBuff * 0.001; }, // buff is flat, handled separately

  /* ---- player actions ---- */
  action(kind, itemIdx){
    if (this.over || this.turn !== "player") return;
    const P = GAME.player, E = this.enemy;
    if (kind === "flee"){
      if (E.boss){ this.say("NO FLEEING THE CARTEL CAPTAIN!"); return; }
      const chance = Math.min(0.9, 0.5 + (P.spd - E.spd) * 0.05);
      if (Math.random() < chance){
        this.over = "flee"; this.overT = 1.2; AudioFX.play("flee");
      } else {
        this.say("CAN'T GET AWAY!");
        this.enemyAttack();
        this.endPlayerTurn();
      }
      return;
    }
    if (kind === "attack"){
      let dmg = P.atk + this.pBuff + rand(0, 3);
      const crit = Math.random() < 0.12;
      if (crit) dmg = Math.round(dmg * 1.6);
      this.dealToEnemy(dmg, crit ? "crit" : "hit");
      if (this.pDouble){
        this.pDouble = false;
        let d2 = P.atk + this.pBuff + rand(0, 2);
        this.dealToEnemy(d2, "hit");
      }
      this.gauge = Math.min(100, this.gauge + 30);
    } else if (kind === "special"){
      if (this.gauge < 100){ this.say("SPECIAL NEEDS A FULL SCAN GAUGE!"); return; }
      this.gauge = 0;
      AudioFX.play("special");
      if (P.id === "sedona"){
        const dmg = (P.atk + this.pBuff) * 2 + rand(0,4);
        this.dealToEnemy(dmg, "crit");
        const loot = E.def.loot[Math.floor(Math.random() * E.def.loot.length)];
        GAME.giveItem(loot);
        this.say("SCAN & TAG! STOLE A " + ITEMS[loot].name + "!");
      } else if (P.id === "calvin"){
        const dmg = P.atk + this.pBuff + rand(6, 12);
        this.dealToEnemy(dmg, "crit");
        this.eStunned = true;
        this.say("MANAGER'S STAMP! " + E.name + " IS DAZED!");
      } else {
        const dmg = Math.round((P.atk + this.pBuff) * 1.7) + rand(0, 5);
        this.dealToEnemy(dmg, "crit");
        const heal = 15;
        P.hp = Math.min(P.maxHp, P.hp + heal);
        this.pops.push({ side:"p", text:"+" + heal, color:"#5aff8a", t:1.2, dy:0 });
        this.say("STORE CREDIT STORM ZAPS " + E.name + "!");
        AudioFX.play("heal");
      }
    } else if (kind === "guard"){
      this.pGuard = true;
      this.gauge = Math.min(100, this.gauge + 20);
      AudioFX.play("guard");
      this.say("YOU BRACE WITH A FULL CART!");
    } else if (kind === "item"){
      const inv = GAME.player.inv;
      const ids = Object.keys(inv).filter(i => inv[i] > 0);
      if (ids.length === 0){ this.say("BAG IS EMPTY!"); return; }
      if (itemIdx === undefined){ this.subMenu = 0; this.sel = 0; this.scroll = 0; return; }
      const id = ids[itemIdx];
      if (!id) return;
      inv[id]--;
      const it = ITEMS[id];
      if (it.kind === "heal"){
        P.hp = Math.min(P.maxHp, P.hp + it.v);
        this.pops.push({ side:"p", text:"+" + it.v, color:"#5aff8a", t:1.2, dy:0 });
        this.say("ATE " + it.name + ". RESTORED " + it.v + " HP.");
        AudioFX.play("heal");
      } else if (it.kind === "attack"){
        this.dealToEnemy(it.v, "hit");
        this.say("THREW " + it.name + " FOR " + it.v + " DMG!");
      } else if (it.kind === "both"){
        this.dealToEnemy(it.v, "hit");
        P.hp = Math.min(P.maxHp, P.hp + 10);
        this.pops.push({ side:"p", text:"+10", color:"#5aff8a", t:1.2, dy:14 });
        this.say("EGG SLAP! " + it.v + " DMG AND A NICE MUNCH.");
      } else if (it.kind === "guard"){
        this.pGuard = true;
        P.hp = Math.min(P.maxHp, P.hp + it.v);
        this.pops.push({ side:"p", text:"+" + it.v, color:"#5aff8a", t:1.2, dy:0 });
        this.say("CHIPS AND A GUARD. CLASSIC.");
        AudioFX.play("heal");
      } else if (it.kind === "haste"){
        this.pDouble = true;
        let dmg = P.atk + this.pBuff + rand(0, 3);
        this.dealToEnemy(dmg, "hit");
        let d2 = P.atk + this.pBuff + rand(0, 3);
        this.dealToEnemy(d2, "crit");
        this.say("COFFEE KICK! DOUBLE STRIKE!");
        AudioFX.play("special");
      } else if (it.kind === "buff"){
        this.pBuff += it.v;
        this.say("COUPON CLIP! +" + it.v + " ATK FOR THE BATTLE.");
        AudioFX.play("pickup");
      }
      if (!this.enemy.dead) this.gauge = Math.min(100, this.gauge + 15);
    }
    if (!this.enemy.dead) this.endPlayerTurn();
  },

  dealToEnemy(dmg, type){
    const E = this.enemy;
    if (E.dead) return;
    E.hp -= dmg;
    this.eAnim.shake = 0.3; this.eAnim.flash = 0.15; this.pAnim.lunge = 0.18;
    this.pops.push({ side:"e", text: String(dmg), color: type === "crit" ? "#ffd700" : "#ffffff", t: 1.0, dy: 0 });
    AudioFX.play(type === "crit" ? "crit" : "hit");
    if (E.hp <= 0){
      E.hp = 0; E.dead = true;
      this.win();
    }
  },

  enemyAttack(){
    const P = GAME.player, E = this.enemy;
    if (E.dead) return;
    this.bossPhase++;
    let dmg = E.atk + rand(0, 3);
    let label = "";
    if (E.boss && this.bossPhase % 3 === 0){
      dmg = Math.round(dmg * 1.6); label = "CART SLAM! ";
    }
    if (this.pGuard) dmg = Math.max(1, Math.floor(dmg / 2));
    P.hp -= dmg;
    this.pAnim.shake = 0.3; this.pAnim.flash = 0.15; this.eAnim.lunge = 0.18;
    this.pops.push({ side:"p", text: String(dmg), color: this.pGuard ? "#8ab8ff" : "#ff6a6a", t: 1.0, dy: 0 });
    AudioFX.play(E.boss && label ? "big" : "hit");
    this.gauge = Math.min(100, this.gauge + 15);
    /* 10%: enemy steals a grocery from your bag */
    if (!E.dead && Math.random() < 0.1){
      const ids = Object.keys(P.inv).filter(i => P.inv[i] > 0);
      if (ids.length){
        const id = ids[Math.floor(Math.random() * ids.length)];
        P.inv[id]--;
        this.say(label + E.name + " SWIPES YOUR " + ITEMS[id].name + "!");
      } else {
        this.say(label + (E.boss ? "CART SLAM! " : "") + E.name + " hits you for " + dmg + "!");
      }
    } else if (!E.dead){
      this.say(label + E.name + " hits you for " + dmg + "!");
    }
    if (P.hp <= 0){
      P.hp = 0;
      this.over = "lose"; this.overT = 1.6;
      AudioFX.play("lose");
    }
  },

  endPlayerTurn(){
    if (this.over) return;
    if (this.enemy.dead) return;
    this.turn = "enemy";
    this.pGuard = false;
    setTimeout(() => {
      if (!this.active || this.over || this.enemy.dead) { this.turn = "player"; return; }
      if (this.eStunned){
        this.eStunned = false;
        this.say(this.enemy.name + " IS DAZED AND SKIPS A TURN!");
      } else {
        this.enemyAttack();
      }
      if (!this.over){
        this.turn = "player";
        this.round++;
      }
    }, 700);
  },

  win(){
    const P = GAME.player, E = this.enemy;
    this.over = "win"; this.overT = E.boss ? 2.2 : 1.5;
    AudioFX.play("win");
    /* loot */
    const n = E.boss ? 5 : (1 + (Math.random() < 0.5 ? 1 : 0));
    for (let i = 0; i < n; i++){
      const id = E.def.loot[Math.floor(Math.random() * E.def.loot.length)];
      this.lootBag.push(id);
    }
    for (const id of this.lootBag) GAME.giveItem(id);
    P.xp += E.def.xp;
    let msg = E.name + " IS CLEARED! +" + E.def.xp + " XP, " + this.lootBag.length + " GROCERIES.";
    let leveled = false;
    while (P.xp >= P.xpNext){
      P.xp -= P.xpNext;
      P.lvl++;
      P.maxHp += 10; P.hp = P.maxHp; P.atk += 2;
      if (P.lvl % 2 === 0) P.spd += 1;
      P.xpNext = 20 + P.lvl * 15;
      leveled = true;
    }
    if (leveled){ AudioFX.play("levelup"); msg += "  LEVEL UP! LV " + P.lvl + "."; }
    if (E.boss) GAME.bossDefeated = true;
    this.say(msg);
  },

  update(dt){
    if (!this.active) return;
    for (const a of [this.pAnim, this.eAnim]){
      a.shake = Math.max(0, a.shake - dt);
      a.lunge = Math.max(0, a.lunge - dt);
      a.flash = Math.max(0, a.flash - dt);
    }
    for (const p of this.pops){ p.t -= dt; p.dy -= dt * 30; }
    this.pops = this.pops.filter(p => p.t > 0);
    this.logT = Math.max(0, this.logT - dt);
    if (this.over){
      this.overT -= dt;
      if (this.overT <= 0 && !this.ended){
        this.ended = true;
        endBattle();
      }
    }
  },

  render(g, t){
    const P = GAME.player, E = this.enemy;
    /* backdrop */
    const zc = { checkout:"#3a3540", aisles:"#403a30", fresh:"#30402e", dairy:"#2e3a48", deli:"#403030", stock:"#2a2a30" }[this.zone ? this.zone.id : "aisles"] || "#3a3a3a";
    g.fillStyle = "#14141a"; g.fillRect(0, 0, 800, 512);
    g.fillStyle = zc; g.fillRect(0, 0, 800, 420);
    /* floor */
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let i = 0; i < 20; i++) g.fillRect(i * 40, 300, 40, 120);
    for (let i = 0; i < 50; i++){
      g.fillStyle = "rgba(255,255,255,0.03)";
      g.fillRect(i * 16, 300, 8, 120);
    }
    /* shelf silhouettes */
    g.fillStyle = "rgba(0,0,0,0.35)";
    for (let i = 0; i < 4; i++) g.fillRect(40 + i * 200, 90, 120, 160);
    g.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 4; i++) for (let r = 0; r < 4; r++) g.fillRect(48 + i * 200, 100 + r * 40, 104, 10);
    /* sprites */
    const frame = Math.floor(t * 4) % 2;
    const px = 150 + (this.pAnim.lunge > 0 ? 40 : 0), py = 235;
    const ex = 560 - (this.eAnim.lunge > 0 ? 40 : 0), ey = 235;
    const s = 5, es = E.boss ? 6 : 5;
    let pgrid = SPR[P.id]["side"][frame];
    let egrid = SPR[E.id]["side"][frame];
    if (this.pAnim.shake > 0) { g.save(); g.translate(rand(-2,2), rand(-2,2)); } 
    drawGrid(g, pgrid, px, py, s);
    if (this.pAnim.flash > 0){ g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(px - 4, py - 4, 16 * s + 8, 16 * s + 8); }
    if (this.pAnim.shake > 0) g.restore();
    if (this.eAnim.shake > 0) { g.save(); g.translate(rand(-2,2), rand(-2,2)); }
    drawGrid(g, egrid, ex, ey, es, true);
    drawCart(g, ex + 16 * es + 4, ey + 4 * es, Math.max(2, Math.round(es * 0.8)), E.boss ? "#ffd700" : "#b8c0c8");
    if (this.eAnim.flash > 0){ g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(ex - 4, ey - 4, 16 * es + 8, 16 * es + 8); }
    if (this.eAnim.shake > 0) g.restore();
    /* shadow */
    g.fillStyle = "rgba(0,0,0,0.4)";
    g.fillRect(px - 2, py + 16 * s - 2, 16 * s, 4);
    g.fillRect(ex - 2, ey + 16 * es - 2, 16 * es + 14, 4);

    /* HUD */
    const S = GAME.big ? 2 : 1;
    g.fillStyle = "#121212"; g.fillRect(0, 0, 800, 84);
    g.fillStyle = "#222"; g.fillRect(0, 84, 800, 2);
    /* player bar */
    drawText(g, P.name + "  LV " + P.lvl, 16, S === 2 ? 6 : 10, S, "#fff");
    bar(g, 16, 26, 200, 12, P.hp, P.maxHp, "#5aff8a", "#203020");
    drawText(g, P.hp + "/" + P.maxHp, 224, S === 2 ? 25 : 27, S, "#fff");
    drawText(g, "SCAN", 16, 48, 1, "#9ad");
    bar(g, 60, 48, 156, 8, this.gauge, 100, this.gauge >= 100 ? "#ffd700" : "#60a0d0", "#223");
    if (this.pBuff) drawText(g, "ATK+" + this.pBuff, 16, 62, 1, "#ffd700");
    /* enemy bar */
    drawText(g, E.name, 800 - 16 - textWidth(E.name, S), S === 2 ? 6 : 10, S, "#ff8a8a");
    const ebw = 200;
    bar(g, 800 - 16 - ebw, 26, ebw, 12, E.hp, E.maxHp, "#ff6a6a", "#302020", true);
    const ehp = E.hp + "/" + E.maxHp;
    drawText(g, ehp, 800 - 16 - ebw - 8 - textWidth(ehp, S), S === 2 ? 25 : 27, S, "#fff");
    if (this.eStunned) drawText(g, "DAZED!", 800 - 16 - textWidth("DAZED!", 1), 48, 1, "#ffd700");

    /* message */
    if (this.logT > 0 && this.log){
      const ls = (S === 2 && textWidth(this.log, 2) <= 780) ? 2 : 1;
      drawTextC(g, this.log, 400, ls === 2 ? 380 : 388, ls, "#fff", "#000");
    }
    /* popups */
    for (const p of this.pops){
      const x = p.side === "p" ? px + 40 : ex + 40;
      drawTextC(g, p.text, x, py - 20 + p.dy, 2, p.color, "#000");
    }

    /* menu */
    g.fillStyle = "#0c0c10"; g.fillRect(0, 420, 800, 92);
    g.fillStyle = "#c40d3c"; g.fillRect(0, 420, 800, 3);
    if (this.over){
      drawTextC(g, this.over === "win" ? "VICTORY!" : (this.over === "lose" ? "DEFEATED..." : "YOU GOT AWAY."), 400, 452, 3, this.over === "lose" ? "#ff6a6a" : "#ffd700", "#000");
      return;
    }
    if (this.subMenu >= 0){
      const ids = Object.keys(GAME.player.inv).filter(i => GAME.player.inv[i] > 0);
      if (S === 1) drawText(g, "USE GROCERY:", 24, 430, 1, "#9ad");
      const show = ids.slice(this.scroll, this.scroll + 4);
      for (let i = 0; i < show.length; i++){
        const id = show[i], r = this.rowRect(i);
        const on = (this.scroll + i) === this.sel;
        if (on && S === 2){ g.fillStyle = "rgba(255,215,0,0.12)"; g.fillRect(r[0] - 6, r[1] - 2, r[2], r[3]); }
        const label = S === 2 ? ITEMS[id].name + " x" + GAME.player.inv[id] : ITEMS[id].name + " x" + GAME.player.inv[id] + " - " + ITEMS[id].desc;
        drawText(g, (on ? "> " : "  ") + label, r[0], r[1], S, on ? "#ffd700" : "#ccc");
      }
      if (S === 2 && ids[this.sel]) drawText(g, ITEMS[ids[this.sel]].desc, 410, 436, 1, "#9ad");
      if (this.scroll > 0) drawText(g, "^", 740, S === 2 ? 428 : 450, S, "#aaa");
      if (this.scroll + 4 < ids.length) drawText(g, "v", 740, S === 2 ? 484 : 495, S, "#aaa");
      drawText(g, S === 2 ? "BACK" : "X: BACK", S === 2 ? 640 : 640, S === 2 ? 466 : 492, S, "#888");
    } else if (this.turn === "player"){
      const opts = ["ATTACK","SPECIAL","ITEM","GUARD","FLEE"];
      const keys = ["1","2","3","4","5"];
      for (let i = 0; i < opts.length; i++){
        const [x, y] = this.optRect(i);
        const on = i === this.sel;
        drawText(g, (on ? "> " : "  ") + (S === 2 ? "" : keys[i] + ". ") + opts[i], x, y + (S === 2 ? 6 : 0), S, on ? "#ffd700" : "#ccc");
      }
      if (S === 1) drawText(g, "ARROWS + Z:OK  X:BACK   M:MUTE", 40, 498, 1, "#555");
    } else {
      drawTextC(g, "ENEMY TURN...", 400, 462, S, "#888");
    }
  },

  /* hit rectangles [x, y, w, h] shared by drawing and tapping */
  optRect(i){
    return GAME.big ? [40 + (i % 3) * 250, i < 3 ? 430 : 468, 240, 34] : [60 + (i % 3) * 250, i < 3 ? 434 : 478, 230, 30];
  },
  rowRect(i){
    return GAME.big ? [30, 428 + i * 20, 560, 20] : [24, 450 + i * 15, 600, 15];
  },
  inRect(x, y, r){ return x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]; },
  tap(x, y){
    if (!this.active || this.over || this.turn !== "player") return;
    if (this.subMenu >= 0){
      const ids = Object.keys(GAME.player.inv).filter(i => GAME.player.inv[i] > 0);
      if (x >= 620 && y >= 456 && x < 730){ this.handleKey("x"); return; }
      if (x >= 730 && y < 456){ this.handleKey("up"); return; }
      if (x >= 730 && y >= 456){ this.handleKey("down"); return; }
      for (let i = 0; i < Math.min(4, ids.length - this.scroll); i++){
        if (this.inRect(x, y, this.rowRect(i))){ this.sel = this.scroll + i; this.handleKey("z"); return; }
      }
      return;
    }
    for (let i = 0; i < 5; i++){
      if (this.inRect(x, y, this.optRect(i))){ this.sel = i; this.confirm(); return; }
    }
  },

  handleKey(k){
    if (!this.active) return;
    if (this.over) return;
    if (this.turn !== "player") return;
    if (this.subMenu >= 0){
      const ids = Object.keys(GAME.player.inv).filter(i => GAME.player.inv[i] > 0);
      const n = ids.length;
      if (k === "up") this.sel = (this.sel + n - 1) % n;
      else if (k === "down") this.sel = (this.sel + 1) % n;
      else if (k === "z" || k === "enter"){
        this.subMenu = -1;
        const pick = this.sel; this.sel = 2;
        this.action("item", pick);
        return;
      } else if (k === "x" || k === "escape"){ this.subMenu = -1; return; }
      if (this.sel < this.scroll) this.scroll = this.sel;
      if (this.sel > this.scroll + 3) this.scroll = this.sel - 3;
      return;
    }
    if (k === "left") this.sel = (this.sel + 4) % 5;
    else if (k === "right") this.sel = (this.sel + 1) % 5;
    else if (k === "up") this.sel = (this.sel + 3) % 5;
    else if (k === "down") this.sel = (this.sel + 2) % 5;
    else if (k === "1") this.sel = 0;
    else if (k === "2") this.sel = 1;
    else if (k === "3") this.sel = 2;
    else if (k === "4") this.sel = 3;
    else if (k === "5") this.sel = 4;
    else if (k === "z" || k === "enter") this.confirm();
    else if (k === "x" || k === "escape") {}
  },

  confirm(){
    if (this.sel === 2 && this.subMenu < 0){
      const has = Object.values(GAME.player.inv).some(v => v > 0);
      if (has){ this.subMenu = 0; this.sel = 0; this.scroll = 0; } else this.say("BAG IS EMPTY!");
      return;
    }
    const kinds = ["attack","special","item","guard","flee"];
    this.action(kinds[this.sel]);
  },
};

function bar(g, x, y, w, h, val, max, color, bg, rightAlign){
  g.fillStyle = bg; g.fillRect(x, y, w, h);
  const f = Math.max(0, Math.min(1, val / max));
  g.fillStyle = color;
  if (rightAlign) g.fillRect(x + w - Math.round(w * f), y, Math.round(w * f), h);
  else g.fillRect(x, y, Math.round(w * f), h);
  g.fillStyle = "rgba(0,0,0,0.35)";
  for (let i = 1; i < 4; i++) g.fillRect(x + (w / 4) * i, y, 1, h);
}
