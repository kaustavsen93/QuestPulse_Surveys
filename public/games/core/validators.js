/* QuestPulse game config validators. Shared by the browser games and the Node server. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.QP = root.QP || {}; Object.assign(root.QP, api); }
})(typeof self !== 'undefined' ? self : this, function () {
  const QUESTION_TYPES = ['rating', 'choice', 'text', 'nps'];

  /* Business settings tailor the scenery. Add a setting here, in core/scenes.js and in each game's art. */
  // Languages with translated game text (core/i18n.js).
  const LANGS = ['en', 'hi'];
  const SETTINGS = ['none', 'bakery', 'cafe', 'restaurant', 'retail', 'fashion', 'petshop', 'salon', 'gym', 'clinic', 'hotel', 'office', 'school', 'village', 'custom'];
  // What a supporting character (witness, inhabitant) wears for their job.
  const OUTFITS = ['chef', 'server', 'apron', 'casual', 'uniform', 'suit', 'scrubs', 'sporty', 'saree', 'kurta'];
  // RPG stops that fit each setting (every one is drawn in rpg.js). Most are indoor; the village is walked outdoors.
  const INDOOR_KINDS = {
    bakery: ['oven', 'mixing-bench', 'bread-shelf', 'cake-stand', 'counter', 'pantry', 'cafe-table'],
    cafe: ['coffee-machine', 'counter', 'cake-stand', 'cafe-table', 'sofa', 'pantry', 'bookshelf'],
    restaurant: ['host-stand', 'dining-table', 'kitchen-pass', 'stove', 'pantry', 'cafe-table'],
    // A general shop: kirana, grocery, supermarket, electronics or hardware
    retail: ['shop-window', 'shop-shelf', 'product-shelf', 'fridge', 'fruit-crates', 'checkout'],
    fashion: ['shop-window', 'clothes-rack', 'shop-shelf', 'fitting-room', 'checkout', 'product-shelf'],
    petshop: ['aquarium', 'pet-food-shelf', 'bird-cage', 'grooming-table', 'pet-bed', 'checkout'],
    salon: ['reception-desk', 'sofa', 'wash-basin', 'salon-chair', 'mirror-station', 'product-shelf'],
    gym: ['reception-desk', 'lockers', 'treadmill', 'weights-rack', 'yoga-mat', 'water-cooler'],
    clinic: ['reception-desk', 'waiting-chairs', 'consult-room', 'water-cooler', 'product-shelf', 'sofa'],
    hotel: ['reception-desk', 'luggage-cart', 'lift', 'guest-room', 'dining-table', 'sofa'],
    office: ['reception-desk', 'office-desk', 'meeting-table', 'whiteboard', 'water-cooler', 'lift', 'bookshelf'],
    school: ['classroom-desk', 'blackboard', 'bookshelf', 'lockers', 'dining-table', 'whiteboard'],
    village: ['village', 'field', 'well', 'hut', 'banyan', 'market', 'river', 'mill', 'garden', 'lake']
  };
  // A business no setting covers ("custom") can use any indoor stop.
  INDOOR_KINDS.custom = [...new Set(Object.entries(INDOOR_KINDS).filter(([k]) => k !== 'village').flatMap(([, kinds]) => kinds))];

  /* ---------- scenery the AI designs for a "custom" business ----------
     The AI describes the scene and never writes markup. Wall and floor parts are hand-drawn in banners.js, colours
     come from this fixed list, and the AI's own objects are lists of simple shapes that the renderer outlines in the
     house style. cleanScenery drops anything outside these rules; the server and the browser both run it. */
  const SCENERY = {
    palettes: ['bakery', 'cafe', 'restaurant', 'retail', 'fashion', 'petshop', 'salon', 'gym', 'clinic', 'hotel', 'office', 'school'],
    floors: ['planks', 'tiles', 'carpet'],
    wallParts: ['window', 'city-window', 'clock', 'picture', 'noticeboard'],
    floorParts: ['counter', 'reception-desk', 'waiting-chairs', 'table-and-chairs', 'desk', 'bookshelf', 'plant', 'water-cooler', 'sofa', 'filing-cabinet'],
    centreParts: ['counter', 'reception-desk', 'table-and-chairs', 'desk'],
    tallParts: ['bookshelf'],
    colours: { red: '#B8432F', blue: '#4F7CAC', yellow: '#F2C14E', green: '#6E9F58', purple: '#7B5BA6', orange: '#D08A2E', teal: '#2F5D50', pink: '#E85D75',
      white: '#FFFFFF', cream: '#F4EFE4', 'light-grey': '#E7E2DA', grey: '#C9CED4', 'dark-grey': '#5A6068', wood: '#A86F45', 'light-wood': '#C9A06A', glass: '#CFE8F2', ink: '#3A2618' },
    maxProps: 3, maxShapes: 40, maxStopIcons: 2
  };
  const sceneryNum = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n * 10) / 10)) : null; };
  const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]{1,800}$/;
  // One shape inside a w x h box. Paths may wander outside; the renderer clips each object to its box.
  function cleanShape(sh, w, h) {
    if (!sh || typeof sh !== 'object') return null;
    const fill = sh.fill === 'none' ? 'none' : (Object.prototype.hasOwnProperty.call(SCENERY.colours, sh.fill) ? sh.fill : null);
    if (!fill) return null;
    const outline = ['thin', 'normal', 'none'].includes(sh.outline) ? sh.outline : 'normal';
    const n = sceneryNum, pad = 4;
    if (sh.t === 'rect') {
      const v = { x: n(sh.x, -pad, w), y: n(sh.y, -pad, h), w: n(sh.w, .5, w + pad), h: n(sh.h, .5, h + pad), rx: n(sh.rx || 0, 0, 40) };
      return Object.values(v).includes(null) ? null : { t: 'rect', ...v, fill, outline };
    }
    if (sh.t === 'circle') {
      const v = { cx: n(sh.cx, -pad, w + pad), cy: n(sh.cy, -pad, h + pad), r: n(sh.r, .5, Math.max(w, h)) };
      return Object.values(v).includes(null) ? null : { t: 'circle', ...v, fill, outline };
    }
    if (sh.t === 'ellipse') {
      const v = { cx: n(sh.cx, -pad, w + pad), cy: n(sh.cy, -pad, h + pad), rx: n(sh.rx, .5, w), ry: n(sh.ry, .5, h) };
      return Object.values(v).includes(null) ? null : { t: 'ellipse', ...v, fill, outline };
    }
    if (sh.t === 'path' && typeof sh.d === 'string' && PATH_DATA.test(sh.d.trim())) return { t: 'path', d: sh.d.trim(), fill, outline: fill === 'none' && outline === 'none' ? 'normal' : outline };
    return null;
  }
  const sceneryText = (v, max) => String(v == null ? '' : v).replace(/[<>"&]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  function cleanScenery(s) {
    if (!s || typeof s !== 'object') return null;
    const props = (Array.isArray(s.props) ? s.props : []).slice(0, SCENERY.maxProps).map(p => {
      if (!p || typeof p !== 'object') return null;
      const id = String(p.id || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24);
      const w = sceneryNum(p.w, 10, 200), h = sceneryNum(p.h, 10, 160), zone = p.zone === 'wall' ? 'wall' : 'floor';
      const shapes = (Array.isArray(p.shapes) ? p.shapes : []).slice(0, SCENERY.maxShapes).map(x => cleanShape(x, w, h)).filter(Boolean);
      return id && w && h && shapes.length >= 2 ? { id, zone, tall: zone === 'floor' && p.tall === true, w, h, shapes } : null;
    }).filter(Boolean).filter((p, i, all) => all.findIndex(q => q.id === p.id) === i);
    const byId = Object.fromEntries(props.map(p => [p.id, p]));
    const part = (v, list, zone) => {
      if (list.includes(v)) return v;
      const prop = typeof v === 'string' && v.startsWith('prop:') && byId[v.slice(5)];
      return prop && prop.zone === zone ? v : null;
    };
    const columns = Array.from({ length: 5 }, (_, i) => {
      const c = (Array.isArray(s.columns) && s.columns[i]) || {};
      return { wall: part(c.wall, SCENERY.wallParts, 'wall'), floor: part(c.floor, SCENERY.floorParts, 'floor') };
    });
    // The middle of the scene always has something to stand at.
    if (!columns[2].floor || !(SCENERY.centreParts.includes(columns[2].floor) || columns[2].floor.startsWith('prop:'))) columns[2].floor = 'counter';
    const stopIcons = (Array.isArray(s.stopIcons) ? s.stopIcons : []).slice(0, SCENERY.maxStopIcons).map(si => {
      if (!si || typeof si !== 'object') return null;
      const questionId = String(si.questionId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12);
      const shapes = (Array.isArray(si.shapes) ? si.shapes : []).slice(0, 30).map(x => cleanShape(x, 44, 40)).filter(Boolean);
      return questionId && shapes.length >= 2 ? { questionId, shapes } : null;
    }).filter(Boolean);
    return {
      palette: SCENERY.palettes.includes(s.palette) ? s.palette : 'office',
      floor: SCENERY.floors.includes(s.floor) ? s.floor : 'tiles',
      wallStripes: s.wallStripes !== false, lamps: s.lamps !== false,
      columns, props, stopIcons,
      label: sceneryText(s.label, 220) || 'Inside the business.', labelHi: sceneryText(s.labelHi, 300)
    };
  }

  /* Skin tones for every character, light to deep. Supporting characters get one by name (core/scenes.js); the main
     character gets one by game (castMainCharacter), so different games show different people. */
  const SKIN_TONES = ['#F3D2B3', '#E8B48C', '#C68E63', '#A86F45', '#8D5A3B', '#6B4329'];
  const MAIN_CHARACTER = { detective: 'detective', rpg: 'hero', quiz: 'host', platformer: 'runner' };
  const hashText = text => { let h = 2166136261; for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  /* Sets the main character's skin tone, so tones spread evenly instead of following whatever the AI tends to pick.
     A generated game gets one from its id (the same id always gets the same tone). With a group name (the sample set
     for one business setting), its four games get four different tones next to each other in the range, starting at a
     different tone for each group, so switching game type shows a different person. */
  function castMainCharacter(type, c, group) {
    const who = c && MAIN_CHARACTER[type] && c[MAIN_CHARACTER[type]];
    if (!who || typeof who !== 'object') return;
    const order = Object.keys(MAIN_CHARACTER).indexOf(type);
    const at = group ? hashText(group) + order : hashText(String(c.id || '') + type);
    who.look = Object.assign({}, who.look, { skinTone: SKIN_TONES[at % SKIN_TONES.length] });
  }

  /* Fonts the business can pick in the Game Editor (config.fonts = { heading, body }), each a Google Font that also
     has Devanagari letters, so Hindi games look right too. Leaving one out keeps the game's own font. */
  const FONT_CHOICES = {
    heading: {
      'baloo-2': { name: 'Baloo 2', family: '"Baloo 2", sans-serif', query: 'Baloo+2:wght@500;700' },
      poppins: { name: 'Poppins', family: '"Poppins", sans-serif', query: 'Poppins:wght@500;700' },
      'rozha-one': { name: 'Rozha One', family: '"Rozha One", serif', query: 'Rozha+One' },
      'yatra-one': { name: 'Yatra One', family: '"Yatra One", serif', query: 'Yatra+One' },
      martel: { name: 'Martel', family: '"Martel", serif', query: 'Martel:wght@400;800' }
    },
    body: {
      mukta: { name: 'Mukta', family: '"Mukta", sans-serif', query: 'Mukta:wght@400;600;700' },
      hind: { name: 'Hind', family: '"Hind", sans-serif', query: 'Hind:wght@400;600;700' },
      poppins: { name: 'Poppins', family: '"Poppins", sans-serif', query: 'Poppins:wght@400;600;700' },
      laila: { name: 'Laila', family: '"Laila", serif', query: 'Laila:wght@400;600;700' },
      kalam: { name: 'Kalam', family: '"Kalam", cursive', query: 'Kalam:wght@400;700' }
    }
  };
  const fontsProblems = fonts => {
    if (fonts === undefined) return [];
    if (!fonts || typeof fonts !== 'object' || Array.isArray(fonts)) return ['fonts must be an object'];
    return ['heading', 'body'].filter(k => fonts[k] !== undefined && !Object.prototype.hasOwnProperty.call(FONT_CHOICES[k], fonts[k]))
      .map(k => `${k} font must be one of: ${Object.keys(FONT_CHOICES[k]).join(', ')}`);
  };

  const ENUMS = {
    setting: SETTINGS,
    outfit: OUTFITS,
    detective: { hat: ['fedora', 'deerstalker', 'beret', 'cap', 'toque'], accessory: ['magnifier', 'notebook', 'umbrella'] },
    rpg: {
      headgear: ['hood', 'wide-hat', 'circlet', 'cap', 'toque', 'none'],
      item: ['staff', 'lantern', 'map', 'satchel', 'flute', 'rolling-pin'],
      palette: ['meadow', 'autumn', 'frost', 'dusk'],
      kind: ['village', 'forest', 'bridge', 'river', 'mountain', 'castle', 'tower', 'lake', 'meadow', 'cave', 'market', 'harbor', 'mill', 'ruins', 'garden', 'camp'],
      // Indoor stops for business settings, see INDOOR_KINDS
      indoor: [...new Set(Object.values(INDOOR_KINDS).flat())],
      icon: ['lantern', 'map', 'key', 'compass', 'feather', 'potion', 'scroll', 'gem', 'rope', 'apple', 'bell', 'boots', 'book', 'seed',
        'whisk', 'cupcake', 'croissant', 'piping-bag', 'coffee', 'plate', 'shopping-bag', 'price-tag', 'scissors', 'comb', 'dumbbell',
        'water-bottle', 'towel', 'clipboard', 'suitcase', 'pencil', 'laptop', 'wheat', 'matka']
    },
    quiz: {
      hair: ['quiff', 'bob', 'curls', 'bald', 'bun'],
      accessory: ['microphone', 'cue-cards', 'glasses', 'whisk'],
      palette: ['sunset', 'electric', 'retro', 'mint']
    },
    platformer: {
      headgear: ['beanie', 'helmet', 'headband', 'cap', 'toque', 'none'],
      theme: ['rooftops', 'jungle', 'candy', 'space'],
      palette: ['day', 'dusk']
    }
  };

  const QUESTION_RANGE = { detective: [3, 12], rpg: [3, 15], quiz: [3, 10], platformer: [3, 10] };

  // Story text must never judge or steer the respondent's answer.
  const JUDGING = /\b(right answer|wrong answer|correct answer|correct!|incorrect|great (choice|answer|pick)|good (choice|answer|pick)|nice (choice|answer|pick)|well done|good job|you got it|that'?s right|spot on)\b/i;

  const isStr = v => typeof v === 'string' && v.trim().length > 0;
  const isHex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

  function checker(errs) {
    return {
      str(v, label, max) {
        if (!isStr(v)) errs.push(`Missing ${label}`);
        else if (max && v.length > max) errs.push(`${label} is too long (${v.length} > ${max} characters)`);
      },
      optStr(v, label, max) { if (v !== undefined && v !== null && v !== '') this.str(v, label, max); },
      oneOf(v, list, label) { if (!list.includes(v)) errs.push(`${label} must be one of: ${list.join(', ')}`); },
      hex(v, label) { if (!isHex(v)) errs.push(`${label} must be a hex colour like #6B4F3A`); },
      optOneOf(v, list, label) { if (v !== undefined && v !== null) this.oneOf(v, list, label); },
      optBool(v, label) { if (v !== undefined && typeof v !== 'boolean') errs.push(`${label} must be true or false`); },
      neutral(v, label) { if (typeof v === 'string' && JUDGING.test(v)) errs.push(`${label} judges the answer ("${v.match(JUDGING)[0]}"); story text must stay neutral`); }
    };
  }

  function validateQuestion(q, i, errs, ids) {
    const at = `Question ${i + 1}: `;
    const c = checker(errs);
    if (!q || typeof q !== 'object') { errs.push(at + 'is not an object'); return; }
    if (!isStr(q.id)) errs.push(at + 'missing id');
    else if (ids.has(q.id)) errs.push(at + `duplicate id ${q.id}`);
    else ids.add(q.id);
    if (!QUESTION_TYPES.includes(q.type)) errs.push(at + 'unknown type ' + q.type);
    c.str(q.prompt, at + 'prompt', 200);
    if (q.type === 'choice') {
      if (!Array.isArray(q.options) || q.options.length < 2) errs.push(at + 'choice needs 2+ options');
      else {
        if (q.options.length > 6) errs.push(at + 'choice allows at most 6 options');
        q.options.forEach((o, j) => c.str(o, `${at}option ${j + 1}`, 80));
        if (new Set(q.options.map(o => String(o).trim().toLowerCase())).size !== q.options.length) errs.push(at + 'options must be different from each other');
      }
    }
    if (q.type === 'rating' && !(Number.isInteger(q.scale) && q.scale >= 3 && q.scale <= 10)) errs.push(at + 'rating scale must be 3 to 10');
    if (q.type === 'rating' || q.type === 'nps') {
      if (!Array.isArray(q.labels) || q.labels.length !== 2) errs.push(at + 'needs 2 end labels');
      else q.labels.forEach((l, j) => c.str(l, `${at}end label ${j + 1}`, 40));
    }
    if (q.optional !== undefined && typeof q.optional !== 'boolean') errs.push(at + 'optional must be true or false');
  }

  function validateCommon(c, type) {
    const errs = [];
    const k = checker(errs);
    if (!c || typeof c !== 'object') return ['Config is not an object'];
    k.str(c.id, 'id', 80);
    k.str(c.title, 'title', 80);
    k.str(c.company, 'company', 80);
    if (!Array.isArray(c.intro) || !c.intro.length) errs.push('Missing intro');
    else {
      if (c.intro.length > 4) errs.push('intro allows at most 4 paragraphs');
      c.intro.forEach((p, i) => { k.str(p, `intro paragraph ${i + 1}`, 300); k.neutral(p, `intro paragraph ${i + 1}`); });
    }
    k.str(c.ending, 'ending', 500);
    k.neutral(c.ending, 'ending');
    k.optOneOf(c.setting, SETTINGS, 'setting');
    // Colour palette picked in the builder; recolours the setting's wallpaper, map and ledges.
    k.optOneOf(c.palette, SCENERY.palettes, 'palette');
    errs.push(...fontsProblems(c.fonts));
    k.optOneOf(c.lang, LANGS, 'lang');
    const [min, max] = QUESTION_RANGE[type] || [3, 15];
    if (!Array.isArray(c.questions) || c.questions.length < min) errs.push(`Need at least ${min} questions`);
    else if (c.questions.length > max) errs.push(`At most ${max} questions for this game`);
    const ids = new Set();
    (Array.isArray(c.questions) ? c.questions : []).forEach((q, i) => validateQuestion(q, i, errs, ids));
    return errs;
  }

  /* Accepts both the common shape (id/ending) and the original CASE shape (caseId/solution). */
  function normalizeDetective(c) {
    if (!c || typeof c !== 'object') return c;
    const n = Object.assign({}, c);
    if (n.id === undefined && n.caseId !== undefined) n.id = n.caseId;
    if (n.caseId === undefined && n.id !== undefined) n.caseId = n.id;
    if (n.ending === undefined && n.solution !== undefined) n.ending = n.solution;
    if (n.solution === undefined && n.ending !== undefined) n.solution = n.ending;
    return n;
  }

  function validateDetective(config) {
    const c = normalizeDetective(config);
    const errs = validateCommon(c, 'detective');
    const k = checker(errs);
    k.str(c && c.caseNumber, 'caseNumber', 40);
    const d = c && c.detective;
    if (!d || !isStr(d.name) || !isStr(d.introLine)) errs.push('Missing detective');
    else {
      k.str(d.name, 'detective name', 60);
      k.optStr(d.title, 'detective title', 80);
      k.str(d.introLine, 'detective introLine', 300);
      k.optStr(d.catchphrase, 'detective catchphrase', 80);
      if (d.look) {
        if (d.look.hat !== undefined) k.oneOf(d.look.hat, ENUMS.detective.hat, 'detective hat');
        if (d.look.accessory !== undefined) k.oneOf(d.look.accessory, ENUMS.detective.accessory, 'detective accessory');
        ['coatColor', 'accentColor', 'skinTone'].forEach(p => { if (d.look[p] !== undefined) k.hex(d.look[p], 'detective ' + p); });
        k.optBool(d.look.apron, 'detective apron');
      }
    }
    ((c && c.questions) || []).forEach((q, i) => {
      if (!q) return;
      const at = `Question ${i + 1}: `;
      if (!isStr(q.clue) || !q.witness || !isStr(q.witness.name)) errs.push(at + 'missing clue or witness');
      else {
        k.str(q.witness.name, at + 'witness name', 60);
        k.optStr(q.witness.role, at + 'witness role', 80);
        if (q.witness.initial !== undefined) k.str(q.witness.initial, at + 'witness initial', 3);
        k.optOneOf(q.witness.outfit, OUTFITS, at + 'witness outfit');
        k.str(q.clue, at + 'clue', 200);
      }
      k.optStr(q.setup, at + 'setup', 300);
      k.optStr(q.detectiveNote, at + 'detectiveNote', 200);
      ['setup', 'clue', 'detectiveNote'].forEach(f => k.neutral(q[f], at + f));
    });
    return errs;
  }

  function validateRpg(c) {
    const errs = validateCommon(c, 'rpg');
    if (!c || typeof c !== 'object') return errs;
    const k = checker(errs);
    const h = c.hero;
    if (!h || typeof h !== 'object') errs.push('Missing hero');
    else {
      k.str(h.name, 'hero name', 60);
      k.str(h.introLine, 'hero introLine', 300);
      k.neutral(h.introLine, 'hero introLine');
      const look = h.look || {};
      ['outfitColor', 'accentColor', 'skinTone'].forEach(p => k.hex(look[p], 'hero ' + p));
      k.oneOf(look.headgear, ENUMS.rpg.headgear, 'hero headgear');
      k.oneOf(look.item, ENUMS.rpg.item, 'hero item');
      k.optBool(look.apron, 'hero apron');
    }
    const rpgKinds = ENUMS.rpg.kind.concat(ENUMS.rpg.indoor);
    const w = c.world;
    if (!w || typeof w !== 'object') errs.push('Missing world');
    else {
      k.str(w.name, 'world name', 60);
      k.oneOf(w.palette, ENUMS.rpg.palette, 'world palette');
      if (!w.destination || typeof w.destination !== 'object') errs.push('Missing world destination');
      else { k.str(w.destination.name, 'destination name', 40); k.oneOf(w.destination.kind, rpgKinds, 'destination kind'); }
    }
    const qs = Array.isArray(c.questions) ? c.questions : [];
    if (!Array.isArray(c.stops)) errs.push('Missing stops');
    else {
      if (c.stops.length !== qs.length) errs.push(`Need exactly one stop per question (${c.stops.length} stops, ${qs.length} questions)`);
      const qids = new Set(qs.map(q => q && q.id));
      const seen = new Set();
      c.stops.forEach((s, i) => {
        const at = `Stop ${i + 1}: `;
        if (!s || typeof s !== 'object') { errs.push(at + 'is not an object'); return; }
        if (!qids.has(s.questionId)) errs.push(at + `questionId ${s.questionId} does not match a question`);
        else if (seen.has(s.questionId)) errs.push(at + `question ${s.questionId} already has a stop`);
        else seen.add(s.questionId);
        if (qs[i] && s.questionId !== qs[i].id) errs.push(at + `must link to question ${qs[i].id} (stops follow question order)`);
        k.str(s.place, at + 'place', 40);
        k.oneOf(s.kind, rpgKinds, at + 'kind');
        if (!s.inhabitant || typeof s.inhabitant !== 'object') errs.push(at + 'missing inhabitant');
        else {
          k.str(s.inhabitant.name, at + 'inhabitant name', 60); k.str(s.inhabitant.role, at + 'inhabitant role', 80);
          k.optOneOf(s.inhabitant.outfit, OUTFITS, at + 'inhabitant outfit');
        }
        k.str(s.line, at + 'line', 300);
        if (!s.item || typeof s.item !== 'object') errs.push(at + 'missing item');
        else { k.str(s.item.name, at + 'item name', 40); k.oneOf(s.item.icon, ENUMS.rpg.icon, at + 'item icon'); }
        k.str(s.guideNote, at + 'guideNote', 200);
        ['line', 'guideNote'].forEach(f => k.neutral(s[f], at + f));
      });
    }
    return errs;
  }

  function validateQuiz(c) {
    const errs = validateCommon(c, 'quiz');
    if (!c || typeof c !== 'object') return errs;
    const k = checker(errs);
    const h = c.host;
    if (!h || typeof h !== 'object') errs.push('Missing host');
    else {
      k.str(h.name, 'host name', 60);
      k.str(h.catchphrase, 'host catchphrase', 80);
      k.str(h.introLine, 'host introLine', 300);
      ['catchphrase', 'introLine'].forEach(f => k.neutral(h[f], 'host ' + f));
      const look = h.look || {};
      ['suitColor', 'accentColor', 'skinTone'].forEach(p => k.hex(look[p], 'host ' + p));
      k.oneOf(look.hair, ENUMS.quiz.hair, 'host hair');
      k.oneOf(look.accessory, ENUMS.quiz.accessory, 'host accessory');
      k.optBool(look.apron, 'host apron');
    }
    const s = c.show;
    if (!s || typeof s !== 'object') errs.push('Missing show');
    else { k.str(s.name, 'show name', 60); k.oneOf(s.palette, ENUMS.quiz.palette, 'show palette'); }
    (Array.isArray(c.questions) ? c.questions : []).forEach((q, i) => {
      if (!q) return;
      const at = `Question ${i + 1}: `;
      k.str(q.roundTitle, at + 'roundTitle', 60);
      k.str(q.hostLine, at + 'hostLine', 200);
      ['roundTitle', 'hostLine'].forEach(f => k.neutral(q[f], at + f));
    });
    return errs;
  }

  function validatePlatformer(c) {
    const errs = validateCommon(c, 'platformer');
    if (!c || typeof c !== 'object') return errs;
    const k = checker(errs);
    const r = c.runner;
    if (!r || typeof r !== 'object') errs.push('Missing runner');
    else {
      k.str(r.name, 'runner name', 60);
      k.optStr(r.introLine, 'runner introLine', 300);
      k.neutral(r.introLine, 'runner introLine');
      const look = r.look || {};
      ['bodyColor', 'accentColor', 'skinTone'].forEach(p => k.hex(look[p], 'runner ' + p));
      k.oneOf(look.headgear, ENUMS.platformer.headgear, 'runner headgear');
      k.optBool(look.apron, 'runner apron');
    }
    const l = c.level;
    if (!l || typeof l !== 'object') errs.push('Missing level');
    else {
      k.optStr(l.name, 'level name', 60);
      k.oneOf(l.theme, ENUMS.platformer.theme, 'level theme');
      k.oneOf(l.palette, ENUMS.platformer.palette, 'level palette');
    }
    (Array.isArray(c.questions) ? c.questions : []).forEach((q, i) => {
      if (!q) return;
      const at = `Question ${i + 1}: `;
      k.str(q.checkpointName, at + 'checkpointName', 40);
      k.str(q.cheerLine, at + 'cheerLine', 160);
      ['checkpointName', 'cheerLine'].forEach(f => k.neutral(q[f], at + f));
    });
    return errs;
  }

  /* Cheap keyword guess at the business setting, passed to the AI as a hint (no extra AI call). */
  // Order breaks ties, most specific first; office is last because "staff" words show up everywhere.
  const SETTING_WORDS = {
    // Rural programmes. Devanagari words sit outside \b, which only knows Latin letters.
    village: /\b(villages?|villagers?|rural|gram|panchayats?|sarpanch|farmers?|farming|kisans?|agricultur(e|al)|crops?|harvests?|self[- ]help groups?|shgs?|anganwadis?|asha workers?|livestock|smallholders?|tehsil|taluka|block office)\b|गाँव|गांव|ग्राम|पंचायत|किसान|खेती|ग्रामीण/i,
    cafe: /(caf[eé]s?\b|\bcoffee|\bespresso|\bbaristas?\b|\btea ?rooms?\b|\btea ?house\b)/i,
    bakery: /\b(bakery|bakeries|bakeshop|bakehouse|patisserie|p[aâ]tisserie|boulangerie|cake ?shop|cakes?|cupcakes?|pastry|pastries|bread|baker|bakers|donuts?|doughnuts?|croissants?|bagels?)\b/i,
    restaurant: /\b(restaurants?|bistros?|diners?|eatery|eateries|trattoria|pizzeria|brasserie|steakhouse|takeaway|take-away|dining|menu|chefs?|waiters?|waitress(es)?)\b/i,
    salon: /\b(salons?|hair ?dressers?|hair ?stylists?|haircuts?|barbers?|barbershop|spa|spas|nail (bar|studio|salon)|beauty|manicure|stylists?)\b/i,
    gym: /\b(gyms?|fitness|workouts?|personal train(er|ers|ing)|crossfit|yoga|pilates|leisure cent(er|re)|sports cent(er|re)|members(hip)?)\b/i,
    clinic: /\b(clinics?|dental|dentists?|medical|physio|physiotherapy|pharmacy|pharmacies|health ?cent(er|re)|doctors?|hospital|patients?|veterinary|vets?|surgery)\b/i,
    hotel: /\b(hotels?|hostels?|inns?|resorts?|b&b|bed and breakfast|guest ?house|lodges?|motels?|guests? stay|check-in)\b/i,
    // Pet shops and clothes shops come before the general shop, so "pet shop" and "clothing store" win their ties with "shop".
    petshop: /\b(pet ?shops?|pet ?stores?|pets?|dogs?|puppy|puppies|cats?|kittens?|aquariums?|fish ?tanks?|pet ?food|paws|kennels?)\b/i,
    fashion: /\b(boutiques?|fashion|clothing|clothes|apparel|garments?|shoes|footwear|sarees?|kurtis?|tailors?|tailoring|textiles?)\b/i,
    retail: /\b(shops?|stores?|retail|retailers?|outlets?|supermarkets?|hypermarkets?|marts?|grocers?|grocery|groceries|kirana|provisions?|electronics|hardware|stationery|shoppers?)\b/i,
    school: /\b(schools?|academy|academies|college|classrooms?|pupils?|students?|teachers?|tuition|university|campus|nursery|kindergarten|parents)\b/i,
    office: /\b(offices?|workplace|co-?working|workspace|headquarters|hq|employees?|staff engagement|hybrid work)\b/i
  };
  // Scores each setting by keyword hits, counting the company name three times; ties go to the earlier setting.
  function detectSetting(company, goal) {
    const hits = (text, re) => (String(text || '').match(new RegExp(re.source, 'gi')) || []).length;
    let best = 'none', bestScore = 0;
    const scores = {};
    for (const [setting, re] of Object.entries(SETTING_WORDS)) {
      const score = scores[setting] = hits(company, re) * 3 + hits(goal, re);
      if (score > bestScore) { best = setting; bestScore = score; }
    }
    // "Shop" and "store" say little on their own: any pet or clothes word means that kind of shop.
    if (best === 'retail' && (scores.petshop || scores.fashion)) best = scores.petshop >= scores.fashion ? 'petshop' : 'fashion';
    return best;
  }

  /* Replaces invalid picks in decorative fields (costumes, icons, scenery) with safe defaults, so a slip there doesn't
     cost a second AI call. Survey text and questions are never touched. Returns the list of fixes made. */
  function repairArt(type, c) {
    const fixes = [];
    if (!c || typeof c !== 'object') return fixes;
    const fix = (obj, key, list, fallback, label) => {
      if (!obj || typeof obj !== 'object' || list.includes(obj[key])) return;
      fixes.push(`${label}: ${JSON.stringify(obj[key])} → ${JSON.stringify(fallback)}`);
      obj[key] = fallback;
    };
    if (c.setting !== undefined) fix(c, 'setting', SETTINGS, 'none', 'setting');
    if (c.palette !== undefined && !SCENERY.palettes.includes(c.palette)) { fixes.push(`palette: ${JSON.stringify(c.palette)} → removed`); delete c.palette; }
    if (fontsProblems(c.fonts).length) { fixes.push(`fonts: ${JSON.stringify(c.fonts)} → removed`); delete c.fonts; }
    if (c.scenery !== undefined) {
      if (c.setting === 'custom') c.scenery = cleanScenery(c.scenery); else delete c.scenery;
      if (!c.scenery) delete c.scenery;
    }
    const setting = c.setting && c.setting !== 'none' ? c.setting : null;
    const apron = look => { if (look && typeof look === 'object' && look.apron !== undefined && typeof look.apron !== 'boolean') look.apron = look.apron === 'true'; };
    const outfit = (p, label) => { if (p && p.outfit !== undefined) fix(p, 'outfit', OUTFITS, 'casual', label); };
    const qs = Array.isArray(c.questions) ? c.questions : [];
    if (type === 'detective' && c.detective) {
      const look = c.detective.look;
      if (look) { fix(look, 'hat', ENUMS.detective.hat, 'fedora', 'detective hat'); fix(look, 'accessory', ENUMS.detective.accessory, 'magnifier', 'detective accessory'); apron(look); }
      qs.forEach((q, i) => outfit(q && q.witness, `question ${i + 1} witness outfit`));
    }
    if (type === 'rpg') {
      const look = c.hero && c.hero.look;
      if (look) { fix(look, 'headgear', ENUMS.rpg.headgear, 'none', 'hero headgear'); fix(look, 'item', ENUMS.rpg.item, 'satchel', 'hero item'); apron(look); }
      const kinds = setting ? INDOOR_KINDS[setting] : ENUMS.rpg.kind, allKinds = ENUMS.rpg.kind.concat(ENUMS.rpg.indoor);
      if (c.world) {
        fix(c.world, 'palette', ENUMS.rpg.palette, 'meadow', 'world palette');
        fix(c.world.destination, 'kind', allKinds, kinds[kinds.length - 1], 'destination kind');
      }
      (Array.isArray(c.stops) ? c.stops : []).forEach((st, i) => {
        if (!st || typeof st !== 'object') return;
        fix(st, 'kind', allKinds, kinds[i % kinds.length], `stop ${i + 1} kind`);
        outfit(st.inhabitant, `stop ${i + 1} inhabitant outfit`);
        fix(st.item, 'icon', ENUMS.rpg.icon, 'gem', `stop ${i + 1} item icon`);
      });
    }
    if (type === 'quiz') {
      const look = c.host && c.host.look;
      if (look) { fix(look, 'hair', ENUMS.quiz.hair, 'bob', 'host hair'); fix(look, 'accessory', ENUMS.quiz.accessory, 'microphone', 'host accessory'); apron(look); }
      if (c.show) fix(c.show, 'palette', ENUMS.quiz.palette, 'electric', 'show palette');
    }
    if (type === 'platformer') {
      const look = c.runner && c.runner.look;
      if (look) { fix(look, 'headgear', ENUMS.platformer.headgear, 'cap', 'runner headgear'); apron(look); }
      if (c.level) { fix(c.level, 'theme', ENUMS.platformer.theme, 'rooftops', 'level theme'); fix(c.level, 'palette', ENUMS.platformer.palette, 'day', 'level palette'); }
    }
    return fixes;
  }

  const VALIDATORS = { detective: validateDetective, rpg: validateRpg, quiz: validateQuiz, platformer: validatePlatformer };

  function validateGame(type, config) {
    const v = VALIDATORS[type];
    return v ? v(config) : [`Unknown game type ${type}`];
  }

  return {
    QUESTION_TYPES, ENUMS, SETTINGS, SKIN_TONES, FONT_CHOICES, castMainCharacter, OUTFITS, INDOOR_KINDS, QUESTION_RANGE, detectSetting, GAME_TYPES: Object.keys(VALIDATORS), SCENERY, cleanScenery,
    validateGame, normalizeDetective, repairArt,
    validateCase: validateDetective, validateRpg, validateQuiz, validatePlatformer
  };
});
