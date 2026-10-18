/* Platformer engine. Running skill never affects answering: no lives, no timers, instant respawn, and a skip control. */
(function () {
  const QP = window.QP, el = QP.el;
  const UI = {
    docTitle: '{title}: {level}', guide: 'Your runner', start: 'Start running', submit: 'Answer', skip: 'Skip this one',
    textPlaceholder: 'Type your answer here', checkpoint: 'Checkpoint {n} of {total}', starGot: 'Star collected!',
    quote: '{name}: "{line}"', keepRunning: 'Keep running', finishRun: 'Run to the finish', levelClear: 'Level clear!',
    starsTotal: 'Stars collected: {n} of {total}', thanks: 'Thank you for running with us.', skipped: 'Skipped',
    restart: 'Run the level again',
    skipRun: 'Skip the running', help: 'Arrow keys or A and D to run. Space or W to jump.', jump: 'Jump', left: 'Run left', right: 'Run right',
    respawn: 'Back at the last checkpoint.', starEarned: 'Star {n} collected', starMissing: 'Star {n} not collected yet',
    canvasRun: '{level}. {name} is running toward {next}. Use the arrow keys to run and Space to jump, or press Skip the running.',
    canvasPaused: '{level}. The game is paused.', canvasDone: '{level}. {name} reached the finish.', finish: 'the finish arch'
  };

  const WORLD_H = 300, GROUND = 236, GRAV = 0.62, SPEED = 3.4, JUMP = 11.6, PW = 24, PH = 44, SEG = 640;

  const THEMES = {
    rooftops: {
      day: { sky: ['#9ED8FF', '#E8F6FF'], far: '#B7C7DC', near: '#8297B4', top: '#B4553A', body: '#7A3D2C', plat: '#5D6B7A', accent: '#F2B33D' },
      dusk: { sky: ['#FF9E7A', '#6A4C93'], far: '#7D5A8C', near: '#5B416E', top: '#9A4E3C', body: '#4E2A26', plat: '#3F4A5A', accent: '#FFD166' }
    },
    jungle: {
      day: { sky: ['#BDEBC0', '#F1FADF'], far: '#8CC08A', near: '#5E9A5A', top: '#6FB54A', body: '#7A5233', plat: '#8A5A34', accent: '#FF8A5B' },
      dusk: { sky: ['#F7B267', '#4F6D4A'], far: '#5E7E52', near: '#3F5E3A', top: '#4F8A3A', body: '#4E3522', plat: '#6B4428', accent: '#FFD166' }
    },
    candy: {
      day: { sky: ['#FFD6EC', '#DDF3FF'], far: '#F7B5D2', near: '#C9A6F2', top: '#FFF5F9', body: '#E8A86B', plat: '#7FD1C2', accent: '#FF5C8A' },
      dusk: { sky: ['#C77DFF', '#FF8FAB'], far: '#A05BB7', near: '#7B4AA0', top: '#FFE0F0', body: '#B9774A', plat: '#4FB3A5', accent: '#FFD166' }
    },
    // Business setting: counters to run along, baking trays as ledges, shelves and ovens behind
    bakery: {
      day: { sky: ['#FBE3D3', '#FFF6EE'], far: '#EBC4AE', near: '#D99A84', top: '#7A4E2D', body: '#C88A55', plat: '#B8C2CC', accent: '#E85D75' },
      dusk: { sky: ['#E8A87C', '#6B3F4E'], far: '#A4635C', near: '#7E4A4C', top: '#5E3A22', body: '#8E5A36', plat: '#9AA5B1', accent: '#FFD166' }
    },
    space: {
      day: { sky: ['#3B5BA8', '#8FA8E8'], far: '#6A7FC4', near: '#4A5E9E', top: '#C9D2E3', body: '#7E889E', plat: '#E1E6F0', accent: '#FFD23F' },
      dusk: { sky: ['#0E0B2B', '#33205A'], far: '#3A2A6B', near: '#2A1E52', top: '#A9B0C6', body: '#5E6680', plat: '#C3C9D9', accent: '#FFD23F' }
    }
  };

  const $ = s => document.querySelector(s);
  const canvas = $('#canvas'), ctx = canvas.getContext('2d'), overlay = $('#overlay'), panel = $('#panel'), after = $('#after');
  let C, ui, session, T, rand, N = 0;
  let state = 'intro', cps = [], goalX = 0, worldW = 0, grounds = [], plats = [], far = [], near = [], stars = [];
  let player, keys = { left: false, right: false, jumpHeld: false }, jumpAt = -1, coyote = 0, lastSafe = 60, camX = 0;
  let frame = 0, particles = [], nextIdx = 0, freshStar = -1, cheerT = 0, blink = 0;
  let dpr = 1, cssW = 0, cssH = 0, scale = 1, viewW = 0, offY = 0, lastT = 0;
  // How far down the ground is drawn: past the level's bottom when the level is lifted above touch controls (resize).
  let floorY = WORLD_H;

  // A business setting (config.setting) replaces the AI's level theme with that setting's scenery.
  // Settings without hand-drawn scenery use their banner (core/banners.js) as a scrolling backdrop.
  // A palette picked in the builder recolours the setting, so a setting with its own hand-drawn theme uses the backdrop instead.
  const themeName = () => { const s = QP.scenes.of(C); return s ? (THEMES[s] && !C.palette ? s : 'backdrop') : C.level.theme; };
  let backdrop = null;
  // Level colours from a setting's (or a palette's) colours in core/scenes.js.
  function styleTheme(st) {
    const [top, body, plat] = st.run;
    return { sky: [st.page[0], st.page[0]], far: st.page[1], near: st.page[1], top, body, plat, accent: st.page[5] };
  }
  /* The banner tiles across the level, mirrored every other copy so the edges meet. The whole banner, floor included, sits
     above the ground, so the room reads as standing behind the ledges and its furniture is never cut off by them.
     The gaps between ledges show a shadowed drop in the ground colour, not the banner. */
  function drawBackdrop(shift) {
    if (!backdrop || !backdrop.complete || !backdrop.naturalWidth) return;
    const w = 800 * GROUND / 200;
    for (let i = Math.floor(shift / w); i * w - shift < viewW; i++) {
      ctx.save(); ctx.translate(i * w - shift + (i % 2 ? w : 0), 0); if (i % 2) ctx.scale(-1, 1);
      ctx.drawImage(backdrop, 0, 0, w + 1, GROUND); ctx.restore();
    }
    ctx.fillStyle = C.level.palette === 'dusk' ? 'rgba(40,20,70,.38)' : 'rgba(255,255,255,.2)';
    ctx.fillRect(0, 0, viewW, GROUND);
    const pit = ctx.createLinearGradient(0, GROUND, 0, WORLD_H);
    pit.addColorStop(0, 'rgba(20,14,10,.55)'); pit.addColorStop(1, 'rgba(20,14,10,.8)');
    ctx.fillStyle = T.body; ctx.fillRect(0, GROUND, viewW, floorY - GROUND + 40);
    ctx.fillStyle = pit; ctx.fillRect(0, GROUND, viewW, floorY - GROUND + 40);
  }

  /* ---------- level ---------- */
  function buildLevel() {
    rand = QP.seeded(C.id + themeName());
    N = C.questions.length;
    cps = C.questions.map((q, i) => ({ x: 560 + i * SEG, done: false }));
    goalX = 560 + N * SEG - 80;
    worldW = goalX + 380;
    grounds = []; plats = [];
    const keyX = [60, ...cps.map(c => c.x), goalX];
    let cursor = -400;
    for (let s = 0; s < keyX.length - 1; s++) {
      const a = keyX[s], b = keyX[s + 1], mid = (a + b) / 2;
      const pattern = s === 0 ? 0 : Math.floor(rand() * 4);
      if (pattern === 0) {
        const w = 62 + rand() * 18;
        grounds.push([cursor, mid - w / 2]); cursor = mid + w / 2;
        plats.push({ x: mid - 170 + rand() * 40, y: GROUND - 72, w: 92 });
      } else if (pattern === 1) {
        grounds.push([cursor, mid - 75]); cursor = mid + 75;
        plats.push({ x: mid - 40, y: GROUND - 56, w: 80 });
      } else if (pattern === 2) {
        const p1 = a + (b - a) * .36, p2 = a + (b - a) * .64, w1 = 58 + rand() * 16, w2 = 58 + rand() * 16;
        grounds.push([cursor, p1 - w1 / 2]); grounds.push([p1 + w1 / 2, p2 - w2 / 2]); cursor = p2 + w2 / 2;
        plats.push({ x: (p1 + p2) / 2 - 50, y: GROUND - 84, w: 100 });
      } else {
        grounds.push([cursor, mid - 100]); cursor = mid + 100;
        plats.push({ x: mid - 95, y: GROUND - 50, w: 70 }); plats.push({ x: mid + 25, y: GROUND - 96, w: 70 });
      }
    }
    grounds.push([cursor, worldW + 400]);
    far = []; near = []; stars = [];
    for (let x = -100; x < worldW * .3 + 1600; x += 70 + rand() * 90) far.push({ x, w: 46 + rand() * 50, h: 50 + rand() * 100, k: rand() });
    for (let x = 0; x < worldW * .6 + 1600; x += 160 + rand() * 220) near.push({ x, k: rand(), h: rand() });
    for (let i = 0; i < 70; i++) stars.push({ x: rand(), y: rand() * .75, r: rand() * 1.4 + .4 });
  }

  /* ---------- drawing helpers ---------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function starPath(c, x, y, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * .45 : r;
      c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }

  function drawRunner(c, x, y, look, pose, t, facing) {
    c.save(); c.translate(x, y); c.scale(facing || 1, 1);
    c.lineWidth = 2.2; c.strokeStyle = '#1D1D2B'; c.lineJoin = 'round'; c.lineCap = 'round';
    const run = pose === 'run', air = pose === 'jump', cheer = pose === 'cheer';
    const sw = run ? Math.sin(t * .42) : 0;
    const box = (x0, y0, w, h, r, fill) => { c.fillStyle = fill; c.beginPath(); c.moveTo(x0 + r, y0); c.arcTo(x0 + w, y0, x0 + w, y0 + h, r); c.arcTo(x0 + w, y0 + h, x0, y0 + h, r); c.arcTo(x0, y0 + h, x0, y0, r); c.arcTo(x0, y0, x0 + w, y0, r); c.closePath(); c.fill(); c.stroke(); };
    // legs
    box(-8 + (air ? -3 : sw * 4), -15, 7, air ? 11 : 15, 3, '#2B2D42');
    box(1 + (air ? 3 : -sw * 4), -15, 7, air ? 11 : 15, 3, '#2B2D42');
    // scarf tail
    c.fillStyle = look.accentColor;
    c.beginPath(); c.moveTo(-8, -31); c.quadraticCurveTo(-18, -30 + sw * 2, -21, -24 + sw * 3); c.lineTo(-15, -26); c.closePath(); c.fill(); c.stroke();
    // body + scarf
    box(-11, -33, 22, 20, 7, look.bodyColor);
    box(-11, -33, 22, 6, 3, look.accentColor);
    if (look.apron) { box(-8, -27, 16, 14, 3, '#FFFFFF'); c.fillStyle = look.accentColor; c.fillRect(-4, -21, 8, 2.5); }
    // arms
    if (cheer) { box(-17, -50, 6, 16, 3, look.bodyColor); box(11, -50, 6, 16, 3, look.bodyColor); }
    else { box(9 - sw * 3, -29, 6, 13, 3, look.bodyColor); }
    // head
    c.fillStyle = look.skinTone; c.beginPath(); c.arc(0, -43, 11, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#1D1D2B';
    c.beginPath(); c.ellipse(5, -44, 1.7, 2.5, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(-1.5, -44, 1.7, 2.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,110,110,.35)'; c.beginPath(); c.arc(7.5, -39.5, 2.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.lineWidth = 1.8; c.arc(2, -40, 3.6, .25 * Math.PI, .85 * Math.PI); c.stroke(); c.lineWidth = 2.2;
    // headgear
    const a = look.accentColor;
    if (look.headgear === 'beanie') {
      c.fillStyle = a; c.beginPath(); c.arc(0, -46, 11.6, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      box(-12, -49, 24, 5, 2.5, a); c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(0, -59, 3.6, 0, Math.PI * 2); c.fill(); c.stroke();
    } else if (look.headgear === 'helmet') {
      c.fillStyle = a; c.beginPath(); c.arc(0, -45, 13, Math.PI * 1.05, -.05 * Math.PI); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#FFFFFF'; c.beginPath(); c.moveTo(-2, -49); c.lineTo(10, -49); c.stroke(); c.strokeStyle = '#1D1D2B';
    } else if (look.headgear === 'headband') {
      box(-11.5, -51, 23, 5, 2.5, a);
      c.fillStyle = a; c.beginPath(); c.moveTo(-11, -49); c.lineTo(-21, -45 + sw * 2); c.lineTo(-19, -51); c.closePath(); c.fill(); c.stroke();
    } else if (look.headgear === 'toque') {
      c.fillStyle = '#FFFFFF';
      [[-7, -61, 6.5], [7, -61, 6.5], [0, -65, 8]].forEach(([px, py, pr]) => { c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill(); c.stroke(); });
      c.beginPath(); c.arc(0, -61, 6, 0, Math.PI * 2); c.fill();
      box(-10, -57, 20, 8, 2, '#FFFFFF');
    } else if (look.headgear === 'cap') {
      c.fillStyle = a; c.beginPath(); c.arc(0, -46, 11.2, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      box(6, -48, 11, 3.5, 1.5, a);
    } else {
      c.fillStyle = '#2B1A12'; c.beginPath(); c.arc(0, -46, 11, Math.PI * 1.05, -.05 * Math.PI); c.quadraticCurveTo(4, -50, -6, -47); c.closePath(); c.fill();
    }
    c.restore();
  }

  function runnerPortrait() {
    const cv = el('canvas', { width: '240', height: '280', role: 'img', 'aria-label': C.runner.name });
    const c = cv.getContext('2d');
    c.scale(3.6, 3.6);
    drawRunner(c, 33, 76, C.runner.look, 'cheer', 0, 1);
    return cv;
  }

  /* Each theme draws its far and near scenery, ground and ledges. */
  function drawScenery(p) {
    const theme = themeName(), k = .3, n = .6;
    if (theme === 'backdrop') return drawBackdrop(camX * k);
    ctx.save(); ctx.translate(-camX * k, 0);
    ctx.fillStyle = p.far;
    far.forEach(b => {
      const sx = b.x * 1;
      if (sx - camX * k > viewW + 120 || sx + b.w - camX * k < -120) return;
      if (theme === 'rooftops') {
        ctx.fillRect(sx, GROUND - b.h, b.w, b.h + 40);
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        for (let wy = GROUND - b.h + 10; wy < GROUND - 8; wy += 16) for (let wx = sx + 7; wx < sx + b.w - 9; wx += 14) if ((wx * 7 + wy * 3) % 5 > 1) ctx.fillRect(wx, wy, 5, 7);
        ctx.fillStyle = p.far;
      } else if (theme === 'jungle') {
        circle(sx + b.w / 2, GROUND - b.h * .6, b.w * .7); ctx.fill();
        circle(sx + b.w, GROUND - b.h * .45, b.w * .55); ctx.fill();
      } else if (theme === 'candy') {
        circle(sx + b.w / 2, GROUND + 20, b.w + b.h * .5); ctx.fill();
      } else if (theme === 'bakery') {
        const top = GROUND - 40 - b.h * .7, w = b.w + 30;
        if (b.k > .7) { // brick oven with a warm glow
          ctx.fillRect(sx, top, w, GROUND - top);
          ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let y = top + 12; y < GROUND; y += 12) ctx.fillRect(sx, y, w, 1.5);
          ctx.fillStyle = 'rgba(60,28,18,.7)'; ctx.beginPath(); ctx.arc(sx + w / 2, GROUND, w * .32, Math.PI, 0); ctx.fill();
          ctx.fillStyle = 'rgba(255,170,70,.85)'; ctx.beginPath(); ctx.ellipse(sx + w / 2, GROUND, w * .2, w * .1, 0, Math.PI, 0); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(sx + w / 2 - 6, top - 22, 12, 22);
        } else { // bread shelves
          ctx.fillRect(sx, top, 4, GROUND - top); ctx.fillRect(sx + w - 4, top, 4, GROUND - top);
          for (let y = top + 4; y < GROUND - 10; y += 30) {
            ctx.fillRect(sx, y + 22, w, 4);
            ctx.fillStyle = 'rgba(255,255,255,.4)';
            for (let lx = sx + 10; lx < sx + w - 8; lx += 16) { ctx.beginPath(); ctx.ellipse(lx, y + 17, 7, 5, 0, Math.PI, 0); ctx.fill(); }
            ctx.fillStyle = p.far;
          }
        }
      } else {
        if (b.k > .72) { circle(sx + b.w / 2, GROUND - 120 - b.h * .4, 12 + b.w * .25); ctx.fill();
          ctx.strokeStyle = p.near; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx + b.w / 2, GROUND - 120 - b.h * .4, 26 + b.w * .3, 6, -.3, 0, Math.PI * 2); ctx.stroke(); }
        else { ctx.beginPath(); ctx.ellipse(sx + b.w / 2, GROUND + 6, b.w, 22 + b.h * .2, 0, Math.PI, 0); ctx.fill(); }
      }
    });
    ctx.restore();

    ctx.save(); ctx.translate(-camX * n, 0);
    near.forEach(d => {
      const x = d.x;
      if (x - camX * n > viewW + 120 || x - camX * n < -160) return;
      ctx.fillStyle = p.near; ctx.strokeStyle = p.near;
      if (theme === 'rooftops') {
        /* Water towers and aerials stand on a lower building of their own that runs down past the bottom of the view,
           so where a gap between the rooftops passes in front of them they never hang in the air. */
        const roof = GROUND - 22, wall = floorY - roof + 40;
        if (d.k > .5) {
          ctx.fillRect(x - 18, roof, 76, wall);
          ctx.fillRect(x, roof - 90, 4, 90); ctx.fillRect(x + 36, roof - 90, 4, 90); rr(x - 6, roof - 130, 52, 44, 8); ctx.fill(); ctx.fillRect(x + 2, roof - 138, 36, 10);
        } else {
          ctx.fillRect(x - 16, roof, 34, wall);
          ctx.fillRect(x, roof - 112, 3, 112); ctx.fillRect(x - 12, roof - 104, 27, 3); ctx.fillRect(x - 8, roof - 90, 19, 3);
        }
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - (d.k > .5 ? 18 : 16), roof, d.k > .5 ? 76 : 34, 3);
      } else if (theme === 'jungle') {
        ctx.fillRect(x + 18, GROUND - 120, 12, 120);
        circle(x + 24, GROUND - 130, 34); ctx.fill(); circle(x, GROUND - 112, 22); ctx.fill(); circle(x + 50, GROUND - 110, 24); ctx.fill();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 40, GROUND - 100); ctx.quadraticCurveTo(x + 46, GROUND - 60, x + 40, GROUND - 40); ctx.stroke();
      } else if (theme === 'bakery') {
        if (d.k > .5) { // tiered cake on a stand
          ctx.fillRect(x + 22, GROUND - 40, 5, 40); ctx.fillRect(x + 6, GROUND - 44, 38, 5);
          rr(x + 8, GROUND - 70, 34, 26, 4); ctx.fill(); rr(x + 14, GROUND - 88, 22, 18, 4); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 8, GROUND - 62, 34, 3); ctx.fillRect(x + 14, GROUND - 82, 22, 3);
          ctx.fillStyle = p.accent; circle(x + 25, GROUND - 92, 4); ctx.fill();
        } else { // flour sacks
          ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.quadraticCurveTo(x - 4, GROUND - 30, x + 6, GROUND - 40); ctx.lineTo(x + 30, GROUND - 40); ctx.quadraticCurveTo(x + 40, GROUND - 30, x + 36, GROUND); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x + 30, GROUND); ctx.quadraticCurveTo(x + 27, GROUND - 22, x + 36, GROUND - 28); ctx.lineTo(x + 54, GROUND - 28); ctx.quadraticCurveTo(x + 62, GROUND - 20, x + 58, GROUND); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 12, GROUND - 26, 12, 3);
        }
      } else if (theme === 'candy') {
        if (d.k > .5) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + 10, GROUND - 90, 4, 90); ctx.fillStyle = p.near; circle(x + 12, GROUND - 100, 18); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x + 12, GROUND - 100, 10, 0, Math.PI * 1.4); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(x + 20, GROUND, 22, Math.PI, 0); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; circle(x + 13, GROUND - 13, 4); ctx.fill(); }
      } else {
        if (d.k > .5) { ctx.fillRect(x + 10, GROUND - 70, 4, 70); ctx.beginPath(); ctx.ellipse(x + 12, GROUND - 76, 20, 9, -.5, 0, Math.PI); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(x + 30, GROUND, 40, 18, 0, Math.PI, 0); ctx.fill(); }
      }
    });
    ctx.restore();
  }

  function drawGround(p) {
    const theme = themeName();
    grounds.forEach(([a, b]) => {
      if (b < camX - 40 || a > camX + viewW + 40) return;
      const x0 = Math.max(a, camX - 40), x1 = Math.min(b, camX + viewW + 40);
      ctx.fillStyle = p.body; ctx.fillRect(x0, GROUND, x1 - x0, floorY - GROUND + 4);
      ctx.fillStyle = 'rgba(0,0,0,.13)';
      if (theme === 'bakery') { // counter cupboards with knobs
        for (let x = Math.ceil(x0 / 56) * 56; x < x1; x += 56) { ctx.fillRect(x, GROUND + 18, 2, floorY - GROUND); ctx.fillRect(x + 22, GROUND + 34, 10, 4); }
      } else if (theme === 'rooftops') {
        for (let y = GROUND + 22; y < floorY; y += 14) { ctx.fillRect(x0, y, x1 - x0, 2); for (let x = Math.ceil(x0 / 28) * 28 + ((y / 14) % 2) * 14; x < x1; x += 28) ctx.fillRect(x, y - 12, 2, 12); }
      } else if (theme === 'space' || theme === 'candy') {
        for (let x = Math.ceil(x0 / 46) * 46; x < x1; x += 46) { ctx.beginPath(); ctx.ellipse(x + 10, GROUND + 30 + (x % 3) * 9, theme === 'space' ? 8 : 3, theme === 'space' ? 4 : 3, 0, 0, Math.PI * 2); ctx.fill(); }
      } else {
        for (let x = Math.ceil(x0 / 34) * 34; x < x1; x += 34) ctx.fillRect(x, GROUND + 26 + (x % 4) * 6, 8, 4);
      }
      ctx.fillStyle = p.top; ctx.fillRect(a, GROUND, b - a, 11);
      ctx.strokeStyle = '#1D1D2B'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(a, floorY + 4); ctx.lineTo(a, GROUND); ctx.lineTo(b, GROUND); ctx.lineTo(b, floorY + 4); ctx.stroke();
      if (theme === 'jungle') { ctx.fillStyle = p.top; for (let x = Math.ceil(a / 18) * 18; x < b - 8; x += 18) { ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 4, GROUND - 7); ctx.lineTo(x + 8, GROUND); ctx.fill(); } }
      if (theme === 'candy') { ctx.fillStyle = p.top; for (let x = Math.ceil(a / 24) * 24 + 6; x < b - 10; x += 24) { circle(x, GROUND + 11, 5); ctx.fill(); } }
    });
    plats.forEach(pl => {
      if (pl.x + pl.w < camX - 20 || pl.x > camX + viewW + 20) return;
      ctx.fillStyle = p.plat; ctx.strokeStyle = '#1D1D2B'; ctx.lineWidth = 2.5;
      rr(pl.x, pl.y, pl.w, 15, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(pl.x + 6, pl.y + 3, pl.w - 12, 3);
      if (theme === 'jungle') { ctx.fillStyle = 'rgba(0,0,0,.18)'; circle(pl.x + 8, pl.y + 8, 4); ctx.fill(); circle(pl.x + pl.w - 8, pl.y + 8, 4); ctx.fill(); }
      if (theme === 'bakery') {
        ctx.fillStyle = '#D9963F'; ctx.strokeStyle = '#1D1D2B'; ctx.lineWidth = 2;
        [pl.w * .3, pl.w * .7].forEach(dx => { ctx.beginPath(); ctx.ellipse(pl.x + dx, pl.y - 1, 9, 6, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); });
      }
      if (theme === 'rooftops' || theme === 'space') { ctx.fillStyle = 'rgba(0,0,0,.3)'; [10, pl.w - 12].forEach(dx => { circle(pl.x + dx, pl.y + 10, 1.8); ctx.fill(); }); }
    });
  }

  function drawCheckpoints(p) {
    cps.forEach((cp, i) => {
      if (cp.x < camX - 60 || cp.x > camX + viewW + 60) return;
      ctx.fillStyle = '#2B2D42'; ctx.fillRect(cp.x - 3, GROUND - 74, 6, 74);
      ctx.save();
      if (cp.done) { ctx.shadowColor = '#FFD23F'; ctx.shadowBlur = 16; }
      ctx.fillStyle = cp.done ? '#FFD23F' : '#FFFFFF'; ctx.strokeStyle = '#1D1D2B'; ctx.lineWidth = 2.5;
      rr(cp.x - 17, GROUND - 100, 34, 28, 6); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#1D1D2B'; ctx.font = '16px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), cp.x, GROUND - 85);
      if (!cp.done && i === nextIdx) {
        const bob = QP.reducedMotion() ? 0 : Math.sin(frame / 14) * 4;
        ctx.fillStyle = p.accent; ctx.strokeStyle = '#1D1D2B'; ctx.lineWidth = 2.5;
        starPath(ctx, cp.x, GROUND - 126 + bob, 13); ctx.fill(); ctx.stroke();
      }
    });
  }

  function drawGoal(p) {
    if (goalX < camX - 120 || goalX > camX + viewW + 120) return;
    const top = GROUND - 112, colors = [p.accent, '#FFFFFF'];
    ctx.strokeStyle = '#1D1D2B'; ctx.lineWidth = 2.5;
    [-50, 38].forEach(dx => { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(goalX + dx, top, 12, GROUND - top); ctx.strokeRect(goalX + dx, top, 12, GROUND - top); });
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = colors[i % 2]; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.arc(goalX, top, 44, Math.PI + i * Math.PI / 8, Math.PI + (i + 1) * Math.PI / 8); ctx.stroke();
    }
    ctx.strokeStyle = '#1D1D2B'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(goalX, top, 51, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(goalX, top, 37.5, Math.PI, 0); ctx.stroke();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? p.accent : '#2853B8'; ctx.beginPath(); ctx.moveTo(goalX - 38 + i * 13, top + 2); ctx.lineTo(goalX - 25 + i * 13, top + 2); ctx.lineTo(goalX - 31.5 + i * 13, top + 14); ctx.closePath(); ctx.fill(); }
  }

  function render() {
    const p = T;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, cssH);
    g.addColorStop(0, p.sky[0]); g.addColorStop(1, p.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, cssW, cssH);
    if (themeName() === 'bakery') { ctx.fillStyle = 'rgba(255,255,255,.22)'; const off = (camX * scale * .1) % 44; for (let x = -off; x < cssW; x += 44) ctx.fillRect(x, 0, 22, cssH); }
    if (themeName() === 'space') { ctx.fillStyle = 'rgba(255,255,255,.8)'; stars.forEach(s => { ctx.beginPath(); ctx.arc(s.x * cssW, s.y * cssH, s.r, 0, Math.PI * 2); ctx.fill(); }); }
    ctx.save();
    ctx.translate(0, offY); ctx.scale(scale, scale);
    drawScenery(p);
    ctx.translate(-camX, 0);
    drawGround(p); drawCheckpoints(p); drawGoal(p);
    if (!(blink > 0 && Math.floor(blink / 4) % 2)) {
      const pose = state === 'end' ? 'cheer' : !player.onGround ? 'jump' : (keys.left || keys.right) && state === 'run' ? 'run' : 'idle';
      drawRunner(ctx, player.x + PW / 2, player.y + PH + (state === 'end' && !QP.reducedMotion() ? -Math.abs(Math.sin(cheerT / 10)) * 14 : 0), C.runner.look, pose, frame, player.facing);
    }
    particles.forEach(pt => { ctx.fillStyle = pt.c; ctx.globalAlpha = Math.max(0, pt.life / pt.max); ctx.fillRect(pt.x, pt.y, pt.s, pt.s); });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ---------- physics ---------- */
  function update(dt, now) {
    frame += dt;
    particles = particles.filter(pt => (pt.life -= dt) > 0);
    particles.forEach(pt => { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += .25 * dt; });
    if (blink > 0) blink -= dt;
    if (state === 'end') { cheerT += dt; return; }
    if (state !== 'run') return;

    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir) player.facing = dir;
    player.x = Math.max(8, player.x + dir * SPEED * dt);
    if (nextIdx < N && player.x + PW > cps[nextIdx].x - 4) {
      player.x = cps[nextIdx].x - 4 - PW;
      openQuestion(nextIdx);
      return;
    } else if (nextIdx >= N && player.x + PW / 2 >= goalX) {
      reachGoal();
      return;
    }

    coyote = player.onGround ? 6 : coyote - dt;
    if (jumpAt >= 0 && now - jumpAt < 150 && coyote > 0) { player.vy = -JUMP; player.onGround = false; coyote = 0; jumpAt = -1; }
    if (!keys.jumpHeld && player.vy < -5) player.vy = -5;
    player.vy = Math.min(13, player.vy + GRAV * dt);
    const prevBottom = player.y + PH;
    player.y += player.vy * dt;
    player.onGround = false;
    if (player.vy >= 0) {
      const bottom = player.y + PH, l = player.x + 4, r = player.x + PW - 4;
      const land = top => { player.y = top - PH; player.vy = 0; player.onGround = true; };
      for (const [a, b] of grounds) if (r > a && l < b && prevBottom <= GROUND + 1 && bottom >= GROUND) land(GROUND);
      for (const pl of plats) if (r > pl.x && l < pl.x + pl.w && prevBottom <= pl.y + 1 && bottom >= pl.y) land(pl.y);
    }
    if (player.y > WORLD_H + 60) respawn();
    const target = Math.max(0, Math.min(worldW - viewW, player.x - viewW * .36));
    camX = QP.reducedMotion() ? target : camX + (target - camX) * Math.min(1, .14 * dt);
  }

  function placePlayer(x) {
    player.x = x; player.y = GROUND - PH; player.vy = 0; player.onGround = true;
    camX = Math.max(0, Math.min(worldW - viewW, player.x - viewW * .36));
  }

  function respawn() {
    placePlayer(lastSafe);
    blink = QP.reducedMotion() ? 0 : 36;
    announce(ui.respawn);
  }

  function burst(x, y, colors, count, spread) {
    if (QP.reducedMotion()) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * spread;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2.5, s: 3 + Math.random() * 3, c: colors[i % colors.length], life: 50 + Math.random() * 30, max: 80 });
    }
  }

  function loop(now) {
    const dt = Math.min(2.5, (now - (lastT || now)) / 16.667);
    lastT = now;
    if (C) { update(dt, now); render(); }
    requestAnimationFrame(loop);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1; cssW = r.width; cssH = r.height;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    scale = Math.min(cssH / WORLD_H, cssW / 440);
    // Touch controls sit over the bottom of the level. When the box is taller than the level (a phone held upright),
    // the level is lifted so they cover only ground, never the runner; held sideways the level fills the box and they sit on the ground.
    const spare = cssH - WORLD_H * scale, lift = document.documentElement.classList.contains('touch') ? Math.min(84, Math.max(0, spare)) : 0;
    viewW = cssW / scale; offY = spare - lift; floorY = WORLD_H + lift / scale;
    if (player) camX = Math.max(0, Math.min(worldW - viewW, player.x - viewW * .36));
  }

  /* ---------- input ---------- */
  const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump' };
  window.addEventListener('keydown', e => {
    if (!overlay.hidden && e.key === 'Tab') return trapFocus(e);
    const k = KEYMAP[e.key];
    if (!k || state !== 'run') return;
    const tag = e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') return;
    if (e.key === ' ' && (tag === 'BUTTON' || tag === 'SUMMARY' || tag === 'A')) return;
    e.preventDefault();
    if (k === 'jump') { if (!e.repeat) { jumpAt = performance.now(); keys.jumpHeld = true; } }
    else keys[k] = true;
  });
  window.addEventListener('keyup', e => {
    const k = KEYMAP[e.key];
    if (k === 'jump') keys.jumpHeld = false; else if (k) keys[k] = false;
  });
  window.addEventListener('blur', () => { keys.left = keys.right = keys.jumpHeld = false; });

  document.querySelectorAll('.ctl').forEach(btn => {
    const k = btn.dataset.key;
    const press = () => { if (state !== 'run') return; btn.classList.add('on'); if (k === 'jump') { jumpAt = performance.now(); keys.jumpHeld = true; } else keys[k] = true; };
    const release = () => { btn.classList.remove('on'); if (k === 'jump') keys.jumpHeld = false; else keys[k] = false; };
    btn.addEventListener('pointerdown', e => { e.preventDefault(); btn.setPointerCapture(e.pointerId); press(); });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('click', e => { if (e.detail === 0) { press(); setTimeout(release, k === 'jump' ? 220 : 260); } });
  });
  $('#skipRun').addEventListener('click', skipRunning);

  /* On touch screens the run and jump controls and Skip sit on the level itself, and the level fits the screen
     (styles under .touch), so nothing needs a scroll while playing. A mouse and keyboard keep them below the level. */
  const touch = window.matchMedia('(pointer: coarse)');
  function placeControls() {
    document.documentElement.classList.toggle('touch', touch.matches);
    if (touch.matches) $('#game').append($('#controls'), $('#skipRun'));
    else { $('.wrap').insertBefore($('#controls'), $('#assist')); $('#assist').prepend($('#skipRun')); }
  }
  placeControls();
  touch.addEventListener('change', () => { placeControls(); resize(); });
  // Running starts with the whole level on screen.
  function fitLevel() {
    if (!touch.matches) return;
    const r = $('#game').getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) $('#game').scrollIntoView({ behavior: QP.reducedMotion() ? 'auto' : 'smooth', block: 'center' });
  }

  function trapFocus(e) {
    const f = [...panel.querySelectorAll('button:not([disabled]), textarea, audio[controls], summary, [tabindex="0"]')];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }

  function setControls(enabled) {
    document.querySelectorAll('.ctl, #skipRun').forEach(b => { b.disabled = !enabled; });
  }

  /* ---------- screens ---------- */
  const announce = t => { $('#announce').textContent = t; };
  function setCanvasLabel() {
    const next = nextIdx < N ? C.questions[nextIdx].checkpointName : ui.finish;
    canvas.setAttribute('aria-label', QP.fill(state === 'run' ? ui.canvasRun : state === 'end' ? ui.canvasDone : ui.canvasPaused,
      { level: C.level.name || C.title, name: C.runner.name, next }));
  }

  function showPanel(kids, focusSel) {
    panel.innerHTML = '';
    panel.append(...kids.flat());
    overlay.hidden = false;
    setControls(false);
    setCanvasLabel();
    const target = focusSel ? panel.querySelector(focusSel) : panel.querySelector('button, textarea');
    if (target) target.focus({ preventScroll: true });
  }
  function closePanel() {
    overlay.hidden = true;
    state = 'run';
    setControls(true);
    setCanvasLabel();
    canvas.focus({ preventScroll: true });
    fitLevel();
  }

  const starIcon = () => { const d = document.createElement('div'); d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" fill="#F2B33D" stroke="#1D1D2B" stroke-width="1.6" stroke-linejoin="round"/></svg>'; return d.firstElementChild; };

  function renderStars() {
    const bar = $('#stars');
    bar.innerHTML = '';
    C.questions.forEach((q, i) => {
      const on = session.has(q.id);
      const li = el('li', { class: (on ? 'on' : 'off') + (freshStar === i ? ' fresh' : ''), 'aria-label': QP.fill(on ? ui.starEarned : ui.starMissing, { n: i + 1 }) }, starIcon());
      bar.append(li);
    });
    bar.setAttribute('aria-label', QP.fill(ui.starsTotal, { n: session.count(), total: N }));
    freshStar = -1;
  }

  function renderIntro() {
    state = 'intro';
    const r = C.runner;
    showPanel([
      el('div', { class: 'who' }, runnerPortrait(), el('div', {}, el('b', { id: 'panelTitle' }, r.name), el('span', {}, C.level.name || ui.guide))),
      r.introLine ? el('p', { class: 'quip' }, r.introLine) : '',
      C.intro.map(p => el('p', {}, p)),
      el('div', { class: 'actions' }, el('button', { class: 'primary', onclick: () => { session.start(); closePanel(); } }, ui.start))
    ]);
  }

  function openQuestion(i) {
    state = 'question';
    keys.left = keys.right = keys.jumpHeld = false; jumpAt = -1;
    const q = C.questions[i];
    session.begin();
    const form = QP.questionForm(q, ui, value => answered(q, i, value));
    showPanel([
      el('p', { class: 'tag' }, QP.fill(ui.checkpoint, { n: i + 1, total: N })),
      el('h2', { id: 'panelTitle' }, q.checkpointName),
      el('p', { class: 'prompt', id: 'prompt' }, q.prompt),
      form.control, form.actions
    ]);
  }

  function answered(q, i, value) {
    session.answer(q, value);
    cps[i].done = true; nextIdx = i + 1; lastSafe = cps[i].x + 12; freshStar = i;
    renderStars();
    burst(cps[i].x, GROUND - 126, [T.accent, '#FFFFFF', '#FFD23F'], 26, 3);
    const last = i === N - 1;
    showPanel([
      el('p', { class: 'tag' }, QP.fill(ui.checkpoint, { n: i + 1, total: N })),
      el('h2', { id: 'panelTitle' }, q.checkpointName),
      el('div', { class: 'cheer', role: 'status' }, starIcon(), el('p', {}, el('b', {}, ui.starGot), ' ', QP.fill(ui.quote, { name: C.runner.name, line: q.cheerLine }))),
      el('div', { class: 'actions' }, el('button', { class: 'primary', onclick: closePanel }, last ? ui.finishRun : ui.keepRunning))
    ]);
    state = 'cheer';
  }

  function skipRunning() {
    if (state !== 'run') return;
    if (nextIdx < N) { placePlayer(cps[nextIdx].x - 4 - PW); openQuestion(nextIdx); }
    else { placePlayer(goalX - PW); reachGoal(); }
  }

  function reachGoal() {
    state = 'end';
    keys.left = keys.right = keys.jumpHeld = false;
    setControls(false);
    $('#controls').hidden = true; $('#assist').hidden = true; $('#skipRun').hidden = true;
    setCanvasLabel();
    burst(goalX, GROUND - 150, [T.accent, '#FFFFFF', '#2853B8', '#FFD23F'], 70, 5);
    renderEnd();
  }

  function renderEnd() {
    const response = session.record();
    after.innerHTML = '';
    after.append(el('article', { class: 'panel' },
      el('h2', { tabindex: '-1' }, ui.levelClear),
      el('div', { class: 'who' }, runnerPortrait(), el('div', {}, el('b', {}, C.runner.name), el('span', {}, QP.fill(ui.starsTotal, { n: session.count(), total: N })))),
      el('p', { class: 'quip' }, QP.fill(ui.quote, { name: C.runner.name, line: C.ending })),
      el('p', {}, ui.thanks),
      QP.answerSummary(C.questions, session.answers, ui),
      el('div', { class: 'actions' }, el('button', { class: 'ghost', onclick: restart }, ui.restart))));
    const h = after.querySelector('h2');
    h.focus({ preventScroll: true });
    h.scrollIntoView({ behavior: QP.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    QP.complete(response);
  }

  function reset() {
    cps.forEach(c => { c.done = false; });
    nextIdx = 0; lastSafe = 60; particles = []; cheerT = 0; blink = 0;
    player = { x: 60, y: GROUND - PH, vy: 0, onGround: true, facing: 1 };
    camX = 0;
    after.innerHTML = '';
    $('#controls').hidden = false; $('#assist').hidden = false; $('#skipRun').hidden = false;
  }

  function restart() {
    session.reset(); reset(); renderStars(); renderIntro();
    window.scrollTo({ top: 0, behavior: QP.reducedMotion() ? 'auto' : 'smooth' });
  }

  function setHeader() {
    $('#company').textContent = C.company;
    $('#title').textContent = C.title;
    $('#levelName').textContent = C.level.name || '';
    document.title = QP.fill(ui.docTitle, { title: C.title, level: C.level.name || C.runner.name });
    $('#game').setAttribute('aria-label', C.level.name || C.title);
    $('#skipRun').textContent = ui.skipRun;
    $('#help').textContent = ui.help;
    $('#jumpBtn').textContent = ui.jump;
    document.querySelector('[data-key="left"]').setAttribute('aria-label', ui.left);
    document.querySelector('[data-key="right"]').setAttribute('aria-label', ui.right);
  }

  function showError(message, errors = []) {
    overlay.hidden = false;
    setControls(false);
    panel.innerHTML = '';
    const [title, list] = QP.errorParts(message, errors);
    title.id = 'panelTitle';
    panel.append(title, list);
  }

  function setUp(config) {
    C = config; ui = QP.copy(UI, C, 'platformer');
    QP.scenes.apply(C);
    const setting = QP.scenes.of(C);
    backdrop = null;
    if (themeName() === 'backdrop') { T = styleTheme(QP.scenes.style(setting)); backdrop = new Image(); backdrop.src = QP.scenes.bannerUrl(setting); }
    // A palette picked in the Game Editor recolours the plain-look level too.
    else if (!setting && QP.scenes.palette(C)) T = styleTheme(QP.scenes.STYLES[C.palette]);
    else T = THEMES[themeName()][C.level.palette];
    buildLevel(); reset(); setHeader(); resize();
  }

  QP.registerGame('platformer', {
    validate: QP.validatePlatformer,
    start(config) {
      session = QP.createSession(config);
      setUp(config); renderStars(); renderIntro();
    },
    preview(config, i) {
      session = QP.previewSession(config, Math.max(0, i));
      setUp(config);
      cps.forEach((c, j) => { c.done = j < i; });
      nextIdx = Math.max(0, Math.min(i, N));
      renderStars();
      if (i < 0) renderIntro();
      else if (i < N) { placePlayer(cps[i].x - 4 - PW); openQuestion(i); }
      else { overlay.hidden = true; placePlayer(goalX - PW); reachGoal(); }
    },
    // The ending sits below the level, so the walkthrough scrolls down to it.
    previewScroll(i, n) { if (i >= n) window.scrollTo(0, after.getBoundingClientRect().top + window.scrollY - 12); }
  });

  QP.inspect = () => {
    const mid = player ? player.x + PW / 2 : 0;
    const seg = grounds.find(([a, b]) => mid >= a && mid <= b);
    return { state, x: player && player.x, y: player && player.y, onGround: !!(player && player.onGround), next: nextIdx, edgeAhead: seg ? seg[1] - (player.x + PW) : null };
  };
  new ResizeObserver(resize).observe(canvas);
  requestAnimationFrame(loop);
  QP.boot('platformer', { reward: '#after', sample: QP.samples.platformer, showError, back: { parent: '.wrap', color: 'var(--on-bg)' } });
})();
