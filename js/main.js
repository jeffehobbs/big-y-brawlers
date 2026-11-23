/* BIG Y BRAWLERS — screens, input, music, main loop */
"use strict";

const canvas = document.getElementById("game");
const g = canvas.getContext("2d");
g.imageSmoothingEnabled = false;

/* ---------- splash image + soundtrack ---------- */
const splashImg = new Image();
splashImg.src = "img/splash.png";

const MUSIC_LOUD = 0.8, MUSIC_SOFT = 0.07;
const Music = {
  el: null,
  started: false,
  target: MUSIC_LOUD,
  init(){
    this.el = new Audio("audio/soundtrack.mp3");
    this.el.loop = true;
    this.el.volume = MUSIC_LOUD;
    this.el.preload = "auto";
  },
  /* browsers block autoplay until a gesture; try now, retry on first input */
  start(){
    if (!this.el) this.init();
    this.target = MUSIC_LOUD;
    if (this.started && !this.el.paused) return;
    const p = this.el.play();
    if (p && p.then) p.then(() => { this.started = true; }).catch(() => { this.started = false; });
  },
  /* during gameplay the soundtrack keeps going, very quietly */
  soft(){
    if (this.el && this.el.paused) this.start();
    this.target = MUSIC_SOFT;
  },
  update(dt){
    if (!this.el) return;
    this.el.muted = AudioFX.muted;
    const v = this.el.volume, d = this.target - v;
    if (Math.abs(d) > 0.002) this.el.volume = Math.max(0, Math.min(1, v + Math.sign(d) * Math.min(Math.abs(d), dt * 0.5)));
  },
};
Music.init();
Music.start();

/* ---------- screen state ---------- */
const CONT_RECT = [10, 462, 170, 38];
const GO_RELOAD = [130, 370, 250, 54], GO_TITLE = [420, 370, 250, 54];
const UI = { sel: 0, t: 0, introI: 0, bagSel: 0, bag: false, paused: false };
const CHAR_IDS = ["sedona", "calvin", "corey"];

function goTitle(){
  UI.paused = false; UI.bag = false;
  GAME.state = "TITLE";
  try { GAME.hasSave = !!localStorage.getItem("bigy_brawlers_save"); } catch (e){ GAME.hasSave = false; }
  Music.start();
}

function beginNew(charId){
  newRun(charId);
  GAME.state = "INTRO";
  UI.introI = 0;
  GAME.intro = introScript(GAME.player);
  Music.soft();
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
window.addEventListener("blur", () => {
  GAME.keys = {};
  if (GAME.state === "EXPLORE" && !GAME.dialog || (GAME.state === "BATTLE" && Combat.turn === "player" && Combat.subMenu < 0 && !Combat.over)) pauseGame();
});
/* ---------- touch + mouse taps on the canvas ---------- */
function canvasPoint(e){
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) * VIEW_W / r.width, (e.clientY - r.top) * VIEW_H / r.height];
}
const hit = (x, y, r) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
function unlockAudio(){
  AudioFX.ensure();
  if (GAME.state === "TITLE" || GAME.state === "SELECT") Music.start();
}
function onTap(x, y){
  if (UI.paused){
    const inBox = hit(x, y, [PAUSE.bx, PAUSE.by, PAUSE.bw, PAUSE.bh]);
    if (hit(x, y, pauseRow(1))) handleKey("q");
    else if (hit(x, y, pauseRow(2))) AudioFX.toggle();
    else handleKey("escape");
    return;
  }
  switch (GAME.state){
    case "TITLE":
      if (GAME.hasSave && hit(x, y, CONT_RECT)) handleKey("c"); else handleKey("enter");
      break;
    case "SELECT":
      for (let i = 0; i < 3; i++){
        if (hit(x, y, [30 + i * 255, 76, 240, 400])){
          if (UI.sel === i) handleKey("z"); else { UI.sel = i; AudioFX.play("talk"); }
          return;
        }
      }
      if (GAME.hasSave && y > 480) handleKey("c");
      break;
    case "INTRO": handleKey("z"); break;
    case "EXPLORE":
      if (UI.bag){
        const ids = bagList(), first = bagFirst(ids);
        if (!hit(x, y, [BAG.bx, BAG.by, BAG.bw, BAG.bh])){ UI.bag = false; return; }
        for (let i = 0; i < Math.min(BAG.per, ids.length - first); i++){
          if (hit(x, y, [BAG.bx, BAG.by + BAG.y0 + 14 + i * BAG.rowH, BAG.bw, BAG.rowH])){ UI.bagSel = first + i; bagKey("z"); return; }
        }
        return;
      }
      if (GAME.dialog) handleKey("z");
      break;
    case "BATTLE": Combat.tap(x, y); break;
    case "GAMEOVER":
      if (hit(x, y, GO_TITLE) || (!hasSaveNow() && hit(x, y, [275, 370, 250, 54]))) handleKey("x");
      else if (hit(x, y, GO_RELOAD)) handleKey("z");
      break;
    case "VICTORY": handleKey("z"); break;
  }
}
function hasSaveNow(){ try { return !!localStorage.getItem("bigy_brawlers_save"); } catch (e){ return false; } }
canvas.addEventListener("pointerdown", e => {
  unlockAudio();
  const [x, y] = canvasPoint(e);
  onTap(x, y);
});
/* iOS only unlocks audio inside touchend/click */
window.addEventListener("touchend", unlockAudio, { passive: true });
window.addEventListener("click", unlockAudio);
document.addEventListener("gesturestart", e => e.preventDefault());
document.addEventListener("contextmenu", e => e.preventDefault());

/* ---------- on-screen touch controls ---------- */
const IS_TOUCH = (navigator.maxTouchPoints > 0) || ("ontouchstart" in window) || /[?&]touch=1/.test(location.search);
GAME.touch = IS_TOUCH;
const TC = {};
function mkEl(id, cls, html){ const el = document.createElement("div"); el.id = id; el.className = cls; if (html) el.innerHTML = html; document.body.appendChild(el); return el; }
function initTouchControls(){
  TC.stick = mkEl("stick", "tc", '<div id="knob"></div>');
  TC.knob = TC.stick.firstChild;
  TC.a = mkEl("btnA", "tc tbtn", "A");
  TC.bag = mkEl("btnBag", "tc tbtn", "BAG");
  TC.pause = mkEl("btnPause", "tc tbtn", "II");
  let stickId = null;
  const R = 56;
  function setStick(e){
    const r = TC.stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const len = Math.hypot(dx, dy) || 1, cl = Math.min(len, R);
    const nx = dx / len * cl, ny = dy / len * cl;
    TC.knob.style.transform = "translate(" + nx + "px," + ny + "px)";
    const t = R * 0.35;
    GAME.keys.left = nx < -t; GAME.keys.right = nx > t; GAME.keys.up = ny < -t; GAME.keys.down = ny > t;
  }
  function endStick(){
    stickId = null; TC.knob.style.transform = "";
    GAME.keys.left = GAME.keys.right = GAME.keys.up = GAME.keys.down = false;
  }
  TC.stick.addEventListener("pointerdown", e => {
    e.preventDefault(); unlockAudio(); stickId = e.pointerId;
    try { TC.stick.setPointerCapture(e.pointerId); } catch (err){}
    setStick(e);
  });
  TC.stick.addEventListener("pointermove", e => { if (e.pointerId === stickId) setStick(e); });
  TC.stick.addEventListener("pointerup", e => { if (e.pointerId === stickId) endStick(); });
  TC.stick.addEventListener("pointercancel", endStick);
  window.addEventListener("blur", endStick);
  const press = (el, key) => el.addEventListener("pointerdown", e => { e.preventDefault(); unlockAudio(); handleKey(key); });
  press(TC.a, "z"); press(TC.bag, "i"); press(TC.pause, "escape");
}
let tcShown = "";
function updateTouchControls(){
  if (!IS_TOUCH || !TC.stick) return;
  const exploring = GAME.state === "EXPLORE" && !UI.paused && !UI.bag;
  const show = {
    stick: exploring && !GAME.dialog,
    a: exploring,
    bag: exploring && !GAME.dialog,
    pause: (GAME.state === "EXPLORE" || GAME.state === "BATTLE") && !UI.paused && !UI.bag,
  };
  const sig = JSON.stringify(show);
  if (sig === tcShown) return;
  tcShown = sig;
  for (const k in show) TC[k].classList.toggle("on", !!show[k]);
  if (!show.stick){ GAME.keys.left = GAME.keys.right = GAME.keys.up = GAME.keys.down = false; TC.knob.style.transform = ""; }
}
if (IS_TOUCH) initTouchControls();

/* small screens get larger text */
function updateBig(){ GAME.big = canvas.getBoundingClientRect().width < 760; }
window.addEventListener("resize", updateBig);
updateBig();

function pauseGame(){
  if (UI.paused) return;
  UI.paused = true; GAME.keys = {};
  AudioFX.play("talk");
}
function handleKey(k){
  const confirm = (k === "z" || k === "enter");
  if (UI.paused){
    if (k === "escape" || k === "p" || confirm){ UI.paused = false; AudioFX.play("talk"); }
    else if (k === "q"){ UI.paused = false; if (GAME.state === "EXPLORE") saveGame(); goTitle(); }
    return;
  }
  switch (GAME.state){
    case "TITLE":
      if (k === "c" && GAME.hasSave){
        if (loadGame()){ GAME.state = "EXPLORE"; Music.soft(); AudioFX.play("door"); }
        return;
      }
      GAME.state = "SELECT"; UI.sel = 0; AudioFX.play("pickup");
      break;
    case "SELECT":
      if (k === "left") UI.sel = (UI.sel + 2) % 3;
      else if (k === "right") UI.sel = (UI.sel + 1) % 3;
      else if (k === "1" || k === "2" || k === "3") UI.sel = +k - 1;
      else if (k === "c" && GAME.hasSave){ if (loadGame()){ GAME.state = "EXPLORE"; Music.soft(); } }
      else if (confirm){ AudioFX.play("door"); beginNew(CHAR_IDS[UI.sel]); }
      else if (k === "escape" || k === "x") GAME.state = "TITLE";
      if (k === "left" || k === "right") AudioFX.play("talk");
      break;
    case "INTRO":
      if (confirm){
        AudioFX.play("talk");
        UI.introI++;
        if (UI.introI >= GAME.intro.length){ GAME.state = "EXPLORE"; toast(GAME.touch ? "STICK: MOVE   A: TALK   BAG: EAT" : "WASD / ARROWS: MOVE   Z: TALK   I: BAG", 4); }
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
      else if (k === "escape" || k === "p") pauseGame();
      break;
    case "BATTLE":
      if ((k === "escape" || k === "p") && Combat.turn === "player" && Combat.subMenu < 0 && !Combat.over){ pauseGame(); break; }
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
      const gained = Math.ceil(P.maxHp - P.hp);
      P.hp = P.maxHp;
      GAME.timeMin += 10; /* scanning takes a while */
      AudioFX.play("heal");
      toast("SEDONIA SCANNED YOUR WOUNDS  +" + gained + " HP (FULL)", 2.5);
    } else toast("SEDONIA: ALL ITEMS RECOGNIZED. YOU'RE FINE.", 2.5);
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
const BAG = { bx: 170, by: 40, bw: 460, bh: 432, rowH: 30, per: 10, y0: 56 };
function bagFirst(ids){ return clamp(UI.bagSel - 4, 0, Math.max(0, ids.length - BAG.per)); }
function renderBag(g){
  g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(0, 0, VIEW_W, VIEW_H);
  const { bx, by, bw, bh } = BAG;
  g.fillStyle = "#16161c"; g.fillRect(bx, by, bw, bh);
  g.fillStyle = "#c40d3c"; g.fillRect(bx, by, bw, 3);
  drawText(g, "YOUR BAG", bx + 16, by + 14, 3, "#ffd700");
  const ids = bagList();
  if (!ids.length) drawText(g, "EMPTY. GO WIN SOME GROCERIES.", bx + 16, by + 70, 1, "#999");
  const first = bagFirst(ids);
  for (let i = 0; i < Math.min(BAG.per, ids.length - first); i++){
    const id = ids[first + i], y = by + BAG.y0 + 18 + i * BAG.rowH, on = first + i === UI.bagSel;
    if (on){ g.fillStyle = "rgba(255,215,0,0.12)"; g.fillRect(bx + 8, y - 4, bw - 16, BAG.rowH - 2); }
    drawIcon(g, id, bx + 14, y - 1, 1);
    drawText(g, ITEMS[id].name + " x" + GAME.player.inv[id], bx + 38, y - 2, 2, on ? "#ffd700" : "#ddd");
    drawText(g, ITEMS[id].desc, bx + 38, y + 14, 1, "#888");
  }
  if (first > 0) drawText(g, "^", bx + bw - 24, by + BAG.y0, 2, "#aaa");
  if (first + BAG.per < ids.length) drawText(g, "v", bx + bw - 24, by + bh - 40, 2, "#aaa");
  drawText(g, GAME.touch ? "TAP A GROCERY TO EAT IT. TAP OUTSIDE TO CLOSE." : "UP/DOWN  Z: EAT  I/X: CLOSE", bx + 16, by + bh - 18, 1, "#777");
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
    const r = CONT_RECT;
    g.fillStyle = "rgba(18,18,18,0.8)"; g.fillRect(r[0], r[1], r[2], r[3]);
    g.fillStyle = "#c40d3c"; g.fillRect(r[0], r[1], r[2], 3);
    drawText(g, "CONTINUE", r[0] + 14, r[1] + 11, 2, "#fff");
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

function wrapText(g, str, x, y, maxW, lh, color, scale){
  scale = scale || 1;
  const words = str.split(" ");
  let cur = "", row = 0;
  for (const w of words){
    const test = cur ? cur + " " + w : w;
    if (textWidth(test, scale) > maxW && cur){ drawText(g, cur, x, y + row * lh, scale, color); row++; cur = w; }
    else cur = test;
  }
  if (cur) drawText(g, cur, x, y + row * lh, scale, color);
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
  wrapText(g, line[1], bx + 84, by + 58, bw - 160, GAME.big ? 24 : 18, "#eee", GAME.big ? 2 : 1);
  if (Math.floor(t * 3) % 2 === 0) drawText(g, GAME.touch ? "TAP >" : "Z >", bx + bw - (GAME.touch ? 64 : 48), by + bh - 20, 1, "#ffd700");
  if (!GAME.touch) drawText(g, "ESC: SKIP", bx + 16, by + bh - 20, 1, "#555");
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
  const btn = (r, label, on) => {
    g.fillStyle = on ? "#c40d3c" : "#2a2a34"; g.fillRect(r[0], r[1], r[2], r[3]);
    g.fillStyle = "rgba(255,255,255,0.15)"; g.fillRect(r[0], r[1], r[2], 3);
    drawTextC(g, label, r[0] + r[2] / 2, r[1] + 19, 2, "#fff");
  };
  if (hasSave) btn(GO_RELOAD, "RELOAD SAVE", true);
  btn(hasSave ? GO_TITLE : [275, 370, 250, 54], "TITLE", !hasSave);
  if (!GAME.touch) drawTextC(g, hasSave ? "Z: RELOAD LAST SAVE    X: TITLE" : "Z: BACK TO TITLE", VIEW_W / 2, 450, 1, "#888");
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
  drawTextC(g, "KELVIN: GOOD WORK. SEDONIA: NO ITEMS UNSCANNED. CORY: I'M ON BREAK.", VIEW_W / 2, 290, 1, "#ccc");
  drawTextC(g, P.name + " LV " + P.lvl + "   CLEARED AT " + hh + ":" + String(m).padStart(2, "0") + (h >= 12 ? " PM" : " AM") +
    "   GROCERIES " + collectedCount() + "/" + TOTAL_PICKS, VIEW_W / 2, 330, 1, "#9ad");
  drawTextC(g, "BIG Y  136 N KING ST  NORTHAMPTON MA", VIEW_W / 2, 380, 1, "#c40d3c");
  if (Math.floor(t * 2) % 2 === 0) drawTextC(g, GAME.touch ? "TAP TO PLAY AGAIN" : "Z: PLAY AGAIN", VIEW_W / 2, 430, 2, "#ffd700", "#000");
}

const PAUSE = { bx: 190, by: 90, bw: 420, bh: 330 };
function pauseRow(i){ return [PAUSE.bx, PAUSE.by + 84 + i * 30, PAUSE.bw, 28]; }
function renderPause(g, t){
  g.fillStyle = "rgba(0,0,0,0.7)"; g.fillRect(0, 0, VIEW_W, VIEW_H);
  const { bx, by, bw, bh } = PAUSE;
  g.fillStyle = "#16161c"; g.fillRect(bx, by, bw, bh);
  g.fillStyle = "#c40d3c"; g.fillRect(bx, by, bw, 4);
  g.fillStyle = "#222"; g.fillRect(bx, by + bh - 3, bw, 3);
  drawTextC(g, "PAUSED", VIEW_W / 2, by + 20, 4, "#ffd700", "#5a0518");
  const rows = GAME.touch ? [["TAP", "RESUME"], ["TAP", "QUIT TO TITLE"], ["TAP", AudioFX.muted ? "UNMUTE" : "MUTE"]]
    : [["ESC / Z", "RESUME"], ["Q", "QUIT TO TITLE"], ["M", AudioFX.muted ? "UNMUTE" : "MUTE"]];
  rows.forEach(([k, v], i) => {
    const r = pauseRow(i);
    g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(r[0] + 16, r[1], r[2] - 32, r[3]);
    drawText(g, k, bx + 30, r[1] + 7, 2, "#ffd700");
    drawText(g, v, bx + 190, r[1] + 7, 2, "#fff");
  });
  if (!GAME.touch){
    g.fillStyle = "#2a2a34"; g.fillRect(bx + 24, by + 186, bw - 48, 2);
    const help = [["WASD / ARROWS", "MOVE"], ["Z / ENTER", "TALK, CONFIRM"], ["I", "BAG"], ["X", "BACK"]];
    help.forEach(([k, v], i) => {
      drawText(g, k, bx + 30, by + 200 + i * 22, 2, "#9ad");
      drawText(g, v, bx + 230, by + 200 + i * 22, 2, "#ccc");
    });
  }
  if (GAME.state === "EXPLORE") drawTextC(g, "QUITTING SAVES YOUR PROGRESS", VIEW_W / 2, by + bh - 18, 1, "#777");
}

/* ---------- main loop ---------- */
let last = performance.now(), clock = 0;
function frame(now){
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; clock += dt;
  Music.update(dt);
  updateBig();
  updateTouchControls();
  if (IS_TOUCH && window.innerHeight > window.innerWidth && !UI.paused && (GAME.state === "EXPLORE" || GAME.state === "BATTLE")) handleKey("escape");
  if (GAME.msgT > 0) GAME.msgT -= dt;
  switch (GAME.state){
    case "TITLE":   renderTitle(g, clock); break;
    case "SELECT":  renderSelect(g, clock); break;
    case "INTRO":   renderIntro(g, clock); break;
    case "EXPLORE":
      if (!UI.bag && !UI.paused) updateExplore(dt, clock);
      if (GAME.state === "EXPLORE"){ renderExplore(g, clock); if (UI.bag) renderBag(g); if (UI.paused) renderPause(g, clock); }
      break;
    case "BATTLE":
      if (!UI.paused) Combat.update(dt);
      if (GAME.state === "BATTLE"){ Combat.render(g, clock); if (UI.paused) renderPause(g, clock); }
      break;
    case "GAMEOVER": renderGameOver(g, clock); break;
    case "VICTORY":  renderVictory(g, clock); break;
  }
  requestAnimationFrame(frame);
}
goTitle();
requestAnimationFrame(frame);

/* test hook */
window.__GAME = GAME; window.__UI = UI;
