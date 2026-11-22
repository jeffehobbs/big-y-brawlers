/* BIG Y BRAWLERS — characters, enemies, groceries, dialogue */
"use strict";

const CHARS = {
  sedona: {
    id:"sedona", name:"SEDONA", role:"SELF-CHECKOUT ATTENDANT",
    hp:62, atk:9, spd:5,
    desc:"QUICK FINGERS ON THE SCANNER. BALANCED FIGHTER.",
    special:"SCAN & TAG",
    specialDesc:"DEAL 2x DAMAGE AND STEAL A GROCERY FROM THE ENEMY.",
    color:"#c40d3c",
  },
  calvin: {
    id:"calvin", name:"CALVIN", role:"STORE MANAGER",
    hp:84, atk:7, spd:4,
    desc:"TANKY. CARRIES THE MASTER KEYS AND A VERY SERIOUS STAMP.",
    special:"MANAGER'S STAMP",
    specialDesc:"HEAVY HIT THAT STUNS THE ENEMY FOR A TURN.",
    color:"#004a98",
  },
  corey: {
    id:"corey", name:"COREY", role:"ASSISTANT MANAGER",
    hp:52, atk:6, spd:7,
    desc:"FAST ON HIS FEET. TALKS TO THE WALKIE-TALKIE LIKE IT OWES HIM MONEY.",
    special:"STORE CREDIT STORM",
    specialDesc:"LIGHTNING DAMAGE AND HEALS 15 HP.",
    color:"#008000",
  },
};

const ENEMIES = {
  browser:  { id:"browser",  name:"BUDGET BROWSER",  hp:22, atk:4,  spd:3, xp:8,  tier:1,
              quote:["Just looking, just looking...","This one's not on sale?!"],
              loot:["apple","chips","bread","banana"] },
  flyer:    { id:"flyer",    name:"FLYER HOARDER",   hp:20, atk:5,  spd:4, xp:11, tier:1,
              quote:["4 FOR 5! I NEED 40 OF THESE.","Did you see page 12?!"],
              loot:["coupon","chips","egg","banana"] },
  lurker:   { id:"lurker",   name:"EXPRESS LANE LURKER", hp:26, atk:6, spd:6, xp:14, tier:2,
              quote:["I HAVE 3 ITEMS.","(he has 19)"],
              loot:["clamato","coffee","coupon","chips"] },
  chomper:  { id:"chomper",  name:"CART CHOMPER",    hp:34, atk:7,  spd:3, xp:17, tier:2,
              quote:["*cart wheels scream*","More. More. MORE."],
              loot:["soup","pizza","candy","chicken"] },
  crawler:  { id:"crawler",  name:"AISLE CRAWLER",   hp:42, atk:6,  spd:2, xp:19, tier:2,
              quote:["*slowly blocks the whole aisle*","..."],
              loot:["fish","egg","yogurt","chicken"] },
  captain:  { id:"captain",  name:"CARTEL CAPTAIN",  hp:130, atk:11, spd:5, xp:120, tier:3, boss:true,
              quote:["The cart belongs to ME now.","You staff can't stop the sale!"],
              loot:["candy","pizza","clamato","chicken","coupon"] },
};

const ITEMS = {
  apple:   { name:"APPLE",        kind:"heal",   v:12,  desc:"RESTORE 12 HP" },
  banana:  { name:"BANANA",       kind:"heal",   v:8,   desc:"RESTORE 8 HP" },
  bread:   { name:"BREAD",        kind:"heal",   v:15,  desc:"RESTORE 15 HP" },
  milk:    { name:"MILK",         kind:"heal",   v:18,  desc:"RESTORE 18 HP" },
  yogurt:  { name:"YOGURT",       kind:"heal",   v:25,  desc:"RESTORE 25 HP" },
  pizza:   { name:"PIZZA SLICE",  kind:"heal",   v:30,  desc:"RESTORE 30 HP" },
  candy:   { name:"CANDY BAR",    kind:"heal",   v:35,  desc:"RESTORE 35 HP" },
  soup:    { name:"CANNED SOUP",  kind:"attack", v:20,  desc:"HIT FOR 20 DMG" },
  clamato: { name:"CLAMATO",      kind:"attack", v:16,  desc:"HIT FOR 16 DMG" },
  fish:    { name:"FROZEN FISH",  kind:"attack", v:24,  desc:"HIT FOR 24 DMG" },
  chicken: { name:"CHICKEN BREAST", kind:"attack", v:28, desc:"HIT FOR 28 DMG" },
  egg:     { name:"EGG",          kind:"both",   v:12,  desc:"12 DMG + 10 HP" },
  chips:   { name:"CHIP BAG",     kind:"guard",  v:8,   desc:"+8 HP AND GUARD" },
  coffee:  { name:"COFFEE",       kind:"haste",  v:0,   desc:"ATTACK TWICE THIS TURN" },
  coupon:  { name:"COUPON",       kind:"buff",   v:4,   desc:"+4 ATK FOR THE BATTLE" },
};

const NPC_INFO = {
  sedona: { pos:[38,10],  title:"SELF-CHECKOUT ATTENDANT" },
  calvin: { pos:[18,4],  title:"STORE MANAGER" },
  corey:  { pos:[30,34], title:"ASSISTANT MANAGER" },
};

/* Dialogue: [npc, playerCharId] -> array of lines */
function getDialogue(npc, player){
  const D = {
    calvin: [
      ["Morning. Listen up — the CARTEL CART has hit every store in the Pioneer Valley.",
       "They're clearing our shelves FASTER than we can stock them.",
       "Restock " + UNLOCK_AT + " groceries across the store and I'll unlock the stockroom.",
       "Word is their boss is hoarding the last pallet down there. End this."],
      ["The shoppers out there are in the Cartel. You bump into one, it's a fight.",
       "Groceries you win in a fight go in YOUR bag. Use them in battle.",
       "Close is 9 PM. We don't have all night. We don't have till 8, either."],
    ],
    sedona: [
      ["Hey! I'm at lane 12 — the self-checkout. 'Item not recognized'? THAT'S YOU.",
       "Let me scan your wounds real quick. (+20 HP)",
       "Tip: my scanner never misses. Neither do you, if you pick your shots.",
       "Bottle Redemption jammed again. I'm not even mad. Go fight someone."],
      ["Express lane? 10 items or less. Those lurkers? More like 20.",
       "Stock the aisles first, then come hit the stockroom. You'll know when it unlocks."],
    ],
    corey: [
      ["Yo. Corey here. Assistant manager, walkie-talkie whisperer.",
       "The stockroom door is locked till you've got " + UNLOCK_AT + " groceries bagged.",
       "Healing tip: Sedona's lane and the break room fix you up. Don't die out there.",
       "Pizza Shop opens at 11 and the Sub Shop never closes early. Both are fair game for loot."],
      ["The Cartel Captain's got a cart the size of a minivan. Guard when he swings.",
       "When all the zones are restocked, hit that steel door. Bring your A game."],
    ],
  };
  const bank = D[npc];
  return bank ? bank[(player.talked[npc] || 0) % bank.length] : [];
}

/* Intro script: [speaker, text] — speaker "P" = the player's chosen char */
function introScript(player){
  const other1 = player.id === "calvin" ? "sedona" : "calvin";
  const other2 = player.id === "corey" ? "sedona" : "corey";
  return [
    ["CALVIN","7 AM. Big Y Northampton. 136 North King Street, Route 5. Doors open."],
    [other1,"Sales flyer just dropped. Expect a rush."],
    [other2,"Rush? I'm seeing carts stacking up in the lot..."],
    ["CALVIN","It's the Cartel. They're raiding the shelves again."],
    ["P","Then we fight for the groceries. Who's in?"],
    ["CALVIN","Everyone's in. Bag " + UNLOCK_AT + " groceries, unlock the stockroom, and take their Captain down before 9 PM close."],
  ];
}
