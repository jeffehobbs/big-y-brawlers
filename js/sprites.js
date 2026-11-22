/* BIG Y BRAWLERS — procedural pixel sprites (16x16 base, drawn scaled) */
"use strict";

/* Build a 16x16 top-down person. colors: {hair,skin,shirt,vest,pants,shoe,eye} */
function buildPerson(colors, facing, frame){
  const P = {};
  const H = colors.hair, S = colors.skin, T = colors.shirt, V = colors.vest || colors.shirt;
  const A = colors.sleeve || colors.shirt, B = colors.pants, E = colors.shoe, D = colors.eye || "#121212";
  const grid = [];
  const set = (r, s) => { grid[r] = s; };
  const empty = "................";
  if (facing === "down"){
    const legsA = ["..ppp..ppp....", "..eee..eee...."];
    const legsB = ["...ppp.ppp....", "....eee.eee..."];
    set(0,  "...hhhhhhhh...");
    set(1,  "..hhhhhhhhhh..");
    set(2,  "..hhsssssshh..");
    set(3,  "..hssDssDssh..");
    set(4,  "..hssssssssh..");
    set(5,  "..hhsssssshh..");
    set(6,  "...ssssssss...");
    set(7,  "..tttttttttt..");
    set(8,  ".stvvvvvvvvts.");
    set(9,  ".stvvvvvvvvts.");
    set(10, ".stvvvvvvvvts.");
    set(11, "..tttttttttt..");
    set(12, "..bbbbbbbbbb..");
    set(13, frame ? legsB[0] : legsA[0]);
    set(14, frame ? legsB[1] : legsA[1]);
    set(15, empty);
  } else if (facing === "up"){
    const legsA = ["..ppp..ppp....", "..eee..eee...."];
    const legsB = ["...ppp.ppp....", "....eee.eee..."];
    set(0,  "...hhhhhhhh...");
    set(1,  "..hhhhhhhhhh..");
    set(2,  "..hhhhhhhhhh..");
    set(3,  "..hhhhhhhhhh..");
    set(4,  "..hhhhhhhhhh..");
    set(5,  "..hhhhhhhhhh..");
    set(6,  "...hhhhhhhh...");
    set(7,  "..tttttttttt..");
    set(8,  ".stttttttttts.");
    set(9,  ".stttttttttts.");
    set(10, ".stttttttttts.");
    set(11, "..tttttttttt..");
    set(12, "..bbbbbbbbbb..");
    set(13, frame ? legsB[0] : legsA[0]);
    set(14, frame ? legsB[1] : legsA[1]);
    set(15, empty);
  } else { /* side (left/right mirrored by caller) */
    const legsA = ["...pp..pp.....", "...ee..ee....."];
    const legsB = ["...pp..pp.....", "...ee.....ee.."];
    set(0,  "...hhhhhhhh...");
    set(1,  "..hhhhhhhhhh..");
    set(2,  "..hhhhsssshh..");
    set(3,  "..hhssDsDssh..");
    set(4,  "..hhsssssshh..");
    set(5,  "..hhsssssshh..");
    set(6,  "...ssssssss...");
    set(7,  "..ttttttttt...");
    set(8,  "..tttvvvvts...");
    set(9,  "..tttvvvvts...");
    set(10, "..tttvvvvts...");
    set(11, "..ttttttttt...");
    set(12, "...bbbbbbb....");
    set(13, frame ? legsB[0] : legsA[0]);
    set(14, frame ? legsB[1] : legsA[1]);
    set(15, empty);
  }
  const rep = { h:H, s:S, t:T, v:V, b:B, e:E, p:B, d:D, D:D };
  const out = grid.map(row => {
    let r = row;
    while (r.length < 16) r = (r.length % 2 ? "." + r : r + ".");
    return r.split("").map(ch => rep[ch] || null);
  });
  if (colors.longHair){
    /* long hair falling past the shoulders */
    const put = (r, c) => { if (!out[r][c]) out[r][c] = H; };
    if (facing === "down"){ for (let r = 6; r <= 10; r++){ put(r, 2); put(r, 13); } }
    else if (facing === "up"){ for (let r = 6; r <= 11; r++){ out[r][3] = H; out[r][4] = H; out[r][11] = H; out[r][12] = H; } }
    else { for (let r = 6; r <= 11; r++){ out[r][3] = H; out[r][4] = H; } }
  }
  return out;
}

/* Render a 16x16 grid of color strings to canvas at (x,y), scale s */
function drawGrid(g, grid, x, y, scale, mirror){
  const h = grid.length, w = grid[0].length;
  for (let r = 0; r < h; r++){
    for (let c = 0; c < w; c++){
      const cc = mirror ? grid[r][w-1-c] : grid[r][c];
      if (!cc) continue;
      g.fillStyle = cc;
      g.fillRect(x + c*scale, y + r*scale, scale, scale);
    }
  }
}

/* Prebuilt character palettes */
const STAFF = {
  sedona: { name:"SEDONIA", hair:"#5a3218", skin:"#e8b088", shirt:"#f5f0e8", vest:"#c40d3c", pants:"#3a3a44", shoe:"#222", eye:"#121212", longHair:true },
  calvin: { name:"KELVIN", hair:"#241a12", skin:"#8a5a34", shirt:"#004a98", vest:"#004a98", pants:"#5a4a33", shoe:"#1c1c1c", eye:"#0c0c0c" },
  corey:  { name:"CORY",  hair:"#151515", skin:"#c98a5a", shirt:"#e8e8e8", vest:"#008000", pants:"#2e2e38", shoe:"#1a1a1a", eye:"#0c0c0c" },
};
/* Build sprite cache: chars[id][facing][frame] */
const SPR = {};
(function(){
  for (const id in STAFF){
    const c = STAFF[id];
    SPR[id] = {};
    for (const f of ["down","up","side"]){
      SPR[id][f] = [buildPerson(c, f, 0), buildPerson(c, f, 1)];
    }
  }
})();

/* Enemy palettes */
const ENEMY_COLORS = {
  browser:  { hair:"#6b4a2a", skin:"#e8b088", shirt:"#7a8a5a", vest:"#7a8a5a", pants:"#4a4a55", shoe:"#222", eye:"#121212", hat:"cap", hatColor:"#4a6a8a" },
  chomper:  { hair:"#3a3a3a", skin:"#d99a6a", shirt:"#8a5a7a", vest:"#8a5a7a", pants:"#3a3a44", shoe:"#1c1c1c", eye:"#121212", hat:"beanie", hatColor:"#a03030" },
  flyer:    { hair:"#c0c0c0", skin:"#e8c8a8", shirt:"#b08a3a", vest:"#b08a3a", pants:"#556", shoe:"#222", eye:"#121212", hat:"scarf", hatColor:"#d0a020" },
  lurker:   { hair:"#222", skin:"#b07a4a", shirt:"#3a5a6a", vest:"#3a5a6a", pants:"#2e2e38", shoe:"#111", eye:"#c40d3c", hat:"hood", hatColor:"#2a4a5a" },
  crawler:  { hair:"#5a4a3a", skin:"#e0a878", shirt:"#6a8a8a", vest:"#6a8a8a", pants:"#4a4a44", shoe:"#222", eye:"#121212", hat:"cap", hatColor:"#3a7a3a" },
  captain:  { hair:"#111", skin:"#c98a5a", shirt:"#2a2a30", vest:"#c40d3c", pants:"#1c1c22", shoe:"#111", eye:"#ff3030", hat:"crown" },
};
for (const id in ENEMY_COLORS){
  SPR[id] = {};
  const c = ENEMY_COLORS[id];
  for (const f of ["down","up","side"]){
    SPR[id][f] = [buildPerson(c, f, 0), buildPerson(c, f, 1)];
  }
}
/* Draw a hat/crown on top of a sprite grid (returns new grid) */
function withHat(grid, hat, hatColor){
  const g = grid.map(r => r.slice());
  const put = (r, c, v) => { if (r >= 0 && r < 16 && c >= 0 && c < 16 && g[r][c]) g[r][c] = v; };
  const open = (r, c, v) => { if (r >= 0 && r < 16 && c >= 0 && c < 16) g[r][c] = v; };
  if (hat === "cap"){
    for (let c = 4; c < 12; c++){ put(0, c, hatColor); put(1, c, hatColor); }
    for (let c = 3; c < 13; c++) put(2, c, shade(hatColor, -30));
  } else if (hat === "beanie"){
    for (let c = 4; c < 12; c++){ put(0, c, hatColor); put(1, c, hatColor); }
    for (let c = 3; c < 13; c++) put(2, c, hatColor);
    open(0, 7, "#e8e8e8"); open(0, 8, "#e8e8e8");
  } else if (hat === "scarf"){
    for (let c = 4; c < 12; c++) put(6, c, hatColor);
    put(7, 4, hatColor); put(8, 4, hatColor);
  } else if (hat === "hood"){
    for (let c = 3; c < 13; c++){ put(0, c, hatColor); put(1, c, hatColor); }
    for (let r = 2; r < 7; r++){ put(r, 3, hatColor); put(r, 12, hatColor); }
  } else if (hat === "crown"){
    const gold = "#ffd700", dk = shade(gold, -50);
    for (let c = 4; c < 12; c++) open(1, c, c % 2 ? dk : gold);
    for (const c of [4, 6, 9, 11]) open(0, c, gold);
    open(0, 7, "#ff3030");
  }
  return g;
}
function shade(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, gg = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); gg = Math.max(0, Math.min(255, gg)); b = Math.max(0, Math.min(255, b));
  return "#" + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
}
/* Apply hat to cached enemy sprites */
for (const id in ENEMY_COLORS){
  const c = ENEMY_COLORS[id];
  if (c.hat){
    for (const f in SPR[id]){
      SPR[id][f] = SPR[id][f].map(g => withHat(g, c.hat, c.hatColor));
    }
  }
}

/* Shopping cart, 16x8, drawn beside a shopper */
function drawCart(g, x, y, scale, color){
  const c = color || "#b8c0c8", d = shade(color || "#b8c0c8", -50);
  const rows = [
    "................",
    "..ddddddddddd...",
    "..dcccccccccdd..",
    "..dcwdccdcwcdc..",
    "..dcccccccccdd..",
    "..dcccccccccdd..",
    "..dd....dd......",
    "...o....o.......",
  ];
  const rep = { d, c, w:"#ffffff", o:"#222" };
  drawGrid(g, rows.map(r => r.split("").map(ch => rep[ch] || null)), x, y, scale);
}
