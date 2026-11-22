/* BIG Y BRAWLERS — screens, input, music, main loop */
"use strict";

const canvas = document.getElementById("game");
const g = canvas.getContext("2d");
g.imageSmoothingEnabled = false;

/* ---------- splash image + soundtrack ---------- */
const splashImg = new Image();
splashImg.src = "img/splash.png";

const Music = {
  el: null,
  started: false,
  fading: false,
  init(){
    this.el = new Audio("audio/soundtrack.mp3");
    this.el.loop = true;
    this.el.volume = 0.8;
    this.el.preload = "auto";
  },
  /* browsers block autoplay until a gesture; try now, retry on first input */
  start(){
    if (!this.el) this.init();
    if (this.started && !this.el.paused) return;
    this.fading = false;
    this.el.volume = 0.8;
    const p = this.el.play();
    if (p && p.then) p.then(() => { this.started = true; }).catch(() => { this.started = false; });
  },
  fadeOut(){ this.fading = true; },
  update(dt){
    if (!this.el) return;
    this.el.muted = AudioFX.muted;
    if (this.fading){
      this.el.volume = Math.max(0, this.el.volume - dt * 0.8);
      if (this.el.volume <= 0.001){ this.el.pause(); this.el.currentTime = 0; this.fading = false; this.started = false; }
    }
  },
};
Music.init();
Music.start();

/* ---------- screen state ---------- */
const UI = { sel: 0, t: 0, introI: 0, bagSel: 0, bag: false, paused: false };
const CHAR_IDS = ["sedona", "calvin", "corey"];

function goTitle(){
  GAME.state = "TITLE";
  try { GAME.hasSave = !!localStorage.getItem("bigy_brawlers_save"); } catch (e){ GAME.hasSave = false; }
  Music.start();
}

function beginNew(charId){
  newRun(charId);
  GAME.state = "INTRO";
  UI.introI = 0;
  GAME.intro = introScript(GAME.player);
  Music.fadeOut();
}

/* ---------- input ---------- */
const KEYMAP = { ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right",
                 Enter:"enter", " ":"z", Escape:"escape" };
function normKey(e){
  if (KEYMAP[e.key]) return KEYMAP[e.key];
  return e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
}

window.addEventListener("keydown", e => {
  const k = normKey(e);
  if (["up", "down", "left", "right", "z"].includes(k) || e.key === " ") e.preventDefault();
  AudioFX.ensure();
  if (k === "m"){ AudioFX.toggle(); return; }
  /* first gesture: start music if the browser blocked autoplay */
  if (GAME.state === "TITLE" || GAME.state === "SELECT") Music.start();
  GAME.keys[k] = true;
  if (e.repeat && !["up", "down", "left", "right"].includes(k)) return;
  handleKey(k);
});
window.addEventListener("keyup", e => { GAME.keys[normKey(e)] = false; });
window.addEventListener("blur", () => { GAME.keys = {}; });
canvas.addEventListener("pointerdown", () => {
  AudioFX.ensure();
  Music.start();
  if (GAME.state === "TITLE") handleKey("enter");
});

function handleKey(k){
  const confirm = (k === "z" || k === "enter");
  switch (GAME.state){
    case "TITLE":
      if (k === "c" && GAME.hasSave){
        if (loadGame()){ GAME.state = "EXPLORE"; Music.fadeOut(); AudioFX.play("door"); }
        return;
      }
      GAME.state = "SELECT"; UI.sel = 0; AudioFX.play("pickup");
      break;
    case "SELECT":
      if (k === "left") UI.sel = (UI.sel + 2) % 3;
      else if (k === "right") UI.sel = (UI.sel + 1) % 3;
      else if (k === "1" || k === "2" || k === "3") UI.sel = +k - 1;
      else if (k === "c" && GAME.hasSave){ if (loadGame()){ GAME.state = "EXPLORE"; Music.fadeOut(); } }
      else if (confirm){ AudioFX.play("door"); beginNew(CHAR_IDS[UI.sel]); }
      else if (k === "escape" || k === "x") GAME.state = "TITLE";
      if (k === "left" || k === "right") AudioFX.play("talk");
      break;
    case "INTRO":
      if (confirm){
        AudioFX.play("talk");
        UI.introI++;
        if (UI.introI >= GAME.intro.length){ GAME.state = "EXPLORE"; toast("WASD / ARROWS: MOVE   Z: TALK   I: BAG", 4); }
      } else if (k === "escape") GAME.state = "EXPLORE";
      break;
    case "EXPLORE":
      if (UI.bag){ bagKey(k); return; }
      if (GAME.dialog){
        if (confirm){
          AudioFX.play("talk");
          const d = GAME.dialog;
          if (d.i < d.lines.length - 1) d.i++;
          else { endTalk(); }
        }
        return;
      }
      if (confirm && GAME.nearNpc) startTalk(GAME.nearNpc);
      else if (k === "i" || k === "b"){ UI.bag = true; UI.bagSel = 0; }
      break;
    case "BATTLE":
      Combat.handleKey(k);
      break;
    case "GAMEOVER":
      if (confirm){
        if (loadGame()){ GAME.state = "EXPLORE"; toast("BACK TO YOUR LAST SAVE", 2.5); }
        else goTitle();
      } else if (k === "escape" || k === "x") goTitle();
      break;
    case "VICTORY":
      if (confirm) goTitle();
      break;
  }
}

/* ---------- talk to staff ---------- */
function startTalk(npc){
  const P = GAME.player;
  const lines = getDialogue(npc.id, P);
  if (!lines.length) return;
  GAME.dialog = { npc: { id: npc.id, title: NPC_INFO[npc.id].title }, lines, i: 0 };
  AudioFX.play("talk");
}
function endTalk(){
  const d = GAME.dialog, P = GAME.player;
  GAME.dialog = null;
  P.talked[d.npc.id] = (P.talked[d.npc.id] || 0) + 1;
  if (d.npc.id === "sedona"){
    if (P.hp < P.maxHp){
      P.hp = Math.min(P.maxHp, P.hp + 20);
      GAME.timeMin += 10; /* scanning takes a while */
      AudioFX.play("heal");
      toast("SEDONA SCANNED YOUR WOUNDS  +20 HP", 2.5);
    } else toast("SEDONA: ALL ITEMS RECOGNIZED. YOU'RE FINE.", 2.5);
  }
  if (d.npc.id === "corey" && !P.coreyGift){
    P.coreyGift = true;
    giveItem("coffee");
  }
  saveGame();
}

/* ---------- bag overlay (eat groceries outside combat) ---------- */
function bagList(){
  const inv = GAME.player.inv;
  return Object.keys(inv).filter(i => inv[i] > 0);
}
function bagKey(k){
  const ids = bagList();
  if (k === "escape" || k === "x" || k === "i" || k === "b"){ UI.bag = false; return; }
  if (!ids.length) return;
  if (k === "up") UI.bagSel = (UI.bagSel + ids.length - 1) % ids.length;
  else if (k === "down") UI.bagSel = (UI.bagSel + 1) % ids.length;
  else if (k === "z" || k === "enter"){
    const id = ids[UI.bagSel], it = ITEMS[id], P = GAME.player;
    if (it.kind === "heal" || it.kind === "both" || it.kind === "guard"){
      if (P.hp >= P.maxHp){ toast("ALREADY AT FULL HP", 1.5); return; }
      const v = it.kind === "both" ? 10 : it.v;
      P.hp = Math.min(P.maxHp, P.hp + v);
      P.inv[id]--;
      AudioFX.play("heal");
      toast("ATE " + it.name + "  +" + v + " HP", 1.8);
      if (UI.bagSel >= bagList().length) UI.bagSel = Math.max(0, bagList().length - 1);
    } else toast("SAVE THAT FOR A FIGHT", 1.5);
  }
}
function renderBag(g){
  g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(0, 0, VIEW_W, VIEW_H);
  const bx = 200, by = 70, bw = 400, bh = 372;
  g.fillStyle = "#16161c"; g.fillRect(bx, by, bw, bh);
  g.fillStyle = "#c40d3c"; g.fillRect(bx, by, bw, 3);
  drawText(g, "YOUR BAG", bx + 16, by + 14, 2, "#ffd700");
  const ids = bagList();
  if (!ids.length) drawText(g, "EMPTY. GO WIN SOME GROCERIES.", bx + 16, by + 60, 1, "#999");
  const per = 14, first = clamp(UI.bagSel - 6, 0, Math.max(0, ids.length - per));
  for (let i = 0; i < Math.min(per, ids.length - first); i++){
    const id = ids[first + i], y = by + 48 + i * 22, on = first + i === UI.bagSel;
    if (on){ g.fillStyle = "rgba(255,215,0,0.12)"; g.fillRect(bx + 8, y - 3, bw - 16, 20); }
    drawIcon(g, id, bx + 14, y - 2, 1);
    drawText(g, ITEMS[id].name + " x" + GAME.player.inv[id], bx + 38, y, 1, on ? "#ffd700" : "#ddd");
    drawText(g, ITEMS[id].desc, bx + 38, y + 9, 1, "#888");
  }
  drawText(g, "UP/DOWN  Z: EAT  I/X: CLOSE", bx + 16, by + bh - 18, 1, "#777");
}

/* ---------- screens ---------- */
function renderTitle(g, t){
  g.fillStyle = "#0d0d10"; g.fillRect(0, 0, VIEW_W, VIEW_H);
  if (splashImg.complete && splashImg.naturalWidth){
    /* image at full height; pillarbox filled by stretching its edge columns */
    const h = VIEW_H, w = Math.round(h * splashImg.naturalWidth / splashImg.naturalHeight);
    const x0 = Math.round((VIEW_W - w) / 2), iw = splashImg.naturalWidth, ih = splashImg.naturalHeight;
    g.imageSmoothingEnabled = false;
    g.drawImage(splashImg, 0, 0, 2, ih, 0, 0, x0 + 1, h);
    g.drawImage(splashImg, iw - 2, 0, 2, ih, x0 + w - 1, 0, VIEW_W - (x0 + w) + 1, h);
    g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(0, 0, x0, h); g.fillRect(x0 + w, 0, VIEW_W - x0 - w, h);
    g.drawImage(splashImg, x0, 0, w, h);
  } else {
    drawTextC(g, "BIG Y BRAWLERS", VIEW_W / 2, 200, 5, "#ffd700", "#8a0a28");
    drawTextC(g, "PRESS START", VIEW_W / 2, 330, 3, "#fff", "#000");
  }
  if (GAME.hasSave){
    drawText(g, "C: CONTINUE", 8, VIEW_H - 14, 1, "#fff", "#000");
  }
  if (!Music.started && Math.floor(t * 2) % 2 === 0){
    drawText(g, "CLICK OR PRESS A KEY FOR MUSIC", VIEW_W - 8 - textWidth("CLICK OR PRESS A KEY FOR MUSIC", 1), VIEW_H - 14, 1, "#fff", "#000");
  }
}

function renderSelect(g, t){
  g.fillStyle = "#121216"; g.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let i = 0; i < 20; i++){
    g.fillStyle = i % 2 ? "#17171c" : "#1a1a20";
    g.fillRect(i * 40, 0, 40, VIEW_H);
  }
  g.fillStyle = "#c40d3c"; g.fillRect(0, 0, VIEW_W, 48);
  g.fillStyle = "#8a0a28"; g.fillRect(0, 48, VIEW_W, 4);
  drawTextC(g, "CHOOSE YOUR BRAWLER", VIEW_W / 2, 14, 3, "#fff", "#5a0518");
  const frame = Math.floor(t * 3) % 2;
  for (let i = 0; i < 3; i++){
    const id = CHAR_IDS[i], c = CHARS[id], on = i === UI.sel;
    const x = 30 + i * 255, y = 76, w = 240, h = 400;
    g.fillStyle = on ? "#22222c" : "#17171d"; g.fillRect(x, y, w, h);
    g.fillStyle = on ? c.color : "#333"; g.fillRect(x, y, w, 6);
    if (on){ g.fillStyle = c.color; g.fillRect(x - 3, y - 3, 3, h + 6); g.fillRect(x + w, y - 3, 3, h + 6); g.fillRect(x - 3, y + h, w + 6, 3); }
    drawGrid(g, SPR[id][on ? "down" : "down"][on ? frame : 0], x + w / 2 - 48, y + 24, 6);
    g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(x + w / 2 - 40, y + 24 + 96, 80, 5);
    drawTextC(g, c.name, x + w / 2, y + 140, 3, on ? "#ffd700" : "#ccc", "#000");
    drawTextC(g, c.role, x + w / 2, y + 170, 1, "#9ad");
    /* wrapped description */
    wrapText(g, c.desc, x + 16, y + 194, w - 32, 12, "#ddd");
    drawText(g, "HP  " + c.hp, x + 16, y + 262, 1, "#5aff8a");
    drawText(g, "ATK " + c.atk, x + 16, y + 278, 1, "#ff8a8a");
    drawText(g, "SPD " + c.spd, x + 16, y + 294, 1, "#9ad");
    /* stat bars */
    bar(g, x + 80, y + 262, 130, 7, c.hp, 90, "#5aff8a", "#203020");
    bar(g, x + 80, y + 278, 130, 7, c.atk, 10, "#ff6a6a", "#302020");
    bar(g, x + 80, y + 294, 130, 7, c.spd, 8, "#60a0d0", "#223");
    drawText(g, "SPECIAL", x + 16, y + 322, 1, "#ffd700");
    drawText(g, c.special, x + 16, y + 336, 1, c.color === "#004a98" ? "#7ab0ff" : "#fff");
    wrapText(g, c.specialDesc, x + 16, y + 352, w - 32, 12, "#aaa");
  }
  drawTextC(g, "LEFT/RIGHT: CHOOSE   Z: START" + (GAME.hasSave ? "   C: CONTINUE" : ""), VIEW_W / 2, VIEW_H - 22, 1, "#888");
}

function wrapText(g, str, x, y, maxW, lh, color){
  const words = str.split(" ");
  let cur = "", row = 0;
  for (const w of words){
    const test = cur ? cur + " " + w : w;
    if (textWidth(test, 1) > maxW && cur){ drawText(g, cur, x, y + row * lh, 1, color); row++; cur = w; }
    else cur = test;
  }
  if (cur) drawText(g, cur, x, y + row * lh, 1, color);
  return row + 1;
}

function renderIntro(g, t){
  renderExplore(g, t);
  const line = GAME.intro[UI.introI];
  if (!line) return;
  let who = line[0], id;
  if (who === "P") id = GAME.player.id; else id = who.toLowerCase();
  g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(0, 0, VIEW_W, VIEW_H);
  const bx = 60, by = VIEW_H - 190, bw = VIEW_W - 120, bh = 150;
  g.fillStyle = "#16161c"; g.fillRect(bx, by, bw, bh);
  g.fillStyle = "#c40d3c"; g.fillRect(bx, by, bw, 3);
  g.fillStyle = "#222"; g.fillRect(bx, by + bh - 3, bw, 3);
  drawGrid(g, SPR[id].down[0], bx + 18, by + 30, 3);
  g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(bx + 14, by + 78, 52, 4);
  drawText(g, STAFF[id].name, bx + 84, by + 14, 2, "#ffd700");
  drawText(g, CHARS[id].role, bx + 84, by + 34, 1, "#999");
  wrapText(g, line[1], bx + 84, by + 62, bw - 160, 18, "#eee");
  if (Math.floor(t * 3) % 2 === 0) drawText(g, "Z >", bx + bw - 48, by + bh - 20, 1, "#ffd700");
  drawText(g, "ESC: SKIP", bx + 16, by + bh - 20, 1, "#555");
}

function renderGameOver(g, t){
  g.fillStyle = "#0a0505"; g.fillRect(0, 0, VIEW_W, VIEW_H);
  drawTextC(g, "SHIFT OVER", VIEW_W / 2, 130, 6, "#ff6a6a", "#3a0a0a");
  drawTextC(g, GAME.gameOverWhy, VIEW_W / 2, 230, 1, "#ddd");
  if (GAME.player){
    const P = GAME.player;
    drawTextC(g, P.name + "  LV " + P.lvl + "   GROCERIES " + collectedCount() + "/" + TOTAL_PICKS, VIEW_W / 2, 270, 1, "#9ad");
  }
  const hasSave = (function(){ try { return !!localStorage.getItem("bigy_brawlers_save"); } catch (e){ return false; } })();
  if (Math.floor(t * 2) % 2 === 0)
    drawTextC(g, hasSave ? "Z: RELOAD LAST SAVE    X: TITLE" : "Z: BACK TO TITLE", VIEW_W / 2, 340, 2, "#ffd700", "#000");
}

function renderVictory(g, t){
  g.fillStyle = "#1a1030"; g.fillRect(0, 0, VIEW_W, VIEW_H);
  /* confetti */
  for (let i = 0; i < 70; i++){
    const x = (i * 97 + Math.sin(t + i) * 20) % VIEW_W;
    const y = (i * 53 + t * (40 + (i % 5) * 18)) % VIEW_H;
    g.fillStyle = ["#c40d3c", "#ffd700", "#5aff8a", "#60a0d0", "#fff"][i % 5];
    g.fillRect(Math.floor(x), Math.floor(y), 4, 4);
  }
  drawTextC(g, "THE SHELVES ARE SAFE!", VIEW_W / 2, 70, 4, "#ffd700", "#8a0a28");
  const P = GAME.player;
  drawTextC(g, "THE CARTEL CAPTAIN HAS LEFT THE BUILDING.", VIEW_W / 2, 130, 1, "#fff");
  const frame = Math.floor(t * 3) % 2;
  CHAR_IDS.forEach((id, i) => drawGrid(g, SPR[id].down[frame], 400 - 168 + i * 120, 170, 6));
  const h = Math.floor(GAME.timeMin / 60), m = Math.floor(GAME.timeMin % 60);
  const hh = ((h + 11) % 12) + 1;
  drawTextC(g, "CALVIN: GOOD WORK. SEDONA: NO ITEMS UNSCANNED. COREY: I'M ON BREAK.", VIEW_W / 2, 290, 1, "#ccc");
  drawTextC(g, P.name + " LV " + P.lvl + "   CLEARED AT " + hh + ":" + String(m).padStart(2, "0") + (h >= 12 ? " PM" : " AM") +
    "   GROCERIES " + collectedCount() + "/" + TOTAL_PICKS, VIEW_W / 2, 330, 1, "#9ad");
  drawTextC(g, "BIG Y  136 N KING ST  NORTHAMPTON MA", VIEW_W / 2, 380, 1, "#c40d3c");
  if (Math.floor(t * 2) % 2 === 0) drawTextC(g, "Z: PLAY AGAIN", VIEW_W / 2, 430, 2, "#ffd700", "#000");
}

/* ---------- main loop ---------- */
let last = performance.now(), clock = 0;
function frame(now){
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; clock += dt;
  Music.update(dt);
  if (GAME.msgT > 0) GAME.msgT -= dt;
  switch (GAME.state){
    case "TITLE":   renderTitle(g, clock); break;
    case "SELECT":  renderSelect(g, clock); break;
    case "INTRO":   renderIntro(g, clock); break;
    case "EXPLORE":
      if (!UI.bag) updateExplore(dt, clock);
      if (GAME.state === "EXPLORE") { renderExplore(g, clock); if (UI.bag) renderBag(g); }
      break;
    case "BATTLE":  Combat.update(dt); if (GAME.state === "BATTLE") Combat.render(g, clock); break;
    case "GAMEOVER": renderGameOver(g, clock); break;
    case "VICTORY":  renderVictory(g, clock); break;
  }
  requestAnimationFrame(frame);
}
goTitle();
requestAnimationFrame(frame);

/* test hook */
window.__GAME = GAME; window.__UI = UI;
