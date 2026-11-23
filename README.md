# Big Y Brawlers

Overhead pixel-art RPG set in the Northampton Big Y. Play as Sedonia, Kelvin or Cory,
restock the store, battle rival shoppers in turn-based combat, and take down the Cartel Captain before the 9 PM close.

Run: `python3 -m http.server` in this folder, then open http://localhost:8000

Controls: WASD/arrows move, Z/Enter confirm or talk, X back, I bag, Esc pause, M mute.
Splash art: img/splash.png. Splash music: audio/soundtrack.mp3.

Balance: enemy stats are scaled in `ENEMY_TUNE` (js/data.js). A scripted bot fight simulation puts regular fights at ~30-50% HP cost and the Cartel Captain at roughly 60-99% win for a level-5 player with a decent bag.

Mobile: play in landscape. On touch devices an on-screen thumbstick, A (talk/confirm), BAG and pause buttons appear, every menu is tappable, and text scales up on small screens. "Add to Home Screen" installs it fullscreen.
