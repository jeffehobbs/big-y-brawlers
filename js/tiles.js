/* BIG Y BRAWLERS — procedural 16x16 tiles + grocery icons */
"use strict";

function tileBase(g, x, y, color, line){
  g.fillStyle = color; g.fillRect(x, y, 16, 16);
  if (line){ g.fillStyle = line; g.fillRect(x, y, 16, 1); g.fillRect(x, y+15, 16, 1); g.fillRect(x, y, 1, 16); g.fillRect(x+15, y, 1, 16); }
}

function drawTile(g, ch, px, py, tx, ty){
  /* px,py = screen px; tx,ty = tile coords (for variation) */
  const v = (tx * 7 + ty * 13) % 4;
  switch (ch){
    case ".": {
      const base = ((tx + ty) % 2 === 0) ? "#d8d4cc" : "#cfcac1";
      g.fillStyle = base; g.fillRect(px, py, 16, 16);
      if (v === 0){ g.fillStyle = "#c4bfb5"; g.fillRect(px + 3, py + 5, 2, 2); }
      if (v === 2){ g.fillStyle = "#c4bfb5"; g.fillRect(px + 10, py + 11, 2, 2); }
      break;
    }
    case "#": {
      g.fillStyle = "#3a3f4a"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#4a505c"; g.fillRect(px, py, 16, 3);
      g.fillStyle = "#2a2e36"; g.fillRect(px, py + 14, 16, 2);
      break;
    }
    case "R": g.fillStyle = "#c8c2b4"; g.fillRect(px, py, 16, 16); g.fillStyle = "#bdb6a6"; g.fillRect(px, py, 16, 2); break;
    case "O": g.fillStyle = "#c2c8d2"; g.fillRect(px, py, 16, 16); g.fillStyle = "#b6bcc8"; g.fillRect(px, py, 16, 2); break;
    case "K": g.fillStyle = "#b8b2a4"; g.fillRect(px, py, 16, 16); g.fillStyle = "#aca596"; g.fillRect(px, py, 16, 2); break;
    case "H": { /* pharmacy shelf */
      g.fillStyle = "#f0f0f2"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#d8d8de"; g.fillRect(px, py, 16, 2);
      for (let i = 0; i < 4; i++){
        const c = ["#c40d3c","#004a98","#008000","#e8a020"][ (i + tx) % 4 ];
        g.fillStyle = c; g.fillRect(px + 2 + i*3, py + 5, 2, 5);
      }
      g.fillStyle = "#9aa"; g.fillRect(px, py + 12, 16, 3);
      break;
    }
    case "A": { /* grocery shelf (double-deck) */
      g.fillStyle = "#8a6a44"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#a07c50"; g.fillRect(px, py + 1, 16, 2);
      g.fillStyle = "#6a4e30"; g.fillRect(px, py + 14, 16, 2);
      for (let i = 0; i < 5; i++){
        const c = ["#d04040","#e8b030","#4080c0","#50a050","#e0e0e0"][ (i + tx) % 5 ];
        g.fillStyle = c; g.fillRect(px + 1 + i*3, py + 4, 2, 4);
        g.fillStyle = shade(c, -30); g.fillRect(px + 1 + i*3, py + 10, 2, 4);
      }
      break;
    }
    case "B": { /* bakery case */
      g.fillStyle = "#c8a878"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#e8d8b8"; g.fillRect(px, py, 16, 5);
      g.fillStyle = "#a06a30"; g.fillRect(px + 2, py + 2, 5, 3);
      g.fillStyle = "#c88840"; g.fillRect(px + 9, py + 2, 5, 3);
      g.fillStyle = "#8a6a44"; g.fillRect(px, py + 13, 16, 3);
      break;
    }
    case "P": { /* produce stand */
      g.fillStyle = "#9a8a5a"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#5a9a4a"; g.fillRect(px + 1, py + 2, 7, 6);
      g.fillStyle = "#d04838"; g.fillRect(px + 8, py + 2, 7, 6);
      g.fillStyle = "#e8b830"; g.fillRect(px + 1, py + 9, 7, 5);
      g.fillStyle = "#8a5a9a"; g.fillRect(px + 8, py + 9, 7, 5);
      g.fillStyle = "#7a6a40"; g.fillRect(px, py + 15, 16, 1);
      break;
    }
    case "M": { /* meat case */
      g.fillStyle = "#d8d8dc"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#f4f4f6"; g.fillRect(px, py, 16, 4);
      g.fillStyle = "#a02828"; g.fillRect(px + 2, py + 5, 5, 5);
      g.fillStyle = "#c04848"; g.fillRect(px + 9, py + 5, 5, 5);
      g.fillStyle = "#802020"; g.fillRect(px + 2, py + 11, 12, 3);
      break;
    }
    case "Y": { /* dairy case */
      g.fillStyle = "#e8f0f8"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#ffffff"; g.fillRect(px, py, 16, 5);
      g.fillStyle = "#f4f4f4"; g.fillRect(px + 2, py + 7, 4, 6);
      g.fillStyle = "#f4f4f4"; g.fillRect(px + 9, py + 7, 4, 6);
      g.fillStyle = "#4080c0"; g.fillRect(px + 2, py + 7, 4, 2);
      g.fillStyle = "#c40d3c"; g.fillRect(px + 9, py + 7, 4, 2);
      g.fillStyle = "#90a8c0"; g.fillRect(px, py + 14, 16, 2);
      break;
    }
    case "F": { /* frozen case */
      g.fillStyle = "#c0d8e8"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#e8f4fc"; g.fillRect(px, py, 16, 5);
      g.fillStyle = "#d04838"; g.fillRect(px + 2, py + 7, 5, 5);
      g.fillStyle = "#e8b830"; g.fillRect(px + 9, py + 7, 5, 5);
      g.fillStyle = "#8ab8d8"; g.fillRect(px, py + 14, 16, 2);
      break;
    }
    case "L": { /* floral */
      g.fillStyle = "#e8e0d0"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#8a6a44"; g.fillRect(px + 3, py + 8, 4, 6);
      g.fillStyle = "#c40d3c"; g.fillRect(px + 9, py + 8, 4, 6);
      g.fillStyle = ["#c40d3c","#e8b830","#8a5a9a"][(tx) % 3]; g.fillRect(px + 4, py + 4, 2, 3);
      g.fillStyle = "#5a9a4a"; g.fillRect(px + 6, py + 6, 2, 2);
      g.fillStyle = ["#e8b830","#c40d3c"][(ty) % 2]; g.fillRect(px + 10, py + 4, 2, 3);
      break;
    }
    case "C": { /* register */
      g.fillStyle = "#4a4a52"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#5a5a64"; g.fillRect(px, py, 16, 4);
      g.fillStyle = "#c40d3c"; g.fillRect(px + 4, py + 1, 8, 2);
      g.fillStyle = "#121212"; g.fillRect(px + 4, py + 6, 8, 5);
      g.fillStyle = "#40e0a0"; g.fillRect(px + 5, py + 7, 6, 3);
      break;
    }
    case "c": { /* self-checkout kiosk */
      g.fillStyle = "#3a3f4a"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#2a2e36"; g.fillRect(px + 2, py + 2, 12, 10);
      g.fillStyle = "#60e8ff"; g.fillRect(px + 4, py + 4, 8, 5);
      g.fillStyle = "#e8e8e8"; g.fillRect(px + 3, py + 13, 10, 2);
      break;
    }
    case "T": { /* table / desk */
      g.fillStyle = "#8a6a44"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#a07c50"; g.fillRect(px + 1, py + 1, 14, 14);
      g.fillStyle = "#8a6a44"; g.fillRect(px + 4, py + 4, 8, 3);
      break;
    }
    case "D": { /* deli counter */
      g.fillStyle = "#e8e4dc"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#c8c4bc"; g.fillRect(px, py + 11, 16, 5);
      g.fillStyle = "#a8d8f0"; g.fillRect(px + 1, py + 2, 14, 7);
      g.fillStyle = "#e8a0a0"; g.fillRect(px + 3, py + 4, 4, 3);
      g.fillStyle = "#e8c070"; g.fillRect(px + 9, py + 4, 4, 3);
      g.fillStyle = "#c40d3c"; g.fillRect(px, py + 10, 16, 1);
      break;
    }
    case "d": { /* service desk */
      g.fillStyle = "#c40d3c"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#e03050"; g.fillRect(px, py, 16, 6);
      g.fillStyle = "#fff"; g.fillRect(px + 4, py + 2, 8, 3);
      g.fillStyle = "#a00d30"; g.fillRect(px, py + 12, 16, 4);
      break;
    }
    case "X": { /* crate */
      g.fillStyle = "#a07c50"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#8a6a44"; g.fillRect(px, py + 3, 16, 2);
      g.fillStyle = "#8a6a44"; g.fillRect(px, py + 9, 16, 2);
      g.fillStyle = "#6a4e30"; g.fillRect(px, py, 2, 16);
      g.fillStyle = "#6a4e30"; g.fillRect(px + 14, py, 2, 16);
      break;
    }
    case "r": case "o": { /* open door (break / office) */
      g.fillStyle = "#c8c2b4"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#8a6a44"; g.fillRect(px, py, 3, 16);
      break;
    }
    case "k": { /* stockroom door: locked = steel, open = floor */
      if (GAME.state !== "VICTORY" && !GAME.stockUnlocked){
        g.fillStyle = "#7a828e"; g.fillRect(px, py, 16, 16);
        g.fillStyle = "#5a626e"; g.fillRect(px + 2, py + 2, 12, 12);
        g.fillStyle = "#ffd700"; g.fillRect(px + 6, py + 6, 4, 4);
        g.fillStyle = "#2a2e36"; g.fillRect(px + 7, py + 7, 2, 2);
      } else {
        g.fillStyle = "#b8b2a4"; g.fillRect(px, py, 16, 16);
        g.fillStyle = "#5a626e"; g.fillRect(px, py, 16, 3);
      }
      break;
    }
    case "*": { /* entrance mat */
      g.fillStyle = "#cfcac1"; g.fillRect(px, py, 16, 16);
      g.fillStyle = "#c40d3c"; g.fillRect(px, py + 3, 16, 10);
      g.fillStyle = "#fff"; g.fillRect(px + 2, py + 6, 12, 4);
      break;
    }
    default:
      g.fillStyle = "#00ff00"; g.fillRect(px, py, 16, 16);
  }
}

/* ---- grocery item icons, 16x16 procedural ---- */
const ICONS = {
  apple(g){ g.fillStyle="#d04030"; g.fillRect(4,6,8,7); g.fillStyle="#d04030"; g.fillRect(3,7,10,5); g.fillStyle="#f07060"; g.fillRect(5,7,2,2); g.fillStyle="#6a4020"; g.fillRect(7,3,2,3); g.fillStyle="#5a9a3a"; g.fillRect(9,3,2,2); },
  banana(g){ g.fillStyle="#e8c830"; g.fillRect(3,9,10,3); g.fillRect(4,7,8,2); g.fillRect(11,8,2,2); g.fillStyle="#c8a820"; g.fillRect(3,11,10,1); },
  bread(g){ g.fillStyle="#c88840"; g.fillRect(2,6,12,6); g.fillStyle="#a06a30"; g.fillRect(2,11,12,2); g.fillStyle="#e8b878"; g.fillRect(3,6,10,2); },
  milk(g){ g.fillStyle="#f4f4f4"; g.fillRect(5,5,6,9); g.fillStyle="#4080c0"; g.fillRect(5,7,6,3); g.fillStyle="#c40d3c"; g.fillRect(4,3,8,3); g.fillStyle="#ddd"; g.fillRect(5,4,6,1); },
  coffee(g){ g.fillStyle="#f4f4f4"; g.fillRect(4,6,8,7); g.fillStyle="#6a4020"; g.fillRect(4,6,8,2); g.fillStyle="#c40d3c"; g.fillRect(6,9,4,2); g.fillStyle="#ddd"; g.fillRect(12,7,2,4); },
  clamato(g){ g.fillStyle="#f4f4f4"; g.fillRect(5,4,6,10); g.fillStyle="#d04030"; g.fillRect(5,7,6,3); g.fillStyle="#f4f4f4"; g.fillRect(6,2,4,2); g.fillStyle="#ddd"; g.fillRect(5,5,6,1); },
  yogurt(g){ g.fillStyle="#e8f0f8"; g.fillRect(4,5,8,8); g.fillStyle="#8ab8d8"; g.fillRect(4,5,8,3); g.fillStyle="#f4f4f4"; g.fillRect(3,4,10,2); },
  soup(g){ g.fillStyle="#c0c0c8"; g.fillRect(5,5,6,9); g.fillStyle="#d04030"; g.fillRect(5,7,6,4); g.fillStyle="#e0e0e8"; g.fillRect(5,4,6,2); },
  chips(g){ g.fillStyle="#e8b830"; g.fillRect(4,4,8,10); g.fillStyle="#c40d3c"; g.fillRect(4,7,8,2); g.fillStyle="#c8a020"; g.fillRect(4,4,8,1); g.fillRect(4,13,8,1); },
  candy(g){ g.fillStyle="#8a5a3a"; g.fillRect(4,4,8,9); g.fillStyle="#e0e0e0"; g.fillRect(4,4,8,2); g.fillStyle="#d04030"; g.fillRect(6,7,4,3); },
  coupon(g){ g.fillStyle="#f4f0e0"; g.fillRect(2,5,12,7); g.fillStyle="#c40d3c"; g.fillRect(3,6,4,2); g.fillStyle="#333"; g.fillRect(8,6,5,1); g.fillRect(8,8,4,1); },
  fish(g){ g.fillStyle="#e8f4fc"; g.fillRect(2,5,12,6); g.fillStyle="#7ab0d8"; g.fillRect(3,6,8,4); g.fillStyle="#4080c0"; g.fillRect(10,6,3,4); g.fillStyle="#121212"; g.fillRect(11,7,1,1); },
  pizza(g){ g.fillStyle="#c88840"; g.fillRect(3,7,10,6); g.fillStyle="#d04030"; g.fillRect(4,6,8,3); g.fillStyle="#e8b830"; g.fillRect(5,8,2,2); g.fillRect(9,9,2,2); },
  chicken(g){ g.fillStyle="#c88840"; g.fillRect(4,5,8,8); g.fillStyle="#e8b878"; g.fillRect(5,6,6,5); g.fillStyle="#8a5a30"; g.fillRect(11,6,2,6); },
  egg(g){ g.fillStyle="#f4f0e0"; g.fillRect(3,4,10,8); g.fillStyle="#f8f4e8"; g.fillRect(4,5,8,6); g.fillStyle="#e8d8c0"; g.fillRect(5,7,2,2); g.fillRect(9,8,2,2); },
};
function drawIcon(g, id, x, y, scale){
  scale = scale || 1;
  const save = g.save;
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  if (ICONS[id]) ICONS[id](g);
  g.restore();
}
