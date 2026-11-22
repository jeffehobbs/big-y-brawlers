/* BIG Y BRAWLERS — tiny WebAudio chip sfx */
"use strict";
const AudioFX = {
  ctx: null,
  muted: false,
  ensure(){
    if (!this.ctx){
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e){ this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },
  tone(freq, dur, type, vol, slide){
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const gn = this.ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    gn.gain.setValueAtTime(vol || 0.08, t0);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn); gn.connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol){
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gn = this.ctx.createGain();
    gn.gain.setValueAtTime(vol || 0.1, t0);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(gn); gn.connect(this.ctx.destination);
    src.start(t0);
  },
  play(name){
    this.ensure();
    if (!this.ctx) return;
    switch (name){
      case "step":    this.tone(140 + Math.random() * 40, 0.03, "triangle", 0.02); break;
      case "bump":    this.tone(70, 0.06, "square", 0.05); break;
      case "hit":     this.noise(0.08, 0.12); this.tone(180, 0.08, "square", 0.08, -80); break;
      case "big":     this.noise(0.15, 0.16); this.tone(90, 0.18, "sawtooth", 0.1, -50); break;
      case "crit":    this.tone(500, 0.05, "square", 0.08); this.tone(700, 0.08, "square", 0.08); this.noise(0.1, 0.12); break;
      case "heal":    this.tone(392, 0.09, "square", 0.06); this.tone(523, 0.12, "square", 0.06); break;
      case "pickup":  this.tone(660, 0.06, "square", 0.06); this.tone(990, 0.09, "square", 0.06); break;
      case "battle":  this.tone(220, 0.1, "sawtooth", 0.09, -80); this.tone(110, 0.2, "sawtooth", 0.09); break;
      case "win":     [523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.tone(f,0.14,"square",0.07), i*110)); break;
      case "lose":    [392,330,262,196].forEach((f,i)=>setTimeout(()=>this.tone(f,0.2,"sawtooth",0.07), i*160)); break;
      case "levelup": [330,415,494,659,830].forEach((f,i)=>setTimeout(()=>this.tone(f,0.1,"square",0.07), i*80)); break;
      case "talk":    this.tone(220, 0.03, "square", 0.03); break;
      case "door":    this.tone(90, 0.15, "triangle", 0.08, -30); break;
      case "locked":  this.tone(110, 0.1, "square", 0.07); this.tone(82, 0.15, "square", 0.07); break;
      case "flee":    this.tone(400, 0.15, "square", 0.06, -250); break;
      case "special": this.tone(880, 0.06, "square", 0.07); this.tone(1175, 0.09, "square", 0.07); this.noise(0.12, 0.1); break;
      case "guard":   this.tone(300, 0.08, "triangle", 0.07, 60); break;
      case "stamp":   this.tone(60, 0.12, "square", 0.14); this.noise(0.06, 0.1); break;
      case "restock": [440,554,659,880].forEach((f,i)=>setTimeout(()=>this.tone(f,0.12,"square",0.07), i*90)); break;
    }
  },
  toggle(){ this.muted = !this.muted; return this.muted; }
};
