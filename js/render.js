/* BIG Y BRAWLERS — exploration rendering + HUD */
"use strict";

function renderExplore(g, t){
  const P = GAME.player;
  /* camera */
  const camX = clamp(P.px - VIEW_W / 2, 0, MW * TILE - VIEW_W);
  const camY = clamp(P.py - VIEW_H / 2, 0, MH * TILE - VIEW_H);
  GAME.cam.x = camX; GAME.cam.y = camY;
  const ox = Math.floor(camX / TILE), oy = Math.floor(camY / TILE);

  g.fillStyle = "#000"; g.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let ty = oy; ty <= oy + VIEW_TH + 1; ty++){
    for (let tx = ox; tx <= ox + VIEW_TW + 1; tx++){
      const ch = tileAt(GAME.map, tx, ty);
      if (ch === "#" || ch === "." || ch === "R" || ch === "O" || ch === "K"){
        /* base floor under room tiles */
        drawTile(g, (ch === "#") ? "#" : (ch === "R" ? "R" : ch === "O" ? "O" : "K"), tx * TILE - camX, ty * TILE - camY, tx, ty);
      } else {
        /* normal floor + object */
        drawTile(g, ".", tx * TILE - camX, ty * TILE - camY, tx, ty);
        if (ch !== "*") drawTile(g, ch, tx * TILE - camX, ty * TILE - camY, tx, ty);
        else drawTile(g, ch, tx * TILE - camX, ty * TILE - camY, tx, ty);
      }
    }
  }

  /* department signs (from the real store page) */
  for (const [label, tx, ty] of DEPT_SIGNS){
    const sx = tx * TILE - camX, sy = ty * TILE - camY;
    if (sx < -120 || sx > VIEW_W + 120 || sy < -20 || sy > VIEW_H + 20) continue;
    const w = textWidth(label, 1) + 8;
    g.fillStyle = "#c40d3c"; g.fillRect(Math.round(sx - w / 2), sy, w, 11);
    g.fillStyle = "#8a0a28"; g.fillRect(Math.round(sx - w / 2), sy + 11, w, 2);
    drawTextC(g, label, sx, sy + 2, 1, "#fff");
  }

  /* pickups (glowing groceries) */
  for (const p of GAME.pickups){
    if (p.taken) continue;
    const sx = p.x - camX, sy = p.y - camY + Math.sin(p.bob) * 2;
    if (sx < -20 || sy < -20 || sx > VIEW_W + 20 || sy > VIEW_H + 20) continue;
    g.fillStyle = "rgba(255,215,0," + (0.25 + Math.sin(p.bob * 2) * 0.12) + ")";
    g.fillRect(sx - 10, sy - 10, 20, 20);
    drawIcon(g, p.item, sx - 8, sy - 8, 1);
  }

  /* enemies */
  const frame = Math.floor(t * 6) % 2;
  for (const e of GAME.enemies){
    if (e.dead) continue;
    const sx = e.x - camX, sy = e.y - camY;
    if (sx < -30 || sy < -30 || sx > VIEW_W + 30 || sy > VIEW_H + 30) continue;
    const grid = SPR[e.id][e.dir][e.moving ? frame : 0];
    const s = e.boss ? 2 : 1;
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(sx - 7, sy + 6, 14, 4);
    drawGrid(g, grid, sx - 8 * s, sy - 12 * s + 6, s, e.dir === "side" ? e.faceLeft !== undefined ? !e.faceLeft : true : false);
    if (!e.boss) drawCart(g, sx + 10, sy - 2, 1, "#b8c0c8");
    else { drawCart(g, sx + 12, sy - 4, 2, "#ffd700"); drawTextC(g, e.def.name, sx, sy - 34 * s, 1, "#ff6a6a", "#000"); }
    if (e.chase && dist(e.x, e.y, P.px, P.py) < 70){
      drawTextC(g, "!", sx, sy - 24, 2, "#ffd700", "#000");
    }
  }

  /* NPCs */
  for (const n of GAME.npcs){
    const sx = n.x - camX, sy = n.y - camY;
    const grid = SPR[n.id]["down"][0];
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(sx - 7, sy + 6, 14, 4);
    drawGrid(g, grid, sx - 8, sy - 12, 1);
    const near = GAME.nearNpc === n;
    drawTextC(g, STAFF[n.id].name, sx, sy - 26, 1, near ? "#ffd700" : "#fff", "#000");
    if (near) drawTextC(g, "[Z] TALK", sx, sy - 36, 1, "#ffd700", "#000");
  }

  /* player */
  {
    const sx = P.px - camX, sy = P.py - camY;
    const grid = SPR[P.id][P.dir][P.moving ? frame : 0];
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(sx - 7, sy + 6, 14, 4);
    drawGrid(g, grid, sx - 8, sy - 12, 1, P.dir === "side" ? P.faceLeft : false);
  }

  /* zone label banner */
  const zlabel = (function(){
    const tx = Math.floor(P.px / TILE), ty = Math.floor(P.py / TILE);
    if (tx >= 25 && tx <= 38 && ty >= 1 && ty <= 5) return "STOCKROOM";
    const z = playerZone(P.px, P.py);
    return z ? z.name : "BIG Y NORTHAMPTON";
  })();
  g.fillStyle = "rgba(18,18,18,0.85)";
  g.fillRect(0, 0, VIEW_W, 22);
  g.fillStyle = "#c40d3c"; g.fillRect(0, 22, VIEW_W, 2);
  drawText(g, "BIG Y  136 N KING ST, NORTHAMPTON MA", 8, 8, 1, "#ff5a7a", "#000");
  drawTextC(g, zlabel, VIEW_W / 2 - 40, 8, 1, "#fff", "#000");

  /* HUD right: clock + groceries */
  const h = Math.floor(GAME.timeMin / 60), m = Math.floor(GAME.timeMin % 60);
  const hh = ((h + 11) % 12) + 1;
  const clockStr = hh + ":" + String(m).padStart(2, "0") + (h >= 12 ? " PM" : " AM");
  const clockX = VIEW_W - 8 - textWidth(clockStr, 1);
  drawText(g, clockStr, clockX, 8, 1, GAME.timeMin >= 20 * 60 ? "#ff6a6a" : "#ffd700", "#000");
  const grStr = "GROCERIES " + collectedCount() + "/" + TOTAL_PICKS;
  drawText(g, grStr, clockX - 16 - textWidth(grStr, 1), 8, 1, "#5aff8a", "#000");

  /* bottom-left: HP / XP / LV */
  g.fillStyle = "rgba(18,18,18,0.85)";
  g.fillRect(0, VIEW_H - 46, 300, 46);
  g.fillStyle = "#c40d3c"; g.fillRect(0, VIEW_H - 46, 300, 2);
  drawText(g, P.name + " LV" + P.lvl, 8, VIEW_H - 40, 1, "#fff");
  bar(g, 8, VIEW_H - 28, 160, 10, P.hp, P.maxHp, "#5aff8a", "#203020");
  drawText(g, Math.ceil(P.hp) + "/" + P.maxHp, 174, VIEW_H - 27, 1, "#fff");
  drawText(g, "XP", 8, VIEW_H - 12, 1, "#9ad");
  bar(g, 30, VIEW_H - 12, 138, 7, P.xp, P.xpNext, "#60a0d0", "#223");
  drawText(g, P.xp + "/" + P.xpNext, 174, VIEW_H - 11, 1, "#9ad");

  /* toast */
  if (GAME.msgT > 0 && GAME.msg){
    const a = Math.min(1, GAME.msgT / 0.4);
    g.fillStyle = "rgba(18,18,18," + (0.9 * a) + ")";
    const w = textWidth(GAME.msg, 1) + 24;
    g.fillRect(VIEW_W / 2 - w / 2, VIEW_H - 92, w, 22);
    g.fillStyle = "rgba(196,13,60," + a + ")";
    g.fillRect(VIEW_W / 2 - w / 2, VIEW_H - 92, w, 2);
    drawTextC(g, GAME.msg, VIEW_W / 2, VIEW_H - 86, 1, "rgba(255,255,255," + a + ")");
  }

  renderDialog(g);
}

function renderDialog(g){
  const d = GAME.dialog;
  if (!d) return;
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  const bx = 60, by = VIEW_H - 190, bw = VIEW_W - 120, bh = 150;
  g.fillStyle = "#16161c"; g.fillRect(bx, by, bw, bh);
  g.fillStyle = "#c40d3c"; g.fillRect(bx, by, bw, 3);
  g.fillStyle = "#222"; g.fillRect(bx, by + bh - 3, bw, 3);
  /* portrait */
  const grid = SPR[d.npc.id]["down"][0];
  drawGrid(g, grid, bx + 18, by + 30, 3);
  g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(bx + 14, by + 78, 52, 4);
  drawText(g, STAFF[d.npc.id].name, bx + 84, by + 14, 2, "#ffd700");
  drawText(g, d.npc.title, bx + 84, by + 34, 1, "#999");
  /* text (simple wrap) */
  const words = d.lines[d.i].split(" ");
  const lines = [];
  let cur = "";
  for (const w of words){
    if (textWidth(cur + " " + w, 1) > bw - 160){ lines.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  for (let i = 0; i < lines.length; i++){
    drawText(g, lines[i], bx + 84, by + 62 + i * 18, 1, "#eee");
  }
  if (Math.floor(performance.now() / 350) % 2 === 0){
    drawText(g, "Z >", bx + bw - 48, by + bh - 20, 1, "#ffd700");
  }
}
