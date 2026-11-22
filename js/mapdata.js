/* BIG Y BRAWLERS — store layout (64 x 40 tiles, built from segments so rows can't be wrong) */
"use strict";
const MW = 64, MH = 40;
function rowOf(parts){
  const s = parts.join("");
  if (s.length !== MW) throw new Error("Map row width " + s.length + " != " + MW + ": " + s);
  return s;
}
const SH = "#"+ ".".repeat(11) + "AA" + ".." + "AA" + ".." + "AA" + "..." + "AA" + "..." + "AA" + "..." + "AA" + "..." + "AA" + "..." + "AA" + ".".repeat(16) + "#";
const TOPA = "#"+ "R".repeat(11) + "#"+ "O".repeat(11) + "#"+ "K".repeat(14) + ".".repeat(24) + "#";
const TOPB = "#"+ "R".repeat(11) + "#"+ "O".repeat(11) + "#"+ "K".repeat(14) + "." + "H".repeat(22) + "." + "#";
const OPEN = "#"+ ".".repeat(62) + "#";
const BAKERY = "#"+ "." + "B".repeat(7) + ".".repeat(46) + "Y".repeat(7) + "." + "#";
const PRODUCE = "#"+ "." + "P".repeat(7) + ".".repeat(46) + "F".repeat(7) + "." + "#";
const REGS = "#"+ ".".repeat(7) + "C.C.C.C.C.C.C.C.C.C" + ".".repeat(7) + "c.c.c.c.c" + ".".repeat(20) + "#";
const DELI = "#"+ ".".repeat(54) + "D".repeat(6) + ".".repeat(2) + "#";
const BOTTOM = "#"+ ".".repeat(9) + "M".repeat(10) + ".".repeat(8) + "d".repeat(6) + ".".repeat(10) + "L".repeat(9) + ".".repeat(10) + "#";
const MAT = "#"+ ".".repeat(29) + "*".repeat(4) + ".".repeat(29) + "#";
const DOORS = "#".repeat(11) + "r" + "#".repeat(11) + "o" + "#" + "#".repeat(6) + "k" + "#".repeat(7) + ".".repeat(24) + "#";
const EXIT = "#".repeat(30) + ".".repeat(4) + "#".repeat(30);

const MAP_ROWS = [
  "#".repeat(MW),                                   // 0  wall
  TOPA, TOPB, TOPA, TOPB, TOPA,                     // 1-5 rooms + pharmacy
  DOORS,                                            // 6 room doors
  OPEN,                                             // 7
  REGS, REGS,                                       // 8-9 registers + self-checkout
  OPEN, OPEN,                                       // 10-11 queue
  BAKERY, BAKERY, BAKERY, BAKERY,                   // 12-15 bakery / dairy
  OPEN,                                             // 16
  SH, SH, SH, SH, SH, SH, SH, SH, SH, SH, SH, SH,   // 17-28 aisles 1-8
  DELI,                                             // 29
  PRODUCE, PRODUCE, PRODUCE, PRODUCE,               // 30-33 produce / frozen
  OPEN,                                             // 34
  BOTTOM,                                           // 35 meat / service desk / floral
  OPEN,                                             // 36
  MAT,                                              // 37 entrance mat
  EXIT,                                             // 38 exit gap
  "#".repeat(MW),                                   // 39 wall
];
MAP_ROWS.forEach((r, i) => { if (r.length !== MW) throw new Error("Map row " + i + " width " + r.length); });
if (MAP_ROWS.length !== MH) throw new Error("Map height " + MAP_ROWS.length);

/* Furniture overrides [x, y, ch] */
const FURNITURE = [
  [5,3,"T"], [6,3,"T"],        // break room tables
  [17,2,"T"], [18,2,"T"],      // office desk
  [26,1,"X"], [37,1,"X"],      // stockroom crates
  [26,4,"X"], [37,4,"X"], [28,2,"X"],
];
function buildMap(){
  const m = MAP_ROWS.map(r => r.split(""));
  for (const [x, y, ch] of FURNITURE) m[y][x] = ch;
  return m;
}
function tileAt(m, x, y){
  if (x < 0 || y < 0 || x >= MW || y >= MH) return "#";
  return m[y][x];
}
function isSolid(m, x, y){
  const ch = tileAt(m, x, y);
  if (ch === "#") return true;
  if (ch === "k" && !GAME.stockUnlocked) return true;
  return "ABPMYFCLcTHXd".indexOf(ch) >= 0;
}

/* Zones: id, name, rect [x0,y0,x1,y1] (inclusive), enemy pool, grocery pickups */
const ZONES = [
  { id:"checkout", name:"CHECKOUT LANES", rect:[1,7,62,11],  pool:["lurker","browser","browser"], max:3,
    picks:[[10,7,"apple"],[16,7,"chips"],[24,7,"coffee"],[52,10,"coupon"],[48,10,"banana"]] },
  { id:"aisles", name:"GROCERY AISLES", rect:[9,12,46,29], pool:["browser","flyer","chomper","browser","flyer"], max:5,
    picks:[[14,14,"soup"],[15,24,"bread"],[19,17,"milk"],[23,20,"chips"],[28,15,"candy"],[33,22,"clamato"]] },
  { id:"fresh", name:"PRODUCE & BAKERY", rect:[1,12,8,33], pool:["crawler","flyer","crawler"], max:3,
    picks:[[1,13,"apple"],[5,29,"banana"],[9,31,"egg"],[1,15,"yogurt"]] },
  { id:"dairy", name:"DAIRY / FROZEN / PHARMACY", rect:[47,1,62,33], pool:["lurker","flyer","crawler","lurker"], max:4,
    picks:[[54,13,"milk"],[62,15,"yogurt"],[54,31,"fish"],[62,32,"chicken"],[50,3,"coupon"],[58,20,"clamato"]] },
  { id:"deli", name:"DELI / MEAT / FLOOR", rect:[9,29,46,36], pool:["chomper","crawler","browser"], max:3,
    picks:[[12,36,"pizza"],[20,36,"chicken"],[40,34,"soup"]] },
];
const TOTAL_PICKS = ZONES.reduce((n,z) => n + z.picks.length, 0); // 25
const UNLOCK_AT = 18; // groceries collected to open stockroom

/* Signs mirror the departments on the real Northampton store page: [label, tileX (center), tileY] */
const DEPT_SIGNS = [
  ["FRESH BAKERY", 5, 11], ["SUB SHOP", 23, 34], ["DAIRY", 58, 11],
  ["PRODUCE", 5, 29], ["FROZEN", 58, 29], ["DELI + BOAR'S HEAD", 57, 28],
  ["BUTCHER SHOP", 14, 34], ["SERVICE DESK", 31, 34], ["FLORAL", 48, 34],
  ["PHARMACY", 51, 5], ["STOCKROOM", 35, 6], ["BREAK ROOM", 6, 6], ["OFFICE", 17, 6],
  ["CHECKOUT", 15, 10], ["SELF-CHECKOUT", 38, 10], ["BOTTLE REDEMPTION", 8, 36], ["COINSTAR", 55, 36],
  ["AISLE 1", 13, 16], ["AISLE 2", 17, 16], ["AISLE 3", 21, 16], ["AISLE 4", 26, 16],
  ["AISLE 5", 31, 16], ["AISLE 6", 36, 16], ["AISLE 7", 41, 16], ["AISLE 8", 46, 16],
];
