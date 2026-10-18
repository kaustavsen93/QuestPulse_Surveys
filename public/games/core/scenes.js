/* Business settings shared by every game: colours and wallpaper per setting, the scene banner (art lives in
   core/banners.js) and small portraits of supporting characters dressed for their job.
   config.setting picks the scene; games decide where to show it. */
(function (root) {
  const QP = root.QP = root.QP || {};
  const INK = '#3A2618';
  const SKINS = QP.SKIN_TONES || ['#F3D2B3', '#E8B48C', '#C68E63', '#A86F45', '#8D5A3B', '#6B4329'];
  const HAIRS = ['#2B1A12', '#4A2E1C', '#6B3E22', '#A0642E', '#D9B26A', '#1E1E1E'];
  const SHIRTS = ['#4F7CAC', '#6E8B4E', '#B8432F', '#7B5BA6', '#D08A2E', '#3F6B5A'];
  const SPORT = ['#E85D75', '#2F9BD6', '#7FA51E', '#F28C28', '#9B6BC4'];
  const TIES = ['#B8432F', '#2F6DB5', '#C9A04A', '#7B5BA6', '#2E7D74'];
  // Saree and border pairs, and kurta colours, for village characters
  const SAREES = [['#2E8B57', '#F28C28'], ['#C2571A', '#F2C14E'], ['#B8336A', '#F2C14E'], ['#E0A21A', '#B8432F'], ['#3F6BB5', '#F2C14E'], ['#7B2D5C', '#E0A21A']];
  const KURTAS = ['#F4EFE2', '#E8DCC0', '#CFE0E8', '#F2D7A8', '#D9E4C8'];

  const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const pick = (list, seed, salt) => list[(hash(seed + salt)) % list.length];

  /* ---------- colours per setting ----------
     page: light-mode wallpaper (bg), pattern colour (dot), text on it (ink), empty slots, quiz floor, accent;
     dark: the same for dark mode; map: the RPG map; run: platformer counter top, body and ledges;
     bunting: quiz-show flags. */
  const STYLES = {
    bakery: { pattern: 'gingham',
      page: ['#FBEFE6', 'rgba(214,86,104,.16)', '#4A2A1C', '#F6DDE0', '#EED9C4', '#C0392B'], dark: ['#2B201C', 'rgba(232,93,117,.07)', '#F8E8DA', '#4A2F2C', '#3A2A24'],
      map: ['#FBEFE6', '#F2D3C6', '#E58FA6', '#BFE0E8', '#B5563C', '#B9824F'], run: ['#7A4E2D', '#C88A55', '#B8C2CC'], bunting: ['#E85D75', '#FFF3E0', '#7DB46C'] },
    cafe: { pattern: 'stripes',
      page: ['#F6EBDD', 'rgba(122,78,45,.10)', '#3A2414', '#EBDCC6', '#E2CDB0', '#2F5D50'], dark: ['#231B16', 'rgba(214,170,120,.06)', '#F3E6D4', '#3A2C22', '#2E241D'],
      map: ['#F6EBDD', '#E6D3B8', '#2F5D50', '#BFE0E8', '#8C5A3A', '#A86F45'], run: ['#5B3A26', '#8C5A3A', '#C9CED4'], bunting: ['#2F5D50', '#F6EBDD', '#C98A4B'] },
    restaurant: { pattern: 'tiles',
      page: ['#F7EFE4', 'rgba(122,46,46,.09)', '#3A1A1A', '#EFDCD2', '#E5D2BE', '#7A2E2E'], dark: ['#241617', 'rgba(220,120,120,.06)', '#F6E6E0', '#3C2526', '#301E1F'],
      map: ['#F7EFE4', '#E9D8C5', '#7A2E2E', '#BFE0E8', '#7A2E2E', '#8A5A3B'], run: ['#6E4428', '#7A2E2E', '#C9CED4'], bunting: ['#7A2E2E', '#FFFFFF', '#C9A04A'] },
    // A general shop: kirana shelves in turmeric, green and wood
    retail: { pattern: 'tiles',
      page: ['#F7F2E4', 'rgba(194,87,26,.10)', '#2E2614', '#EEE6CF', '#E9DFC4', '#A84A16'], dark: ['#1E1B13', 'rgba(242,193,78,.06)', '#F3ECDA', '#332D20', '#29241A'],
      map: ['#F7F2E4', '#E9E0C8', '#2F5D50', '#BFE0E8', '#C2571A', '#B98E5A'], run: ['#2F5D50', '#B98E5A', '#E2D8C0'], bunting: ['#C2571A', '#F2C14E', '#2F5D50'] },
    fashion: { pattern: 'dots',
      page: ['#F5F1EA', 'rgba(47,93,80,.12)', '#1F2E2A', '#E6EEE9', '#EAE2D4', '#E85D75'], dark: ['#18201E', 'rgba(127,209,194,.07)', '#EAF3F0', '#26332F', '#1F2926'],
      map: ['#F5F1EA', '#E2E8E2', '#2F5D50', '#BFE0E8', '#E85D75', '#D9B98E'], run: ['#2F5D50', '#D9B98E', '#E7E2DA'], bunting: ['#E85D75', '#2F5D50', '#F2C14E'] },
    // Pet shop: aquarium blue with a warm orange
    petshop: { pattern: 'dots',
      page: ['#F1F6FA', 'rgba(79,124,172,.13)', '#1A2633', '#DDE8F2', '#E2E8EE', '#B5541C'], dark: ['#151B22', 'rgba(127,181,224,.06)', '#E8F0F8', '#24303C', '#1C242D'],
      map: ['#F1F6FA', '#DAE4EE', '#6E9F58', '#9FD3E8', '#E08A3C', '#A9825A'], run: ['#4F7CAC', '#E08A3C', '#D9DDE3'], bunting: ['#E08A3C', '#4F7CAC', '#F2C14E'] },
    salon: { pattern: 'pinstripe',
      page: ['#F8EEF2', 'rgba(212,106,142,.16)', '#3A1F2B', '#F2DCE5', '#ECDDE3', '#B8487A'], dark: ['#23181D', 'rgba(240,150,190,.07)', '#F8E8EF', '#3A2630', '#2D1F25'],
      map: ['#F8EEF2', '#E8D6DE', '#D46A8E', '#DCEBF2', '#9B6BC4', '#C9A04A'], run: ['#2B2B33', '#F4F1EE', '#C9A04A'], bunting: ['#D46A8E', '#FFFFFF', '#9B6BC4'] },
    gym: { pattern: 'grid',
      page: ['#E8ECEF', 'rgba(43,47,51,.07)', '#1C2024', '#DCE3D0', '#D5DADF', '#5E7F12'], dark: ['#15181B', 'rgba(182,217,76,.05)', '#EEF1F3', '#262C22', '#1C2024'],
      map: ['#E8ECEF', '#D5DBE0', '#7FA51E', '#BFE0F0', '#2B2F33', '#8A8F96'], run: ['#B6D94C', '#3A3F45', '#8A8F96'], bunting: ['#B6D94C', '#2B2F33', '#FFFFFF'] },
    clinic: { pattern: 'tiles',
      page: ['#EAF4F4', 'rgba(95,168,160,.14)', '#173634', '#D7EAE8', '#DDEBEB', '#2E7D74'], dark: ['#14201F', 'rgba(127,209,194,.06)', '#E6F4F2', '#22312F', '#1A2827'],
      map: ['#EAF4F4', '#D5E7E7', '#5FA8A0', '#BFE0F0', '#5FA8A0', '#B8C2CC'], run: ['#5FA8A0', '#F2F6F6', '#B8C2CC'], bunting: ['#5FA8A0', '#FFFFFF', '#7FB5E0'] },
    hotel: { pattern: 'pinstripe',
      page: ['#F3EBDD', 'rgba(201,160,74,.22)', '#2A2016', '#EADFC8', '#E8DCC6', '#7A2E3A'], dark: ['#1E1A14', 'rgba(201,160,74,.09)', '#F5ECDD', '#332B20', '#2A241B'],
      map: ['#F3EBDD', '#E3D2B0', '#2F5D50', '#BFE0E8', '#7A2E3A', '#6B4A2B'], run: ['#C9A04A', '#7A2E3A', '#C9A04A'], bunting: ['#7A2E3A', '#C9A04A', '#F3EBDD'] },
    office: { pattern: 'grid',
      page: ['#EEF1F5', 'rgba(79,124,172,.09)', '#1B2533', '#DDE5EF', '#DDE2E8', '#2F6DB5'], dark: ['#151A21', 'rgba(127,181,224,.05)', '#E9EFF6', '#232B36', '#1B212A'],
      map: ['#EEF1F5', '#DDE3EA', '#6E9F58', '#BFD8F0', '#4F7CAC', '#8C96A3'], run: ['#4F7CAC', '#8C96A3', '#D9DDE3'], bunting: ['#4F7CAC', '#FFFFFF', '#F2C14E'] },
    school: { pattern: 'dots',
      page: ['#F6F1DE', 'rgba(110,159,88,.16)', '#23301C', '#E6EBD3', '#EAE2C6', '#2E6B3A'], dark: ['#191D14', 'rgba(170,210,140,.07)', '#EEF3E2', '#283021', '#20251A'],
      map: ['#F6F1DE', '#E3E8CC', '#6E9F58', '#BFE0F0', '#B8432F', '#A86F45'], run: ['#A86F45', '#C9A06A', '#4F7CAC'], bunting: ['#E85D75', '#F2C14E', '#4F7CAC'] },
    // Outdoors: green fields, a mud path, thatch and a marigold garland
    village: { pattern: 'paddy',
      page: ['#EEF3DF', 'rgba(94,140,70,.16)', '#24301A', '#E0E9C9', '#E4DABA', '#B8541C'], dark: ['#171C12', 'rgba(150,200,110,.07)', '#EDF3E0', '#262E1E', '#1E2418'],
      map: ['#EEE6BF', '#D5C98C', '#4F8A45', '#A6C9CF', '#B5763A', '#B07A55'], run: ['#5E8C3A', '#B98E5A', '#8A6A3E'], bunting: ['#F28C28', '#F2C14E', '#2E7D4F'] }
  };

  // Wallpaper patterns; --set-dot-now is the pattern colour for the current light or dark mode (core/scenes.css).
  const D = 'var(--set-dot-now)';
  const PATTERNS = {
    gingham: [`linear-gradient(90deg, ${D} 50%, transparent 50%), linear-gradient(${D} 50%, transparent 50%)`, '36px 36px'],
    stripes: [`repeating-linear-gradient(90deg, ${D} 0 22px, transparent 22px 44px)`, 'auto'],
    pinstripe: [`repeating-linear-gradient(90deg, ${D} 0 2px, transparent 2px 20px)`, 'auto'],
    tiles: [`linear-gradient(${D} 2px, transparent 2px), linear-gradient(90deg, ${D} 2px, transparent 2px)`, '40px 40px'],
    grid: [`linear-gradient(${D} 1px, transparent 1px), linear-gradient(90deg, ${D} 1px, transparent 1px)`, '24px 24px'],
    dots: [`radial-gradient(${D} 2px, transparent 2.6px)`, '22px 22px'],
    paddy: [`repeating-linear-gradient(-55deg, ${D} 0 2px, transparent 2px 14px), repeating-linear-gradient(55deg, ${D} 0 2px, transparent 2px 14px)`, 'auto']
  };

  function buntingUrl(colors) {
    const [a, b, c] = colors;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='34'><path d='M0 3q48 10 96 0' fill='none' stroke='#5A4632' stroke-width='2'/><path d='M4 4l20 3-9 22z' fill='${a}' stroke='#00000022'/><path d='M36 7h24l-12 24z' fill='${b}' stroke='#00000022'/><path d='M72 7l20-3-11 25z' fill='${c}' stroke='#00000022'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  const VARS = ['bg', 'dot', 'ink', 'slot', 'floor'];
  function setVars(style) {
    const s = document.documentElement.style;
    if (!style) {
      [...VARS, ...VARS.map(v => v + '-d'), 'accent', 'pattern', 'pattern-size', 'bunting'].forEach(v => s.removeProperty('--set-' + v));
      return;
    }
    VARS.forEach((v, i) => { s.setProperty('--set-' + v, style.page[i]); s.setProperty(`--set-${v}-d`, style.dark[i]); });
    s.setProperty('--set-accent', style.page[5]);
    const [image, size] = PATTERNS[style.pattern] || PATTERNS.dots;
    s.setProperty('--set-pattern', image);
    s.setProperty('--set-pattern-size', size);
    s.setProperty('--set-bunting', buntingUrl(style.bunting));
  }

  /* ---------- supporting-character portraits (48 x 48) ---------- */
  const RINGS = { chef: '#F4E1C8', server: '#D9DEE8', apron: '#F7D4DC', casual: '#DDE8D4', uniform: '#D4E6E2', suit: '#DCDDE6', scrubs: '#D3ECEA', sporty: '#E8EDCF', saree: '#F6E3C4', kurta: '#E2EBD3' };
  function personArt(person) {
    const seed = person.name || person.role || '';
    const outfit = person.outfit, village = outfit === 'saree' || outfit === 'kurta';
    const skin = pick(SKINS, seed, 's'), hair = pick(village ? HAIRS.filter(h => h !== '#D9B26A' && h !== '#A0642E') : HAIRS, seed, 'h'), shirt = pick(SHIRTS, seed, 'c');
    const [saree, border] = pick(SAREES, seed, 'r'), kurta = pick(KURTAS, seed, 'k');
    // About a third of saree wearers have the pallu drawn over the head, and a third of kurta wearers wear a pagdi.
    const veiled = outfit === 'saree' && hash(seed + 'v') % 3 === 0, pagdi = outfit === 'kurta' && hash(seed + 'p') % 3 === 0;
    const torso = fill => `<path d="M8 48q0-15 16-15t16 15z" fill="${fill}" stroke="${INK}" stroke-width="1.6"/>`;
    const body = {
      chef: `${torso('#FFFFFF')}<path d="M24 33v15" stroke="${INK}" stroke-width="1"/><g fill="${INK}"><circle cx="20" cy="38" r="1"/><circle cx="20" cy="43" r="1"/><circle cx="28" cy="38" r="1"/><circle cx="28" cy="43" r="1"/></g><path d="M18 33.5l6 3 6-3" fill="none" stroke="${INK}" stroke-width="1.4"/>`,
      server: `${torso('#FFFFFF')}<path d="M12 48q0-11 6-13l6 13zM36 48q0-11-6-13l-6 13z" fill="#2B2B33"/><path d="M20 35.5l4 2-4 2zM28 35.5l-4 2 4 2z" fill="#8E2C1B"/>`,
      apron: `${torso(shirt)}<path d="M17 48v-9h14v9z" fill="#F7B8C8" stroke="${INK}" stroke-width="1.2"/><path d="M17 39l2-5M31 39l-2-5" stroke="#F7B8C8" stroke-width="2"/>`,
      casual: `${torso(shirt)}<path d="M19 34q5 5 10 0" fill="none" stroke="${INK}" stroke-width="1.4"/>`,
      uniform: `${torso('#2F5D50')}<path d="M19 33.5l5 5 5-5" fill="#FFFFFF" stroke="${INK}" stroke-width="1.2"/><rect x="28" y="40" width="7" height="4" rx="1" fill="#F2C14E" stroke="${INK}" stroke-width=".8"/>`,
      suit: `${torso('#2B3445')}<path d="M19 33.5l5 14.5 5-14.5z" fill="#FFFFFF"/><path d="M24 37l-2 3 2 8 2-8z" fill="${pick(TIES, seed, 't')}"/><path d="M19 33.5l5 9M29 33.5l-5 9" stroke="#1B212C" stroke-width="1.2"/>`,
      scrubs: `${torso('#5FA8A0')}<path d="M19 33.5l5 7 5-7" fill="none" stroke="${INK}" stroke-width="1.4"/><rect x="27" y="41" width="6" height="5" fill="none" stroke="#2E7D74" stroke-width="1.2"/>`,
      sporty: `${torso(pick(SPORT, seed, 'p'))}<path d="M24 34v14" stroke="#FFFFFF" stroke-width="1.5"/><path d="M11 44l6-8M37 44l-6-8" stroke="#FFFFFF" stroke-width="2"/>`,
      // Blouse under a pallu draped from the left shoulder across the chest, with its border
      saree: `${torso(saree)}<path d="M13 37q6-4 11-4l16 15H27z" fill="${saree}" stroke="${INK}" stroke-width="1.2"/><path d="M15 36q4-2.5 9-3l16 15" fill="none" stroke="${border}" stroke-width="2.6"/>`,
      // Long kurta with a short placket, and a gamchha over one shoulder
      kurta: `${torso(kurta)}<path d="M24 33v8" stroke="${INK}" stroke-width="1.2"/><g fill="${INK}"><circle cx="24" cy="36" r=".9"/><circle cx="24" cy="39" r=".9"/></g><path d="M30 34q4 2 6 14h-4q-1-9-4-12z" fill="#D9534F" stroke="${INK}" stroke-width="1"/><path d="M31 38h4M32.5 42h3.5" stroke="#FFFFFF" stroke-width="1"/>`
    }[outfit] || '';
    const head = `<circle cx="24" cy="22" r="9" fill="${skin}" stroke="${INK}" stroke-width="1.4"/><circle cx="21" cy="22" r="1.2" fill="${INK}"/><circle cx="27" cy="22" r="1.2" fill="${INK}"/><path d="M21.5 26q2.5 2 5 0" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>`;
    const hairCap = `<path d="M15 21q0-10 9-10t9 10q-3-4-9-5-6 1-9 5z" fill="${hair}"/>`;
    const top = outfit === 'chef'
      ? `<rect x="16" y="13" width="16" height="4" fill="#FFFFFF" stroke="${INK}" stroke-width="1.2"/><path d="M16 13q-5-1-4-6t7-3q2-4 5-4t5 4q6-2 7 3t-4 6z" fill="#FFFFFF" stroke="${INK}" stroke-width="1.2"/>`
      : outfit === 'scrubs' ? `<path d="M15 20q0-10 9-10t9 10z" fill="#5FA8A0" stroke="${INK}" stroke-width="1.2"/>`
      : outfit === 'sporty' ? `${hairCap}<rect x="15" y="15.5" width="18" height="3" rx="1.5" fill="#FFFFFF" stroke="${INK}" stroke-width=".8"/>`
      : veiled ? `<path d="M14 30q-2-20 10-21t10 21q-2-11-10-12-8 1-10 12z" fill="${saree}" stroke="${INK}" stroke-width="1.2"/><path d="M15 26q0-15 9-15.5t9 15.5" fill="none" stroke="${border}" stroke-width="1.8"/>`
      : pagdi ? `<path d="M14.5 19q0-9 9.5-9.5t9.5 9.5q-4-2-9.5-2t-9.5 2z" fill="${pick(['#E0A21A', '#C2571A', '#F4EFE2', '#B8432F'], seed, 'g')}" stroke="${INK}" stroke-width="1.2"/><path d="M15.5 16q8-5 17 0M17 12.5q7-3 14 0" fill="none" stroke="${INK}" stroke-width=".9" opacity=".6"/>`
      : outfit === 'saree' ? `${hairCap}<circle cx="24" cy="12.5" r="3.4" fill="${hair}"/>`
      : hairCap;
    const clip = `qpc-${hash(seed + outfit)}`;
    return `<circle cx="24" cy="24" r="23" fill="${RINGS[outfit] || '#E8E2D6'}"/><clipPath id="${clip}"><circle cx="24" cy="24" r="23"/></clipPath><g clip-path="url(#${clip})">${body}${head}${top}</g><circle cx="24" cy="24" r="23" fill="none" stroke="${INK}" stroke-width="2"/>`;
  }

  const make = markup => { const d = document.createElement('div'); d.innerHTML = markup; return d.firstElementChild; };
  const art = setting => (QP.banners || {})[setting];
  const attr = text => String(text).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  /* A "custom" business brings its own scenery in config.scenery (see QP.cleanScenery). It borrows one of the
     hand-tuned palettes above and is drawn by QP.drawScenery; without valid scenery the game falls back to its plain look. */
  let customKey = null;
  const paletteOf = config => (config && STYLES[config.palette] && (QP.SCENERY ? QP.SCENERY.palettes.includes(config.palette) : true)) ? config.palette : null;
  function installCustom(config) {
    if (!config || config.setting !== 'custom') return;
    const key = JSON.stringify([config.scenery || null, paletteOf(config)]);
    if (key === customKey) return;
    customKey = key;
    const sc = QP.cleanScenery ? QP.cleanScenery(config.scenery) : null;
    if (!sc || !QP.drawScenery) { delete STYLES.custom; if (QP.banners) delete QP.banners.custom; return; }
    // A palette picked in the builder (config.palette) wins over the one the AI chose for the scenery.
    if (paletteOf(config)) sc.palette = paletteOf(config);
    STYLES.custom = Object.assign({}, STYLES[sc.palette]);
    QP.banners = QP.banners || {};
    QP.banners.custom = { draw: () => QP.drawScenery(sc, STYLES.custom), label: sc.label, labelHi: sc.labelHi || '' };
    QP.scenes.scenery = sc;
  }

  // The palette picked for the active config's hand-drawn setting, if any (custom scenery folds it into STYLES.custom).
  let override = null;

  /* ---------- colour palette for the whole game ----------
     A palette picked in the Game Editor (config.palette) recolours everything, also in games with the plain look:
     background, cards, text, buttons, answer choices, accents, panels and the map. Every colour is worked out from the
     palette's own colours here, and text colours are adjusted until they meet WCAG AA contrast (4.5:1) with what they
     sit on. Each game's CSS maps these --pal-* values onto its own variables under :root[data-palette]. */
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const toHex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
  const lum = hex => {
    const [r, g, b] = rgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  // fg moved towards black (on a light bg) or white (on a dark one) until it reaches the ratio.
  const readable = (fg, bg, ratio = 4.5) => {
    const towards = lum(bg) > 0.18 ? '#000000' : '#FFFFFF';
    let c = fg;
    for (let t = 0.05; contrast(c, bg) < ratio && t <= 1; t += 0.05) c = mix(fg, towards, t);
    return c;
  };
  function paletteColours(st) {
    const [bg, dot, onBg, slot, floor, accentBase] = st.page, [bgD, dotD, onBgD, slotD, floorD] = st.dark;
    // Cards and panels stay light in both modes, as in every game; dark mode only darkens the background.
    const surface = mix(bg, '#FFFFFF', 0.6), ink = readable(onBg, surface, 7);
    const accent = readable(accentBase, surface);          // dark enough for white text and for text on cards
    const deep = mix(accent, '#14121F', 0.62);             // scoreboards and marquees
    return {
      bg, dot, 'on-bg': readable(onBg, bg), slot, floor, 'bg-d': bgD, 'dot-d': dotD, 'on-bg-d': readable(onBgD, bgD), 'slot-d': slotD, 'floor-d': floorD,
      surface, ink, 'ink-soft': readable(mix(ink, surface, 0.3), surface), line: mix(ink, surface, 0.8), tint: mix(accentBase, surface, 0.85),
      accent, 'on-accent': readable('#FFFFFF', accent), 'accent-2': readable(st.bunting[2], surface, 3),
      deep, 'deep-edge': mix(deep, '#FFFFFF', 0.15), 'on-deep': readable('#F4F1FF', deep), glow: readable(mix(accentBase, '#FFFFFF', 0.5), deep),
      // The RPG map and the platformer level, from the palette's own scenery colours
      map: st.map, run: st.run
    };
  }
  const PAL_VARS = ['bg', 'dot', 'on-bg', 'slot', 'floor', 'bg-d', 'dot-d', 'on-bg-d', 'slot-d', 'floor-d', 'surface', 'ink', 'ink-soft', 'line', 'tint',
    'accent', 'on-accent', 'accent-2', 'deep', 'deep-edge', 'on-deep', 'glow'];
  function applyPalette(config) {
    const root = document.documentElement, name = paletteOf(config);
    if (!name) { delete root.dataset.palette; PAL_VARS.forEach(v => root.style.removeProperty('--pal-' + v)); return null; }
    const colours = paletteColours(STYLES[name]);
    PAL_VARS.forEach(v => root.style.setProperty('--pal-' + v, colours[v]));
    root.dataset.palette = name;
    return colours;
  }

  QP.scenes = {
    STYLES,
    /* The active setting, or null when the config has none (or one this build can't draw). */
    of: config => {
      installCustom(config);
      const s = (config && STYLES[config.setting] && art(config.setting)) ? config.setting : null;
      override = s && s !== 'custom' && paletteOf(config) ? { setting: s, palette: paletteOf(config) } : null;
      return s;
    },
    /* The colours for a setting: its own, or the palette the business picked for it. */
    style: setting => (override && override.setting === setting ? STYLES[override.palette] : STYLES[setting]) || null,
    /* Marks the page with the setting and its colours so each game's CSS can restyle. */
    // The colours for the game's picked palette (see paletteColours), or null for the game's own colours.
    palette: config => (paletteOf(config) ? paletteColours(STYLES[paletteOf(config)]) : null),
    contrast,
    apply(config) {
      applyPalette(config);
      const s = QP.scenes.of(config);  // of() also sets up a custom business's scenery
      if (s) document.documentElement.dataset.setting = s; else delete document.documentElement.dataset.setting;
      setVars(s && QP.scenes.style(s));
      return s;
    },
    bannerMarkup: setting => art(setting) ? art(setting).draw() : '',
    /* The banner as a standalone image (for canvas games). */
    bannerUrl: setting => art(setting)
      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" width="800" height="200">${art(setting).draw()}</svg>`)}` : '',
    /* A decorative scene strip; the label describes it for screen readers. */
    banner(setting) {
      const a = art(setting);
      if (!a) return null;
      const label = document.documentElement.lang === 'hi' && a.labelHi ? a.labelHi : a.label;
      return make(`<div class="scene-banner"><svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMax slice" role="img" aria-label="${attr(label)}">${a.draw()}</svg></div>`);
    },
    hasOutfit: person => Boolean(person && (QP.OUTFITS || []).includes(person.outfit)),
    /* Portrait of a supporting character; decorative because their name and role are shown as text beside it. */
    person: person => make(`<svg viewBox="0 0 48 48" aria-hidden="true">${personArt(person)}</svg>`)
  };
})(window);
