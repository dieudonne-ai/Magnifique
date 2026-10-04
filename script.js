/* =========================================================
   RÉGLAGES — c'est ici que tu personnalises le site
   ========================================================= */
const CONFIG = {
  // Ton numéro WhatsApp au format international, sans + ni espaces (ex : "243812345678").
  // Laisse vide : WhatsApp laissera Magnifique choisir ton contact elle-même.
  whatsapp: '',

  // Messages pré-écrits envoyés sur WhatsApp selon sa réponse.
  msgYes: "Oui, tentons l'aventure ❤️",
  msgWait: 'Prenons encore un peu le temps 🌙',

  // Photos : dépose-les dans le dossier /images et nomme-les photo1.jpg, photo2.jpg, photo3.jpg…
  // (jpg, jpeg, png ou webp acceptés, jusqu'à maxPhotos). Rien d'autre à faire.
  maxPhotos: 10,

  // Petites légendes manuscrites sous les photos (dans l'ordre, ça boucle).
  captions: ['Notre rencontre ✨', 'Ce sourire…', 'Et si c’était le début ?', 'Magnifique', 'Rien que nous', 'Doucement…'],

  // Musique : par défaut une mélodie douce générée dans le navigateur (aucun fichier).
  // Pour ta propre chanson, mets le fichier dans /music et indique son chemin ici, ex : 'music/chanson.mp3'
  musicFile: ''
};

/* =========================================================
   Outils
   ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HEART = new Path2D('M50 85C10 55 0 30 20 15C35 4 50 14 50 26C50 14 65 4 80 15C100 30 90 55 50 85Z');

let W = innerWidth, H = innerHeight, DPR = Math.min(devicePixelRatio || 1, 2);

/* =========================================================
   Photos : détection automatique dans /images
   ========================================================= */
const EXT = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG'];
const probe = src => new Promise(res => { const i = new Image(); i.onload = () => res(src); i.onerror = () => res(null); i.src = src; });

async function loadPhotos() {
  const slots = Array.from({ length: CONFIG.maxPhotos }, (_, n) =>
    Promise.all(EXT.map(e => probe(`images/photo${n + 1}.${e}`))).then(r => r.find(Boolean)));
  return (await Promise.all(slots)).filter(Boolean);
}

const photosReady = loadPhotos();
const caption = i => CONFIG.captions[i % CONFIG.captions.length];

function makePolaroid(src, i) {
  const el = document.createElement('figure');
  el.className = 'polaroid';
  const ph = document.createElement('div');
  ph.className = 'ph' + (src ? '' : ' empty');
  if (src) {
    const img = new Image();
    img.src = src; img.alt = ''; img.decoding = 'async'; img.draggable = false;
    ph.appendChild(img);
  }
  const cap = document.createElement('figcaption');
  cap.className = 'cap';
  cap.textContent = caption(i);
  el.append(ph, cap);
  return el;
}

// Sans photo, on garde de jolis cadres vides pour que le design reste beau.
const asItems = (photos, min) => {
  const base = photos.length ? photos : [null, null, null, null];
  const out = [];
  while (out.length < min) out.push(...base);
  return out;
};

/* Photos qui montent doucement en bulles derrière le contenu */
function buildBubbles(photos) {
  if (!photos.length) return;
  const box = $('#bubbles');
  const n = reduced ? 0 : Math.min(9, Math.max(5, photos.length * 2));
  for (let i = 0; i < n; i++) {
    const b = document.createElement('div');
    const size = rand(54, 112);
    b.className = 'bubble';
    b.style.cssText = `width:${size}px;height:${size}px;left:${rand(2, 92)}%;--d:${rand(20, 34)}s;--delay:${-rand(0, 30)}s;--dx:${rand(-60, 60)}px;background-image:url("${photos[i % photos.length]}")`;
    box.appendChild(b);
  }
}

/* Pile de polaroïds qui se feuillette (touche pour passer à la suivante) */
function buildStack(photos) {
  const host = $('#stack');
  host.innerHTML = '';
  const items = asItems(photos, 4).slice(0, Math.max(4, Math.min(photos.length || 4, 8)));
  const cards = items.map((s, i) => makePolaroid(s, i));
  cards.forEach(c => host.appendChild(c));
  const rots = [-2, 5, -7, 8, -4];
  let order = cards.slice(), busy = false;

  const layout = () => order.forEach((c, i) => {
    const k = Math.min(i, 3);
    c.style.zIndex = 20 - i;
    c.style.opacity = i > 3 ? 0 : 1;
    c.style.transform = `translate(${k * 9 * (k % 2 ? 1 : -1)}px, ${k * -7}px) rotate(${rots[k]}deg) scale(${1 - k * .045})`;
  });
  layout();

  const next = async () => {
    if (busy) return; busy = true;
    const f = order.shift();
    f.style.transform = `translate(${pick([-1, 1]) * 130}%, -12%) rotate(${pick([-1, 1]) * 24}deg)`;
    f.style.opacity = 0;
    layout();
    await sleep(750);
    f.style.transition = 'none';
    order.push(f); layout();
    void f.offsetWidth; f.style.transition = '';
    busy = false;
  };
  host.onclick = next;
  clearInterval(buildStack.timer);
  buildStack.timer = setInterval(() => { if ($('#s-ask').classList.contains('active')) next(); }, 3600);
}

/* Bandeau de polaroïds qui défile (écran "oui") */
function buildMarquee(photos) {
  const track = $('#track-yes');
  track.innerHTML = '';
  const items = asItems(photos, 6);
  const half = items.map((s, i) => { const p = makePolaroid(s, i); p.style.setProperty('--r', `${(i % 2 ? 1 : -1) * rand(2, 6)}deg`); return p; });
  half.forEach(p => track.appendChild(p));
  half.forEach(p => track.appendChild(p.cloneNode(true)));
  track.style.setProperty('--dur', `${items.length * 6}s`);
}

/* =========================================================
   Fond animé (canvas) : cœurs & étincelles  ↔  étoiles & lanternes
   ========================================================= */
const bg = $('#bg'), bctx = bg.getContext('2d');
const fx = $('#fx'), fctx = fx.getContext('2d');

function resize() {
  W = innerWidth; H = innerHeight;
  for (const c of [bg, fx]) { c.width = W * DPR; c.height = H * DPR; }
  bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener('resize', resize);
resize();

const amb = { mix: 0, energy: 1 };           // mix 0 = amour, 1 = nuit ; energy = intensité des cœurs
const hearts = [], dust = [], stars = [], lanterns = [], shooting = [];

const newHeart = init => ({ x: rand(0, W), y: init ? rand(0, H) : H + 30, s: rand(9, 30), vy: rand(.25, .8), sw: rand(.4, 1.6), ph: rand(0, 6.28), a: rand(.14, .5), c: pick(['255,122,168', '255,77,134', '255,177,204', '255,217,160']) });
const newDust = init => ({ x: rand(0, W), y: init ? rand(0, H) : H + 5, r: rand(.6, 2), vy: rand(.1, .4), tw: rand(0, 6.28) });
const newStar = () => ({ x: rand(0, W), y: rand(0, H * .85), r: rand(.4, 1.6), tw: rand(0, 6.28), sp: rand(.01, .04) });
const newLantern = init => ({ x: rand(0, W), y: init ? rand(H * .2, H) : H + 40, w: rand(16, 30), vy: rand(.2, .5), sw: rand(.3, 1), ph: rand(0, 6.28) });

const nHearts = reduced ? 8 : 26;
for (let i = 0; i < nHearts; i++) hearts.push(newHeart(true));
for (let i = 0; i < (reduced ? 20 : 70); i++) dust.push(newDust(true));
for (let i = 0; i < (reduced ? 50 : 130); i++) stars.push(newStar());
for (let i = 0; i < (reduced ? 4 : 9); i++) lanterns.push(newLantern(true));

function drawHeart(ctx, x, y, s, fill) {
  ctx.save(); ctx.translate(x - s / 2, y - s / 2); ctx.scale(s / 100, s / 100); ctx.fillStyle = fill; ctx.fill(HEART); ctx.restore();
}

let tAmb = 0;
function ambient(ts) {
  tAmb = ts / 1000;
  bctx.clearRect(0, 0, W, H);
  const love = 1 - amb.mix, night = amb.mix;

  if (love > .01) {
    for (const h of hearts) {
      h.y -= h.vy * amb.energy; h.x += Math.sin(tAmb * h.sw + h.ph) * .4;
      if (h.y < -40) Object.assign(h, newHeart(false));
      drawHeart(bctx, h.x, h.y, h.s, `rgba(${h.c},${h.a * love})`);
    }
    for (const d of dust) {
      d.y -= d.vy; if (d.y < -5) Object.assign(d, newDust(false));
      bctx.fillStyle = `rgba(255,230,200,${(.25 + .45 * Math.abs(Math.sin(tAmb * 1.5 + d.tw))) * love})`;
      bctx.beginPath(); bctx.arc(d.x, d.y, d.r, 0, 6.283); bctx.fill();
    }
  }

  if (night > .01) {
    for (const s of stars) {
      const a = (.35 + .65 * Math.abs(Math.sin(tAmb * s.sp * 40 + s.tw))) * night;
      bctx.fillStyle = `rgba(255,250,235,${a})`;
      bctx.beginPath(); bctx.arc(s.x, s.y, s.r, 0, 6.283); bctx.fill();
    }
    for (const l of lanterns) {
      l.y -= l.vy; l.x += Math.sin(tAmb * l.sw + l.ph) * .35;
      if (l.y < -60) Object.assign(l, newLantern(false));
      const g = bctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.w * 3);
      g.addColorStop(0, `rgba(255,190,100,${.55 * night})`); g.addColorStop(1, 'rgba(255,150,60,0)');
      bctx.fillStyle = g; bctx.beginPath(); bctx.arc(l.x, l.y, l.w * 3, 0, 6.283); bctx.fill();
      bctx.fillStyle = `rgba(255,214,150,${.9 * night})`;
      bctx.beginPath(); (bctx.roundRect || bctx.rect).call(bctx, l.x - l.w / 2, l.y - l.w * .6, l.w, l.w * 1.2, l.w * .3); bctx.fill();
    }
    if (!reduced && Math.random() < .006 * night) shooting.push({ x: rand(W * .2, W), y: rand(0, H * .4), vx: -rand(7, 11), vy: rand(3, 5), life: 1 });
    for (let i = shooting.length - 1; i >= 0; i--) {
      const s = shooting[i]; s.x += s.vx; s.y += s.vy; s.life -= .018;
      if (s.life <= 0) { shooting.splice(i, 1); continue; }
      const g = bctx.createLinearGradient(s.x, s.y, s.x - s.vx * 9, s.y - s.vy * 9);
      g.addColorStop(0, `rgba(255,255,255,${s.life})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      bctx.strokeStyle = g; bctx.lineWidth = 2; bctx.beginPath(); bctx.moveTo(s.x, s.y); bctx.lineTo(s.x - s.vx * 9, s.y - s.vy * 9); bctx.stroke();
    }
  }
  requestAnimationFrame(ambient);
}
requestAnimationFrame(ambient);

/* =========================================================
   Effets : confettis, feux d'artifice, pluie de cœurs, étincelles
   ========================================================= */
const PA = [];
let fxOn = false, fxLast = 0;
const COLORS = ['#ff7aa8', '#ff4d86', '#ffd9a0', '#fff3ea', '#ff9ec0', '#e8b4ff', '#ffc857'];

function addP(p) { if (PA.length < 900) PA.push(p); if (!fxOn) { fxOn = true; fxLast = performance.now(); requestAnimationFrame(fxLoop); } }

function confetti(x, y, n, spread = 1, up = 14) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + rand(-.9, .9) * spread, v = rand(up * .5, up);
    addP({ t: 'conf', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: rand(0, 6.28), vr: rand(-.3, .3), w: rand(6, 12), h: rand(4, 8), c: pick(COLORS), life: 1, d: rand(.004, .008) });
  }
}
function burst(x, y, n = 70) {
  const c = pick(COLORS), c2 = pick(COLORS);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + rand(-.05, .05), v = rand(2, 7.5);
    addP({ t: 'spark', x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: Math.random() < .5 ? c : c2, life: 1, d: rand(.012, .022) });
  }
  // un cœur de feu au centre
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * 6.283, hx = 16 * Math.sin(a) ** 3, hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    addP({ t: 'spark', x, y, px: x, py: y, vx: hx * .28, vy: hy * .28, c: '#ff7aa8', life: 1, d: .016 });
  }
}
function rocket(x, ty) { addP({ t: 'rocket', x, y: H + 10, vx: rand(-.6, .6), vy: -rand(11, 14), ty, c: pick(COLORS), life: 1 }); }
function heartPop(x, y, n = 3, size = 14) {
  for (let i = 0; i < n; i++) addP({ t: 'heart', x: x + rand(-14, 14), y, vx: rand(-.8, .8), vy: -rand(1.2, 3), s: rand(size * .6, size * 1.3), c: pick(COLORS), life: 1, d: rand(.008, .014), sw: rand(0, 6) });
}
function heartRain(ms) {
  const end = performance.now() + ms;
  const t = setInterval(() => {
    if (performance.now() > end) return clearInterval(t);
    addP({ t: 'heart', x: rand(0, W), y: -20, vx: rand(-.4, .4), vy: rand(1.4, 3.2), s: rand(10, 26), c: pick(COLORS), life: 1, d: .003, sw: rand(0, 6), rain: true });
  }, 70);
}
function sparkle(x, y) {
  addP({ t: 'spark', x, y, px: x, py: y, vx: rand(-.6, .6), vy: rand(-1, .2), c: pick(['#ffd9a0', '#fff3ea', '#ff9ec0']), life: 1, d: .03, small: true });
}

function fxLoop(ts) {
  const dt = Math.min(32, ts - fxLast) / 16.67; fxLast = ts;
  fctx.clearRect(0, 0, W, H);
  for (let i = PA.length - 1; i >= 0; i--) {
    const p = PA[i];
    switch (p.t) {
      case 'conf':
        p.vy += .32 * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= p.d * dt;
        fctx.save(); fctx.translate(p.x, p.y); fctx.rotate(p.rot); fctx.globalAlpha = Math.max(p.life, 0);
        fctx.fillStyle = p.c; fctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); fctx.restore();
        if (p.life <= 0 || p.y > H + 30) PA.splice(i, 1);
        break;
      case 'heart':
        p.x += (p.vx + Math.sin(ts / 400 + p.sw) * .5) * dt; p.y += p.vy * dt; if (!p.rain) p.life -= p.d * dt * 2.2; else p.life -= p.d * dt;
        fctx.globalAlpha = Math.max(Math.min(p.life * 1.6, 1), 0); drawHeart(fctx, p.x, p.y, p.s, p.c); fctx.globalAlpha = 1;
        if (p.life <= 0 || p.y > H + 30 || p.y < -40) PA.splice(i, 1);
        break;
      case 'spark':
        p.px = p.x; p.py = p.y; p.vy += .05 * dt; p.vx *= .985; p.vy *= .985; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.d * dt;
        fctx.globalAlpha = Math.max(p.life, 0); fctx.strokeStyle = p.c; fctx.lineWidth = p.small ? 1.6 : 2.2; fctx.lineCap = 'round';
        fctx.beginPath(); fctx.moveTo(p.px, p.py); fctx.lineTo(p.x, p.y); fctx.stroke(); fctx.globalAlpha = 1;
        if (p.life <= 0) PA.splice(i, 1);
        break;
      case 'rocket':
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .12 * dt;
        addP({ t: 'spark', x: p.x, y: p.y, px: p.x, py: p.y + 6, vx: rand(-.3, .3), vy: rand(.5, 1.5), c: '#ffd9a0', life: .7, d: .05, small: true });
        if (p.y <= p.ty || p.vy > -1) { burst(p.x, p.y); PA.splice(i, 1); }
        break;
    }
  }
  if (PA.length) requestAnimationFrame(fxLoop); else { fxOn = false; fctx.clearRect(0, 0, W, H); }
}

/* Étincelles qui suivent le doigt/curseur, petits cœurs au toucher */
let lastTrail = 0;
addEventListener('pointermove', e => { const n = performance.now(); if (n - lastTrail > 45 && !reduced) { lastTrail = n; sparkle(e.clientX, e.clientY); } });
addEventListener('pointerdown', e => { if (!reduced) heartPop(e.clientX, e.clientY, 2, 12); });

/* =========================================================
   Musique : boîte à musique romantique générée en direct
   ========================================================= */
const Music = {
  ctx: null, on: false, timer: null, next: 0, bar: 0, el: null,
  CH: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],            // La m · Fa · Do · Sol
  hz: m => 440 * 2 ** ((m - 69) / 12),

  setup() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(c.destination);
    this.bus = c.createGain();
    const rev = c.createConvolver(), wet = c.createGain();
    const len = c.sampleRate * 3, buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.4; }
    rev.buffer = buf; wet.gain.value = .5;
    this.bus.connect(this.master); this.bus.connect(rev); rev.connect(wet); wet.connect(this.master);
    this.next = c.currentTime + .15;
    return true;
  },

  tone(f, t, { dur = 1.6, vol = .12, type = 'sine', attack = .006, rel } = {}) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(.0008, t + (rel || dur));
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + (rel || dur) + .05);
  },

  schedule() {
    const ch = this.CH[this.bar % 4], t0 = this.next, step = .46;
    // nappe douce
    ch.forEach(m => { this.tone(this.hz(m - 12), t0, { dur: 3.9, vol: .05, type: 'triangle', attack: 1.1 }); this.tone(this.hz(m) * 1.003, t0, { dur: 3.9, vol: .025, attack: 1.4 }); });
    this.tone(this.hz(ch[0] - 24), t0, { dur: 3.6, vol: .09, attack: .05 });
    // arpège de boîte à musique
    const notes = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[2] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12];
    notes.forEach((m, i) => {
      if (i > 2 && Math.random() < .18) return;
      const f = this.hz(m), t = t0 + i * step;
      this.tone(f, t, { dur: 1.7, vol: .11 });
      this.tone(f * 2.01, t, { dur: .7, vol: .025 });
    });
    // petite mélodie qui revient toutes les 4 mesures
    if (this.bar % 4 === 3) [[79, 0], [76, 2], [79, 4], [83, 6]].forEach(([m, i]) => this.tone(this.hz(m), t0 + i * step, { dur: 2.2, vol: .08 }));
    this.next += step * 8; this.bar++;
  },

  tick() { while (this.next < this.ctx.currentTime + 2.5) this.schedule(); },

  async start() {
    if (CONFIG.musicFile) {
      this.el ||= Object.assign(new Audio(CONFIG.musicFile), { loop: true, volume: .7 });
      try { await this.el.play(); } catch { return; }
    } else {
      if (!this.ctx && !this.setup()) return;
      await this.ctx.resume();
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t); this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(.85, t + 2);
      this.timer ||= setInterval(() => this.tick(), 400);
      this.tick();
    }
    this.on = true; ui.music(true);
  },

  stop() {
    this.on = false; ui.music(false);
    if (this.el) return this.el.pause();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t); this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + .6);
    setTimeout(() => { if (!this.on) this.ctx.suspend(); }, 700);
  },

  toggle() { this.on ? this.stop() : this.start(); }
};

const ui = { music: on => $('#music').classList.toggle('off', !on) };
$('#music').addEventListener('click', () => Music.toggle());
document.addEventListener('visibilitychange', () => {
  if (!Music.on) return;
  if (document.hidden) { Music.ctx?.suspend(); Music.el?.pause(); } else { Music.ctx?.resume(); Music.el?.play(); }
});

/* =========================================================
   Scénario
   ========================================================= */
const screens = [...document.querySelectorAll('.screen')];
const go = id => screens.forEach(s => s.classList.toggle('active', s.id === id));
const setMode = night => { document.body.classList.toggle('night', night); tween(night ? 1 : 0); };

function tween(target) {
  const from = amb.mix, t0 = performance.now();
  const step = n => { const k = Math.min((n - t0) / 2400, 1); amb.mix = from + (target - from) * k; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

function type(el, text, speed = 55) {
  return new Promise(res => {
    el.textContent = text; el.style.minHeight = el.offsetHeight + 'px';
    el.textContent = ''; el.classList.add('typing');
    if (reduced) { el.textContent = text; el.classList.remove('typing'); return res(); }
    let i = 0;
    const tick = () => {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, speed + (/[,…]/.test(text[i - 1]) ? 260 : 0)); else { el.classList.remove('typing'); res(); }
    };
    tick();
  });
}

function letters(el, text, delay = 0) {
  el.textContent = '';
  let i = 0;
  text.split(' ').forEach((word, w, all) => {
    const wrap = document.createElement('span');
    wrap.className = 'word';
    [...word].forEach(ch => {
      const s = document.createElement('span');
      s.className = 'letter'; s.textContent = ch; s.style.animationDelay = `${delay + i++ * .07}s`;
      wrap.appendChild(s);
    });
    el.appendChild(wrap);
    if (w < all.length - 1) el.appendChild(document.createTextNode(' '));
  });
}

const waLink = text => `https://wa.me/${CONFIG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
let started = false;

async function open(withMusic) {
  if (started) return; started = true;
  if (withMusic) Music.start();
  const r = $('#s-intro').getBoundingClientRect();
  heartPop(W / 2, r.top + r.height / 2, 14, 22);
  const photos = await photosReady;
  buildStack(photos);
  go('s-ask');
  await sleep(700);
  await type($('#ask-title'), 'Magnifique, j’ai une petite question pour toi…');
  await sleep(500);
  for (const el of document.querySelectorAll('#s-ask .line')) {
    el.classList.add('show');
    if (el.classList.contains('choices')) { await sleep(500); el.scrollIntoView({ behavior: 'smooth', block: 'end' }); break; }
    await sleep(1900);
  }
}

async function sayYes() {
  if ($('#s-yes').classList.contains('active')) return;
  const photos = await photosReady;
  buildMarquee(photos);
  $('#wa-yes').href = waLink(CONFIG.msgYes);
  setMode(false); amb.energy = 2.6;
  go('s-yes');
  letters($('#yes-title'), 'Merci, Magnifique', .5);

  // spectacle : feux d'artifice + canons à confettis + pluie de cœurs
  const shots = reduced ? 2 : 7;
  for (let i = 0; i < shots; i++) setTimeout(() => rocket(rand(W * .15, W * .85), rand(H * .15, H * .45)), 500 + i * 420);
  setTimeout(() => { confetti(0, H, 90, 1, 22); confetti(W, H, 90, 1, 22); }, 900);
  setTimeout(() => { confetti(W / 2, H * .9, 120, 1.3, 24); }, 2500);
  setTimeout(() => heartRain(7000), 1500);
  setTimeout(() => { for (let i = 0; i < 3; i++) setTimeout(() => rocket(rand(W * .2, W * .8), rand(H * .2, H * .4)), i * 500); }, 5200);
  navigator.vibrate?.([60, 40, 60, 40, 120]);
}

async function sayWait() {
  if ($('#s-wait').classList.contains('active')) return;
  $('#wa-wait').href = waLink(CONFIG.msgWait);
  setMode(true); amb.energy = 1;
  go('s-wait');
  // une pluie douce d'étincelles dorées, comme des lucioles
  const end = performance.now() + 5000;
  const t = setInterval(() => { if (performance.now() > end) return clearInterval(t); sparkle(rand(0, W), rand(H * .2, H)); sparkle(rand(0, W), rand(H * .2, H)); }, 120);
}

$('#btn-open').addEventListener('click', () => open(true));
$('#btn-open-quiet').addEventListener('click', () => open(false));
$('#btn-yes').addEventListener('click', sayYes);
$('#btn-wait').addEventListener('click', sayWait);
$('#btn-change').addEventListener('click', sayYes);

photosReady.then(buildBubbles);
