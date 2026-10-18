/* RPG quest engine. Story content comes from the config; UI copy can be overridden via config.ui. */
(function () {
  const QP = window.QP, el = QP.el;
  const UI = {
    realm: '{world} · {company}', docTitle: 'Quest: {title}', guide: 'Your guide', begin: 'Set out',
    submit: 'Answer', skip: 'Skip this one', textPlaceholder: 'Write your answer here',
    stopLabel: 'Stop {n} of {total} · {place}', progress: 'Stop {n} of {total}', received: 'You received',
    from: 'from {name}', quote: '{name}: "{note}"', travel: 'Travel on to {place}', travelLast: 'Journey to {place}',
    travelling: 'Travelling to {place}…', arrived: 'Arrived at {place}.', gained: '{item} added to your satchel.',
    journeyDone: 'Journey complete', endTitle: 'The journey\'s end', thanks: 'Thank you for sharing your thoughts along the way.',
    skipped: 'Skipped',
    restart: 'Begin the journey again', satchel: 'Satchel', tally: 'Items found: {n} of {total}', itemMissing: 'Item {n} not found yet',
    itemFound: '{item}, from {place}', mapTitle: 'Map of {world}', mapDesc: '{name} is at {place}. {visited} of {total} stops visited.',
    trailhead: 'the trailhead'
  };

  const $ = s => document.querySelector(s);
  const stage = $('#stage'), mapBox = $('#mapBox'), items = $('#items');
  let C, ui, session, idx = -1, pos = 0, P = [], fresh = null, moving = false;

  /* ---------- drawing ---------- */
  function heroArt(look) {
    const o = look.outfitColor, a = look.accentColor, s = look.skinTone, hair = '#4A2E1C';
    const hairBack = `<path d="M42 54 Q41 34 60 33 Q79 34 78 54 L78 60 Q72 47 60 47 Q48 47 42 60Z" fill="${hair}"/>`;
    const gear = {
      hood: { back: `<path d="M35 62 Q33 24 60 22 Q87 24 85 62 Q84 76 76 82 L44 82 Q36 76 35 62Z" fill="${o}"/>`,
        front: `<path d="M41 52 Q43 31 60 30 Q77 31 79 52" fill="none" stroke="#00000044" stroke-width="3"/>` },
      'wide-hat': { back: hairBack, front: `<ellipse cx="60" cy="38" rx="33" ry="7" fill="#4A3826"/><path d="M44 38 Q45 17 60 16 Q75 17 76 38Z" fill="#4A3826"/><rect x="44.5" y="30" width="31" height="5" fill="${a}"/>` },
      circlet: { back: `<path d="M41 56 Q40 32 60 31 Q80 32 79 56 L80 76 L72 70 Q66 46 60 46 Q54 46 48 70 L40 76Z" fill="${hair}"/>`,
        front: `<path d="M43 43 Q60 35 77 43" fill="none" stroke="#D4A72C" stroke-width="3"/><circle cx="60" cy="38.5" r="3.2" fill="${a}" stroke="#8A6A16" stroke-width="1"/>` },
      cap: { back: hairBack, front: `<path d="M41 45 Q42 24 60 24 Q78 24 79 45Z" fill="${a}"/><path d="M75 31 Q90 15 97 27 Q88 26 79 37Z" fill="#F4EBD8" stroke="#00000033"/>` },
      toque: { back: hairBack, front: `<rect x="44" y="33" width="32" height="9" rx="2" fill="#FFFFFF" stroke="#3B2A1C" stroke-width="1.5"/><path d="M45 34 Q34 32 38 21 Q42 14 49 17 Q52 7 60 7 Q68 7 71 17 Q78 14 82 21 Q86 32 75 34Z" fill="#FFFFFF" stroke="#3B2A1C" stroke-width="1.5"/>` },
      none: { back: hairBack, front: `<path d="M42 49 Q44 30 60 30 Q76 30 78 49 Q70 39 60 39 Q50 39 42 49Z" fill="${hair}"/>` }
    }[look.headgear] || {};
    const item = {
      staff: `<line x1="93" y1="58" x2="88" y2="138" stroke="#6B4A2B" stroke-width="4" stroke-linecap="round"/><circle cx="93" cy="55" r="5.5" fill="${a}" stroke="#3B2A1C" stroke-width="1.5"/>`,
      lantern: `<circle cx="87" cy="125" r="12" fill="#FFD98A" opacity=".35"/><line x1="87" y1="110" x2="87" y2="115" stroke="#3B2A1C" stroke-width="2"/><path d="M81 115h12l-2 4h-8z" fill="#3B2A1C"/><rect x="82" y="119" width="10" height="13" rx="2" fill="#FFD98A" stroke="#3B2A1C" stroke-width="2"/><path d="M81 132h12" stroke="#3B2A1C" stroke-width="2.5"/>`,
      map: `<rect x="78" y="100" width="22" height="9" rx="4.5" fill="#F1E2B8" stroke="#3B2A1C" stroke-width="1.5"/><path d="M84 104.5h10" stroke="#8E2C1B" stroke-width="1.2" stroke-dasharray="2 2"/>`,
      satchel: `<path d="M46 80 L80 112" stroke="#6B4A2B" stroke-width="4"/><rect x="71" y="108" width="20" height="16" rx="3" fill="#8A5A34" stroke="#3B2A1C" stroke-width="1.5"/><path d="M71 112h20" stroke="${a}" stroke-width="3"/>`,
      flute: `<line x1="76" y1="101" x2="99" y2="88" stroke="#C9A36A" stroke-width="4" stroke-linecap="round"/><circle cx="85" cy="96" r="1" fill="#3B2A1C"/><circle cx="90" cy="93" r="1" fill="#3B2A1C"/>`,
      'rolling-pin': `<rect x="72" y="102" width="30" height="9" rx="4.5" fill="#D9A15E" stroke="#3B2A1C" stroke-width="1.5"/><rect x="64" y="104" width="9" height="5" rx="2.5" fill="#A86F45" stroke="#3B2A1C" stroke-width="1"/><rect x="101" y="104" width="9" height="5" rx="2.5" fill="#A86F45" stroke="#3B2A1C" stroke-width="1"/>`
    }[look.item] || '';
    const apron = look.apron ? `<path d="M47 90 H73 L78 127 Q60 131 42 127Z" fill="#FFFFFF" stroke="#3B2A1C" stroke-opacity=".35" stroke-width="1.5"/><path d="M49 90 L53 79 M71 90 L67 79" stroke="#FFFFFF" stroke-width="2.5"/><path d="M52 108h16" stroke="${a}" stroke-width="2.5"/>` : '';
    return `${gear.back || ''}
      <rect x="46" y="118" width="11" height="20" rx="3" fill="#3B2A1C"/><rect x="63" y="118" width="11" height="20" rx="3" fill="#3B2A1C"/>
      <path d="M34 128 L40 82 Q60 70 80 82 L86 128 Q60 134 34 128Z" fill="${o}"/>
      <path d="M38 104 Q60 109 82 104 L82 110 Q60 115 38 110Z" fill="${a}"/>
      <path d="M52 77 L60 88 L68 77" fill="none" stroke="#F4EBD8" stroke-width="3" stroke-linejoin="round"/>${apron}
      <path d="M80 84 Q88 96 87 106" fill="none" stroke="${o}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="60" cy="52" r="17" fill="${s}"/>
      <circle cx="54" cy="53" r="2" fill="#1E1E1E"/><circle cx="66" cy="53" r="2" fill="#1E1E1E"/>
      <path d="M55 60 Q60 63 65 60" fill="none" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round"/>
      ${gear.front || ''}${item}<circle cx="87" cy="107" r="4.5" fill="${s}"/>`;
  }
  const heroSvg = label => svgEl(`<svg viewBox="0 0 120 140" role="img" aria-label="${esc(label)}">${heroArt(C.hero.look)}</svg>`);

  const ICONS = {
    lantern: '<circle cx="16" cy="18" r="11" fill="#FFD98A" opacity=".45"/><path class="ink" d="M13 6h6M16 3.5V6"/><path d="M11 9h10l-1 3h-8z" class="f-ink"/><rect x="11" y="12" width="10" height="13" rx="2" fill="#FFD98A" class="ink"/><path class="ink" d="M10 26h12M16 15v6"/>',
    map: '<path d="M4 8l8-3 8 3 8-3v19l-8 3-8-3-8 3z" fill="#F1E2B8" class="ink"/><path class="ink" d="M12 5v19M20 8v19"/><path d="M7 19q4-7 8-3t9-6" fill="none" stroke="#8E2C1B" stroke-width="1.6" stroke-dasharray="1.5 2.5" stroke-linecap="round"/>',
    key: '<circle cx="10" cy="16" r="5.5" fill="#D4A72C" class="ink"/><circle cx="10" cy="16" r="1.9" class="f-page"/><path class="ink" d="M15.5 16H28M24 16v4.5M28 16v3.5"/>',
    compass: '<circle cx="16" cy="16" r="11" fill="#E7D3A1" class="ink"/><path d="M16 6.5l3 9.5h-6z" fill="#8E2C1B"/><path d="M13 16h6l-3 9.5z" fill="#F4EBD8" class="ink"/><circle cx="16" cy="16" r="1.6" class="f-ink"/>',
    feather: '<path d="M25 4C14 6 8 14 8 24l3 3c9-1 15-8 14-23z" fill="#F4EBD8" class="ink"/><path class="ink" d="M7 28L21 11"/>',
    potion: '<rect x="13" y="3.5" width="6" height="4" rx="1" fill="#A0703F" class="ink"/><path d="M14 7.5h4v5.2a8 8 0 11-4 0z" fill="#F4EBD8" class="ink"/><path d="M8.8 20.5h14.4a7.3 7.3 0 01-14.4 0z" fill="#7B5BA6"/>',
    scroll: '<rect x="7" y="8" width="18" height="16" fill="#F1E2B8" class="ink"/><rect x="4" y="6" width="5" height="20" rx="2.5" fill="#E2C98F" class="ink"/><rect x="23" y="6" width="5" height="20" rx="2.5" fill="#E2C98F" class="ink"/><path class="ink" d="M12 13h8M12 17h8M12 21h5"/>',
    gem: '<path d="M9 7h14l5 7-12 13L4 14z" fill="#6FB0C4" class="ink"/><path class="ink" d="M4 14h24M12 7l-2 7 6 13 6-13-2-7"/>',
    rope: '<ellipse cx="16" cy="17" rx="11" ry="9" fill="#D2A86A" class="ink"/><ellipse cx="16" cy="17" rx="7" ry="5.5" fill="none" class="ink"/><ellipse cx="16" cy="17" rx="3" ry="2.2" class="f-page ink"/><path class="ink" d="M26 20q3 4 0 8"/>',
    apple: '<path d="M16 10c-3-3-10-2-10 6 0 7 5 12 8 11 1 0 1-1 2-1s1 1 2 1c3 1 8-4 8-11 0-8-7-9-10-6z" fill="#B8432F" class="ink"/><path class="ink" d="M16 10V5"/><path d="M17 6q4-3 7 0-4 2-7 0z" fill="#6E8B4E"/>',
    bell: '<path d="M16 4.5a2 2 0 012 2v1.2a7 7 0 016 7v6l2 3H6l2-3v-6a7 7 0 016-7V6.5a2 2 0 012-2z" fill="#D4A72C" class="ink"/><circle cx="16" cy="27" r="2.5" class="f-ink"/>',
    boots: '<path d="M9 5h8v13l9 4v5H7z" fill="#7A4E2D" class="ink"/><path class="ink" d="M7 24h19M9 9h8"/>',
    book: '<path d="M7 5h16a2 2 0 012 2v20H9a2 2 0 01-2-2z" fill="#3F6B5A" class="ink"/><path class="ink" d="M7 25a2 2 0 012-2h16"/><path d="M12 10h8" stroke="#F4EBD8" stroke-width="1.6"/>',
    whisk: '<rect x="14" y="20" width="4" height="10" rx="2" fill="#A86F45" class="ink"/><path d="M16 20c-9-6-7-17 0-17s9 11 0 17zM16 20c-4-6-3-17 0-17s4 11 0 17z" fill="none" class="ink"/>',
    cupcake: '<path d="M9 17h14l-2 11H11z" fill="#F3E6D0" class="ink"/><path d="M11 17l1 11M16 17v11M21 17l-1 11" class="ink" opacity=".5"/><path d="M7 18q0-11 9-11t9 11z" fill="#F7B8C8" class="ink"/><circle cx="16" cy="6" r="2.6" fill="#C0392B"/>',
    croissant: '<path d="M3 23q3-15 13-15t13 15q-5-4-8-1-2-7-5-7t-5 7q-3-3-8 1z" fill="#D9963F" class="ink"/><path d="M11 12q2 4 1 9M21 12q-2 4-1 9" fill="none" class="ink" opacity=".6"/>',
    'piping-bag': '<path d="M4 9q6-7 14-3l8 17-4 3z" fill="#F4EBD8" class="ink"/><path d="M4 9q6-7 14-3" fill="none" stroke="#7DB46C" stroke-width="3"/><path d="M22 26l4-3 3 5-3 2z" fill="#A3A9B0" class="ink"/><circle cx="28.5" cy="30" r="1.8" fill="#F7B8C8"/>',
    coffee: '<path d="M7 12h16v9a8 7 0 0 1-16 0z" fill="#FFFFFF" class="ink"/><path d="M8 13h14v3H8z" fill="#8C5A3A"/><path d="M23 14q6 0 5 5t-5 4" fill="none" class="ink"/><path d="M12 9q-2-3 1-6M18 9q-2-3 1-6" fill="none" class="ink"/><path d="M5 28h22" class="ink"/>',
    plate: '<ellipse cx="16" cy="19" rx="13" ry="6" fill="#FFFFFF" class="ink"/><ellipse cx="16" cy="19" rx="8" ry="3.4" fill="none" class="ink" opacity=".45"/><path d="M11 18q5-9 10 0z" fill="#D9963F" class="ink"/><circle cx="18" cy="13" r="1.6" fill="#6E8B4E"/>',
    'shopping-bag': '<path d="M7 11h18l2 17H5z" fill="#E85D75" class="ink"/><path d="M11 11V8a5 5 0 0 1 10 0v3" fill="none" class="ink"/>',
    'price-tag': '<path d="M4 16L16 4h11v11L15 27z" fill="#F2C14E" class="ink"/><circle cx="22" cy="9" r="2.2" class="f-page ink"/>',
    scissors: '<circle cx="9" cy="23" r="4" fill="#F4EBD8" class="ink"/><circle cx="21" cy="24" r="4" fill="#F4EBD8" class="ink"/><path d="M11 20L24 4M19 21L12 5" class="ink"/>',
    comb: '<rect x="4" y="11" width="24" height="6" rx="1.5" fill="#9B6BC4" class="ink"/><path d="M6 17v8M9.5 17v8M13 17v8M16.5 17v8M20 17v8M23.5 17v8M27 17v6" class="ink"/>',
    dumbbell: '<rect x="9" y="14.5" width="14" height="3" fill="#8A8F96" class="ink"/><rect x="3" y="8" width="6" height="16" rx="1.5" fill="#2B2F33" class="ink"/><rect x="23" y="8" width="6" height="16" rx="1.5" fill="#2B2F33" class="ink"/>',
    'water-bottle': '<rect x="12" y="3" width="8" height="4" rx="1" fill="#2B2F33" class="ink"/><path d="M11 7h10v19a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z" fill="#7FB5E0" class="ink"/><path d="M11 15h10" class="ink"/>',
    towel: '<rect x="6" y="5" width="20" height="22" rx="1" fill="#F7B8C8" class="ink"/><path d="M6 20h20M6 23h20" stroke="#FFFFFF" stroke-width="1.6"/><path d="M11 5v22" class="ink" opacity=".35"/>',
    clipboard: '<rect x="6" y="5" width="20" height="24" rx="2" fill="#A0703F" class="ink"/><rect x="9" y="9" width="14" height="17" fill="#FFFFFF" class="ink"/><rect x="12" y="3" width="8" height="5" rx="1" fill="#8A8F96" class="ink"/><path d="M11 14h10M11 18h10M11 22h6" class="ink"/>',
    suitcase: '<rect x="4" y="11" width="24" height="16" rx="2" fill="#4F7CAC" class="ink"/><path d="M12 11V7h8v4" fill="none" class="ink"/><path d="M10 11v16M22 11v16" class="ink"/>',
    pencil: '<path d="M6 26l2-7L22 5l5 5-14 14z" fill="#F2C14E" class="ink"/><path d="M6 26l2-7 5 5z" fill="#F4EBD8" class="ink"/><path d="M19 8l5 5" class="ink"/>',
    laptop: '<rect x="7" y="7" width="18" height="14" rx="1" fill="#3B4A54" class="ink"/><rect x="9" y="9" width="14" height="10" fill="#7FB5E0"/><path d="M3 23h26l-2 3H5z" fill="#C9CED4" class="ink"/>',
    seed: '<path d="M16 28c-5 0-8-4-8-9 0-6 5-11 8-14 3 3 8 8 8 14 0 5-3 9-8 9z" fill="#A0703F" class="ink"/><path class="ink" d="M16 10v14"/><path d="M16 15q4-1 5-5M16 19q-4-1-5-5" class="ink" fill="none"/>',
    wheat: '<path d="M16 29V9M16 29l-6-12M16 29l6-12" class="ink"/><g fill="#D9A441" class="ink"><ellipse cx="16" cy="7" rx="2.6" ry="4.5"/><ellipse cx="9" cy="14" rx="2.4" ry="4" transform="rotate(-25 9 14)"/><ellipse cx="23" cy="14" rx="2.4" ry="4" transform="rotate(25 23 14)"/></g><path d="M11 23h10" stroke="#B8432F" stroke-width="2.4"/>',
    matka: '<path d="M11 6h10l-1 4q8 3 8 11 0 8-12 8T4 21q0-8 8-11z" fill="#B5563C" class="ink"/><path d="M8 17q8 3 16 0" fill="none" stroke="#F2C14E" stroke-width="1.8"/><path d="M11 6h10" class="ink"/>'
  };
  const itemSvg = (icon, label) => svgEl(`<svg viewBox="0 0 32 32" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}>${ICONS[icon] || ICONS.gem}</svg>`);

  /* Place pictures, drawn with their base at y=0 */
  const PLACES = {
    village: '<rect x="-15" y="-11" width="12" height="11" class="f-page ink"/><path d="M-17-10l8-8 8 8z" class="f-roof ink"/><rect x="1" y="-14" width="14" height="14" class="f-page ink"/><path d="M-1-13l9-9 9 9z" class="f-roof ink"/><rect x="6" y="-7" width="4" height="7" class="f-ink"/>',
    forest: '<path d="M-12 0v-5M0 0v-7M12 0v-5" class="s-ink"/><path d="M-18-5l6-15 6 15z" class="f-tree ink"/><path d="M-7-7l7-19 7 19z" class="f-tree ink"/><path d="M6-5l6-15 6 15z" class="f-tree ink"/>',
    bridge: '<path d="M-22-4q11-4 22 0t22 0" class="s-ink"/><path d="M-20-6q0-12 20-14 20 2 20 14z" class="f-rock ink"/><path d="M-9-6q0-9 9-9t9 9z" class="f-water ink"/><path d="M-22 0q5-3 11 0t11 0 11 0 11 0" class="s-ink"/>',
    river: '<path d="M-20-18c10 4 0 10 12 14s10-8 26-4" class="s-water"/><path d="M-12-10q3-2 6 0M4-8q3-2 6 0" class="s-ink"/>',
    mountain: '<path d="M-21 0l13-22 9 14 7-10 13 18z" class="f-rock ink"/><path d="M-12-15l4-7 4 7-4-1z" class="f-page"/><path d="M5-12l3-4 3 4z" class="f-page"/>',
    castle: '<rect x="-14" y="-16" width="28" height="16" class="f-page ink"/><rect x="-19" y="-24" width="9" height="24" class="f-rock ink"/><rect x="10" y="-24" width="9" height="24" class="f-rock ink"/><path d="M-19-24v-3h3v3M-13-24v-3h3v3M10-24v-3h3v3M16-24v-3h3v3" class="s-ink"/><path d="M-4 0v-7a4 4 0 018 0v7z" class="f-ink"/><path d="M0-16v-13l8 3-8 3" class="f-seal ink"/>',
    tower: '<rect x="-6" y="-24" width="12" height="24" class="f-rock ink"/><path d="M-9-24l9-12 9 12z" class="f-roof ink"/><rect x="-2" y="-18" width="4" height="6" class="f-ink"/>',
    lake: '<ellipse cx="0" cy="-8" rx="20" ry="8" class="f-water ink"/><path d="M-11-9q3-2 6 0M2-6q3-2 6 0" class="s-ink"/>',
    meadow: '<path d="M-18 0q3-10 6 0M-8 0q3-12 6 0M4 0q3-9 6 0M13 0q3-11 6 0" class="s-ink"/><path d="M-10-11v6M8-10v5" class="s-ink"/><circle cx="-10" cy="-12" r="2.6" class="f-seal"/><circle cx="8" cy="-11" r="2.6" fill="#D4A72C"/>',
    cave: '<path d="M-20 0q2-22 20-24 18 2 20 24z" class="f-rock ink"/><path d="M-8 0q1-12 8-13 7 1 8 13z" class="f-ink"/>',
    market: '<rect x="-15" y="-12" width="30" height="12" class="f-page ink"/><path d="M-18-12h36l-3-8h-30z" class="f-roof ink"/><path d="M-11-19.5l-1 7M-4-19.5v7M4-19.5v7M11-19.5l1 7" stroke="#F4EBD8" stroke-width="2.2"/><path d="M-18-12h36" class="s-ink"/>',
    harbor: '<path d="M-22 0q5-3 11 0t11 0 11 0 11 0" class="s-ink"/><path d="M-20-3h18v-4h-18z" class="f-roof ink"/><path d="M3-6h17l-3 6H6z" class="f-page ink"/><path d="M11-6v-16l7 12z" class="f-page ink"/>',
    mill: '<path d="M-8 0l3-18h10l3 18z" class="f-page ink"/><path d="M-5-18l5-6 5 6z" class="f-roof ink"/><path d="M0-20l-11-11M0-20l11-11M0-20l-11 11M0-20l11 11" class="s-ink"/><path d="M-11-31l3-1 2 4M11-31l-1 3 4 2" class="s-ink"/>',
    ruins: '<rect x="-16" y="-14" width="6" height="14" class="f-rock ink"/><rect x="-4" y="-21" width="6" height="21" class="f-rock ink"/><path d="M8 0v-9h6v4l-2 5z" class="f-rock ink"/><path d="M-18-16h10M-6-23h10" class="s-ink"/>',
    garden: '<path d="M-16 0v-12a16 14 0 0132 0v12h-6v-12a10 8 0 00-20 0v12z" class="f-tree ink"/><circle cx="-12" cy="-3" r="2.4" class="f-seal"/><circle cx="12" cy="-3" r="2.4" fill="#D4A72C"/>',
    camp: '<path d="M-17 0l12-20 12 20z" class="f-roof ink"/><path d="M-5 0v-12" class="s-ink"/><path d="M11 0l3.5-8 3.5 8z" fill="#E2793A"/><path d="M9 0h11" class="s-ink"/>',
    // Village stops
    field: '<path d="M-21 0l5-14h32l5 14z" fill="#8DBF6A" class="ink"/><path d="M-15 0l3-14M-6 0l1-14M3 0v-14M12 0l-1-14" stroke="#5E8C3A" stroke-width="1.6"/><path d="M-13-17v-6M-4-17v-7M5-17v-6M14-17v-7" stroke="#C9A04A" stroke-width="2" stroke-linecap="round"/>',
    well: '<path d="M-14 0v-12h28v12z" class="f-rock ink"/><path d="M-14-6h28M-7-12v6M6-6v6" class="s-ink"/><ellipse cx="0" cy="-12" rx="14" ry="3.5" class="f-water ink"/><path d="M-11-12v-14M11-12v-14M-13-26h26" class="s-ink"/><path d="M0-26v8" class="s-ink"/><path d="M-3-18h6v4h-6z" class="f-roof ink"/>',
    hut: '<rect x="-12" y="-13" width="24" height="13" fill="#C9A27A" class="ink"/><path d="M-17-11l17-15 17 15z" fill="#C99A4A" class="ink"/><path d="M-9-15l3-4M-2-19l2-3M5-17l3 3" class="s-ink" opacity=".6"/><rect x="-3" y="-8" width="6" height="8" class="f-ink"/>',
    banyan: '<path d="M-2 0v-14M6 0v-10M-10 0v-8" class="s-ink"/><path d="M-2-14q-4-6-12-6M-2-14q6-6 14-6" class="s-ink"/><path d="M-22-14q0-14 12-14 4-8 14-6 12-2 16 8 8 2 2 12z" class="f-tree ink"/><rect x="-14" y="-4" width="28" height="4" class="f-rock ink"/>'
  };
  /* Indoor stations for business settings, same scale and baseline as PLACES */
  const SHOP_PLACES = {
    oven: '<rect x="8" y="-36" width="7" height="12" class="f-rock ink"/><path d="M-18 0v-14a18 17 0 0136 0v14z" class="f-roof ink"/><path d="M-12-20h24M-16-10h32" class="s-ink" opacity=".35"/><path d="M-8 0v-7a8 8 0 0116 0v7z" class="f-ink"/><path d="M-5 0q1-7 3-3q2-6 4 0q1-3 3 3z" fill="#FFB547"/>',
    counter: '<rect x="-21" y="-14" width="42" height="14" class="f-rock ink"/><rect x="-23" y="-17" width="46" height="4" class="f-roof ink"/><rect x="-17" y="-29" width="22" height="12" rx="2" fill="#FFFFFF" fill-opacity=".7" class="ink"/><circle cx="-11" cy="-21" r="2.6" fill="#F7B8C8"/><circle cx="-4" cy="-21" r="2.6" fill="#F2C14E"/><rect x="8" y="-26" width="11" height="9" rx="1" class="f-page ink"/><path d="M-10-7h20" class="s-ink" opacity=".4"/>',
    'bread-shelf': '<rect x="-18" y="-32" width="36" height="32" class="f-page ink"/><path d="M-18-21h36M-18-10h36" class="s-ink"/><ellipse cx="-10" cy="-24.5" rx="5" ry="3.5" fill="#C98A4B" class="ink"/><ellipse cx="1" cy="-24.5" rx="5" ry="3.5" fill="#D9A15E" class="ink"/><ellipse cx="11" cy="-24.5" rx="4.5" ry="3.5" fill="#C98A4B" class="ink"/><rect x="-14" y="-16" width="26" height="5" rx="2.5" fill="#D08A3E" class="ink"/><ellipse cx="-6" cy="-3.5" rx="5" ry="3" fill="#D9963F" class="ink"/><ellipse cx="7" cy="-3.5" rx="5" ry="3" fill="#D9963F" class="ink"/>',
    'cake-stand': '<path d="M-10 0h20l-4-3h-12z" class="f-page ink"/><path d="M0-3v-6" class="s-ink"/><ellipse cx="0" cy="-9" rx="15" ry="2.8" class="f-page ink"/><rect x="-12" y="-21" width="24" height="12" rx="2" fill="#F7C5D2" class="ink"/><rect x="-7" y="-31" width="14" height="10" rx="2" fill="#FFF3E0" class="ink"/><circle cx="0" cy="-34" r="3" fill="#C0392B" class="ink"/><path d="M-12-16q3 3 6 0t6 0 6 0 6 0" fill="none" stroke="#FFFFFF" stroke-width="2"/>',
    pantry: '<rect x="-16" y="-34" width="32" height="34" class="f-rock ink"/><path d="M0-34V0" class="s-ink"/><rect x="-13" y="-30" width="10" height="14" class="f-page ink"/><rect x="3" y="-30" width="10" height="14" class="f-page ink"/><path d="M-11-24h6v6h-6zM5-23h6v5h-6z" fill="#E58FA6" opacity=".8"/><circle cx="-3" cy="-10" r="1.4" class="f-ink"/><circle cx="3" cy="-10" r="1.4" class="f-ink"/>',
    'cafe-table': '<path d="M0 0v-14" class="s-ink"/><path d="M-6 0h12" class="s-ink"/><ellipse cx="0" cy="-15" rx="14" ry="3.5" class="f-page ink"/><path d="M-20 0v-16M-20-9h6v9M20 0v-16M20-9h-6v9" class="s-ink"/><path d="M-4-18h7v-5h-7z" fill="#FFFFFF" class="ink"/><path d="M3-21q3 0 3 2t-3 1" fill="none" class="ink"/><path d="M-2-26q1-2 0-4M1-26q1-2 0-4" class="s-ink" opacity=".6"/>',
    'mixing-bench': '<rect x="-21" y="-14" width="42" height="5" class="f-rock ink"/><path d="M-17-9V0M17-9V0" class="s-ink"/><path d="M-12-14q0 9 9 9t9-9z" fill="#BFE0E8" class="ink"/><path d="M-12-14h18" class="s-ink"/><path d="M3-14l8-16M7-30q5-2 5 2" class="s-ink"/><ellipse cx="13" cy="-16" rx="5" ry="2" class="f-page ink"/>'
  };
  Object.assign(SHOP_PLACES, {
    'coffee-machine': '<rect x="-16" y="-14" width="32" height="14" class="f-rock ink"/><rect x="-10" y="-34" width="20" height="20" rx="2" fill="#C9CED4" class="ink"/><rect x="-6" y="-28" width="4" height="4" class="f-ink"/><rect x="2" y="-28" width="4" height="4" class="f-ink"/><path d="M-5-20h3v4h-3zM3-20h3v4h-3z" fill="#FFFFFF" class="ink"/><path d="M-3-38q-2-3 1-6M3-38q-2-3 1-6" class="s-ink"/>',
    sofa: '<rect x="-16" y="-26" width="32" height="13" rx="4" class="f-tree ink"/><path d="M-18 0v-13h36v13" class="f-tree ink"/><rect x="-22" y="-19" width="8" height="15" rx="3" class="f-tree ink"/><rect x="14" y="-19" width="8" height="15" rx="3" class="f-tree ink"/><path d="M0-25v12" class="s-ink" opacity=".4"/>',
    bookshelf: '<rect x="-16" y="-34" width="32" height="34" class="f-rock ink"/><path d="M-16-23h32M-16-12h32" class="s-ink"/><path d="M-13-24v-8h4v8zM-8-24v-6h4v6zM-3-24v-8h3v8zM5-24v-7h4v7z" fill="#B8432F" class="ink"/><path d="M-12-13v-8h4v8zM-7-13v-6h4v6zM2-13v-8h4v8zM8-13v-6h4v6z" fill="#4F7CAC" class="ink"/><path d="M-11-2v-8h4v8zM-5-2v-6h4v6zM4-2v-8h3v8z" fill="#F2C14E" class="ink"/>',
    stove: '<rect x="-16" y="-20" width="32" height="20" fill="#C9CED4" class="ink"/><rect x="-11" y="-14" width="22" height="10" class="f-ink"/><ellipse cx="-8" cy="-21" rx="5" ry="1.5" class="f-ink"/><path d="M2-21h12v-7H2z" fill="#8A8F96" class="ink"/><path d="M14-25h6" class="s-ink"/><path d="M5-32q-1-3 1-5M10-32q-1-3 1-5" class="s-ink"/>',
    'kitchen-pass': '<rect x="-20" y="-36" width="40" height="26" class="f-ink ink"/><rect x="-17" y="-33" width="34" height="20" fill="#9AA5B1"/><rect x="-22" y="-12" width="44" height="4" fill="#C9CED4" class="ink"/><ellipse cx="-9" cy="-13" rx="6" ry="1.8" fill="#FFFFFF" class="ink"/><ellipse cx="8" cy="-13" rx="6" ry="1.8" fill="#FFFFFF" class="ink"/><path d="M-13-14q4-6 8 0zM4-14q4-6 8 0z" class="f-seal"/><rect x="-18" y="-8" width="36" height="8" class="f-rock ink"/>',
    'dining-table': '<path d="M-20 0v-16M-20-9h6v9M20 0v-16M20-9h-6v9" class="s-ink"/><path d="M-8 0v-8M8 0v-8" class="s-ink"/><path d="M-13-14h26v6q-4 2-9 0t-8 0-9 0z" fill="#FFFFFF" class="ink"/><rect x="-1.5" y="-20" width="3" height="6" fill="#FFF3D6" class="ink"/><path d="M0-20q-2-3 0-5q2 2 0 5z" fill="#FFB547"/>',
    'host-stand': '<path d="M-8 0l2-20h12l2 20z" class="f-rock ink"/><path d="M-11-20h22l-3-6h-16z" class="f-roof ink"/><path d="M-5-24l5-2 5 2" fill="#FFFFFF" class="ink"/><path d="M16 0l-2-6h8l-2 6z" class="f-roof ink"/><path d="M18-6q-7-8 0-14q7 6 0 14z" class="f-tree ink"/>',
    'clothes-rack': '<path d="M-18 0v-30M18 0v-30M-20-30h40M-22 0h8M14 0h8" class="s-ink"/><path d="M-16-28h8l2 16h-12z" fill="#E85D75" class="ink"/><path d="M-5-28h8l2 19h-12z" fill="#4F7CAC" class="ink"/><path d="M6-28h8l2 14h-12z" fill="#F2C14E" class="ink"/>',
    'shop-shelf': '<rect x="-18" y="-32" width="36" height="32" class="f-page ink"/><path d="M-18-21h36M-18-10h36" class="s-ink"/><path d="M-15-22v-7h8v7zM-5-22v-5h8v5zM6-22v-8h8v8z" class="f-roof ink"/><path d="M-15-11v-6h8v6zM-4-11v-8h7v8zM6-11v-5h9v5z" class="f-tree ink"/><path d="M-14 0v-7h9v7zM-2 0v-5h8v5zM9 0v-7h6v7z" fill="#F2C14E" class="ink"/>',
    checkout: '<rect x="-20" y="-14" width="40" height="14" class="f-page ink"/><rect x="-22" y="-17" width="44" height="4" class="f-tree ink"/><rect x="-14" y="-27" width="14" height="10" rx="1" fill="#3B4A54" class="ink"/><rect x="-12" y="-33" width="10" height="6" fill="#7FD1C2" class="ink"/><path d="M6-17v-10h11v10z" class="f-roof ink"/><path d="M8.5-27q3-6 6 0" fill="none" class="ink"/>',
    'fitting-room': '<rect x="-16" y="-36" width="32" height="36" class="f-page ink"/><path d="M-18-36h36" class="s-ink"/><path d="M-15-35h17q-3 17 0 35h-17z" class="f-tree ink"/><path d="M-10-34q2 17 0 33M-4-34q2 17 0 33" class="s-ink" opacity=".4"/><rect x="5" y="-30" width="8" height="20" rx="3" fill="#DCEBF2" class="ink"/>',
    'shop-window': '<rect x="-20" y="-30" width="40" height="30" class="f-page ink"/><path d="M-22-30h44l-3-6h-38z" class="f-roof ink"/><path d="M-17-36l-1 6M-9-36v6M-1-36v6M7-36v6M15-36l1 6" stroke="#FFFFFF" stroke-width="2"/><rect x="-16" y="-25" width="22" height="18" class="f-water ink"/><path d="M-11-7v-9q0-4 3-4t3 4v9" class="f-tree"/><rect x="9" y="-25" width="8" height="25" class="f-rock ink"/>',
    'product-shelf': '<rect x="-18" y="-32" width="36" height="32" class="f-page ink"/><path d="M-18-21h36M-18-10h36" class="s-ink"/><path d="M-14-21v-7h4v7zM-6-21v-9h4v9zM2-21v-6h4v6zM10-21v-8h4v8z" class="f-tree ink"/><path d="M-14-10v-8h4v8zM-6-10v-6h4v6zM2-10v-8h4v8zM10-10v-7h4v7z" class="f-roof ink"/><path d="M-13 0v-6h6v6zM-3 0v-7h6v7zM7 0v-6h6v6z" fill="#F2C14E" class="ink"/>',
    'salon-chair': '<rect x="-16" y="-40" width="32" height="20" rx="3" fill="#DCEBF2" stroke="#C9A04A" stroke-width="2"/><path d="M-8 0h16M0 0v-8" class="s-ink"/><rect x="-11" y="-16" width="22" height="8" rx="3" class="f-tree ink"/><rect x="-8" y="-30" width="16" height="16" rx="4" class="f-tree ink"/>',
    'wash-basin': '<rect x="-15" y="-12" width="6" height="12" fill="#E7E2DA" class="ink"/><path d="M-22-16h20q0 6-10 6t-10-6z" fill="#FFFFFF" class="ink"/><path d="M-2-7l10-15h6l-8 15z" class="f-tree ink"/><rect x="-2" y="-9" width="22" height="7" rx="3" class="f-tree ink"/><path d="M2 0v-2M16 0v-2" class="s-ink"/>',
    'mirror-station': '<rect x="-14" y="-38" width="28" height="24" rx="3" fill="#DCEBF2" stroke="#C9A04A" stroke-width="2.5"/><circle cx="-10" cy="-38" r="2" fill="#FFF3C4" class="ink"/><circle cx="0" cy="-38" r="2" fill="#FFF3C4" class="ink"/><circle cx="10" cy="-38" r="2" fill="#FFF3C4" class="ink"/><rect x="-18" y="-12" width="36" height="4" class="f-page ink"/><rect x="-14" y="-8" width="28" height="8" class="f-rock ink"/><rect x="-12" y="-18" width="4" height="6" class="f-tree ink"/><rect x="6" y="-17" width="4" height="5" class="f-roof ink"/>',
    'reception-desk': '<path d="M-20 0v-14q20-6 40 0v14z" class="f-page ink"/><path d="M-21-14q21-7 42 0v3q-21-7-42 0z" class="f-tree ink"/><rect x="-11" y="-30" width="15" height="11" rx="1" fill="#3B4A54" class="ink"/><path d="M-3.5-19v2" class="s-ink"/><path d="M8-17q0-5 5-5t5 5z" fill="#C9A04A" class="ink"/>',
    treadmill: '<path d="M-20 0h30l4-6h-30z" class="f-ink ink"/><path d="M9-6l6-24h3l-6 24z" class="f-ink"/><rect x="10" y="-36" width="14" height="7" rx="2" class="f-rock ink"/><path d="M14-30l-16 5" class="s-ink"/>',
    'weights-rack': '<path d="M-18 0v-24M18 0v-24" class="s-ink"/><rect x="-20" y="-22" width="40" height="3" class="f-ink"/><rect x="-20" y="-10" width="40" height="3" class="f-ink"/><path d="M-16-25h8M-4-25h8M8-25h8M-16-13h8M-4-13h8M8-13h8" class="s-ink"/><path d="M-17-28v6M-7-28v6M-5-28v6M5-28v6M7-28v6M17-28v6M-17-16v6M-7-16v6M-5-16v6M5-16v6M7-16v6M17-16v6" stroke-width="3" class="s-ink"/>',
    'yoga-mat': '<rect x="-21" y="-4" width="32" height="4" rx="1" class="f-tree ink"/><circle cx="13" cy="-3" r="3.5" class="f-tree ink"/><circle cx="-6" cy="-15" r="10" class="f-water ink"/><path d="M-12-19q4-4 9-3" class="s-ink" opacity=".5"/>',
    lockers: '<rect x="-18" y="-34" width="36" height="34" class="f-water ink"/><path d="M-6-34v34M6-34v34" class="s-ink"/><path d="M-15-30h6M-3-30h6M9-30h6M-15-27h6M-3-27h6M9-27h6" class="s-ink"/><circle cx="-9" cy="-17" r="1.3" class="f-ink"/><circle cx="3" cy="-17" r="1.3" class="f-ink"/><circle cx="15" cy="-17" r="1.3" class="f-ink"/>',
    'water-cooler': '<rect x="-9" y="-20" width="14" height="20" rx="1" fill="#FFFFFF" class="ink"/><path d="M-8-20v-10q0-4 6-4t6 4v10z" class="f-water ink"/><rect x="-6" y="-15" width="3" height="3" fill="#2F9BD6"/><rect x="-1" y="-15" width="3" height="3" fill="#E85D75"/><path d="M12 0l-2-6h8l-2 6z" class="f-roof ink"/><path d="M14-6q-7-8 0-14q7 6 0 14z" class="f-tree ink"/>',
    'waiting-chairs': '<rect x="-22" y="-9" width="44" height="3" class="f-ink"/><path d="M-18 0v-6M18 0v-6" class="s-ink"/><rect x="-21" y="-22" width="12" height="13" rx="2" class="f-tree ink"/><rect x="-6" y="-22" width="12" height="13" rx="2" class="f-tree ink"/><rect x="9" y="-22" width="12" height="13" rx="2" class="f-tree ink"/>',
    'consult-room': '<rect x="-14" y="-36" width="24" height="36" class="f-water ink"/><rect x="-9" y="-31" width="14" height="9" fill="#FFFFFF" class="ink"/><circle cx="5" cy="-16" r="1.6" class="f-ink"/><circle cx="17" cy="-30" r="6" class="f-tree ink"/><path d="M17-34v8M13-30h8" stroke="#FFFFFF" stroke-width="2"/>',
    'guest-room': '<rect x="-22" y="-26" width="5" height="26" class="f-rock ink"/><rect x="-20" y="-11" width="40" height="11" class="f-page ink"/><rect x="-16" y="-17" width="11" height="6" rx="2" fill="#FFFFFF" class="ink"/><path d="M-4-11v-6h24v6z" class="f-tree ink"/><path d="M18 0v-2" class="s-ink"/>',
    lift: '<rect x="-14" y="-38" width="28" height="38" fill="#C9A04A" class="ink"/><rect x="-11" y="-34" width="11" height="34" fill="#B8BEC6" class="ink"/><rect x="0" y="-34" width="11" height="34" fill="#B8BEC6" class="ink"/><path d="M17-24l3-4 3 4zM17-20l3 4 3-4z" class="f-ink"/>',
    'luggage-cart': '<path d="M-16 -2v-28q16-10 32 0v28" fill="none" stroke="#C9A04A" stroke-width="2.5"/><rect x="-18" y="-4" width="36" height="4" fill="#C9A04A" class="ink"/><rect x="-12" y="-16" width="14" height="12" rx="2" class="f-roof ink"/><rect x="3" y="-20" width="10" height="16" rx="2" class="f-tree ink"/><rect x="-10" y="-26" width="10" height="10" rx="2" fill="#4F7CAC" class="ink"/>',
    'office-desk': '<path d="M-18 0v-14M18 0v-14" class="s-ink"/><rect x="-20" y="-16" width="40" height="3" class="f-page ink"/><rect x="-10" y="-32" width="18" height="12" rx="1" fill="#3B4A54" class="ink"/><rect x="-8" y="-30" width="14" height="8" class="f-water"/><path d="M-1-20v4" class="s-ink"/><path d="M12-16l1-6h5l1 6z" fill="#FFFFFF" class="ink"/>',
    'meeting-table': '<rect x="-22" y="-24" width="9" height="11" rx="3" class="f-tree ink"/><rect x="-4.5" y="-26" width="9" height="11" rx="3" class="f-tree ink"/><rect x="13" y="-24" width="9" height="11" rx="3" class="f-tree ink"/><ellipse cx="0" cy="-12" rx="21" ry="5" class="f-rock ink"/><path d="M-12-8v8M12-8v8" class="s-ink"/>',
    whiteboard: '<path d="M-12 0l4-12M12 0l-4-12" class="s-ink"/><rect x="-18" y="-36" width="36" height="24" fill="#FFFFFF" class="ink"/><rect x="-13" y="-20" width="4" height="5" fill="#4F7CAC"/><rect x="-7" y="-26" width="4" height="11" fill="#6E9F58"/><rect x="-1" y="-23" width="4" height="8" fill="#F2C14E"/><rect x="8" y="-33" width="6" height="6" fill="#F7E07A" class="ink"/>',
    'classroom-desk': '<path d="M-12 0v-12M12 0v-12" class="s-ink"/><rect x="-15" y="-14" width="30" height="3" fill="#E2B66B" class="ink"/><rect x="-6" y="-17" width="10" height="3" fill="#FFFFFF" class="ink"/><path d="M18 0v-9h6v9M18-9v-12" class="s-ink"/><circle cx="-10" cy="-18" r="2.6" fill="#C0392B" class="ink"/>',
    blackboard: '<path d="M-14 0l3-10M14 0l-3-10" class="s-ink"/><rect x="-20" y="-36" width="40" height="26" rx="1" class="f-rock ink"/><rect x="-17" y="-33" width="34" height="20" fill="#2E4A3A"/><path d="M-12-17l5-10 5 10z" fill="none" stroke="#F4EFE4" stroke-width="1.4"/><circle cx="7" cy="-22" r="4.5" fill="none" stroke="#F4EFE4" stroke-width="1.4"/>'
  });
  // General shop and pet shop stations
  Object.assign(SHOP_PLACES, {
    fridge: '<rect x="-14" y="-38" width="28" height="38" rx="2" fill="#E9EEF2" class="ink"/><rect x="-14" y="-38" width="28" height="7" rx="2" class="f-tree ink"/><rect x="-10" y="-28" width="20" height="24" fill="#CFE8F2" class="ink"/><path d="M-10-19h20M-10-11h20" class="s-ink" opacity=".5"/><path d="M-8-19v-6h3v6zM-3-19v-7h3v7zM2-19v-5h3v5zM-8-11v-6h3v6zM-2-11v-5h3v5zM4-11v-7h3v7z" class="f-roof"/>',
    'fruit-crates': '<rect x="-20" y="-11" width="40" height="11" fill="#C9A06A" class="ink"/><rect x="-16" y="-22" width="32" height="11" fill="#C9A06A" class="ink"/><path d="M-20-5h40M-16-16h32" stroke="#A87C4A" stroke-width="1.4"/><circle cx="-10" cy="-25" r="3.6" fill="#B8432F" class="ink"/><circle cx="-2" cy="-25" r="3.6" fill="#F28C28" class="ink"/><circle cx="6" cy="-25" r="3.6" fill="#B8432F" class="ink"/><circle cx="13" cy="-24" r="3.2" fill="#F2C14E" class="ink"/>',
    aquarium: '<rect x="-20" y="-12" width="40" height="12" class="f-roof ink"/><rect x="-20" y="-34" width="40" height="22" class="f-water ink"/><path d="M-20-15q10-3 20 0t20 0v3h-40z" fill="#E2C79A"/><path d="M-14-15q-3-6 0-11M14-15q3-7 0-12" stroke="#4E8A3E" stroke-width="1.6" fill="none"/><ellipse cx="-3" cy="-25" rx="5" ry="3" fill="#F28C28" class="ink"/><path d="M1-25l4-3v6z" fill="#F28C28"/><ellipse cx="7" cy="-19" rx="4" ry="2.5" fill="#F2C14E" class="ink"/>',
    'pet-food-shelf': '<rect x="-18" y="-34" width="36" height="34" class="f-page ink"/><path d="M-18-17h36" class="s-ink"/><path d="M-15-17v-12l2-2h8l2 2v12zM2-17v-12l2-2h8l2 2v12z" class="f-roof ink"/><circle cx="-9" cy="-23" r="2.2" fill="#FFFFFF"/><circle cx="8" cy="-23" r="2.2" fill="#FFFFFF"/><rect x="-14" y="-8" width="7" height="8" class="f-tree ink"/><rect x="-4" y="-8" width="7" height="8" fill="#F2C14E" class="ink"/><rect x="6" y="-8" width="7" height="8" class="f-tree ink"/>',
    'bird-cage': '<path d="M0 0v-12M-7 0h14" class="s-ink"/><path d="M-12-12v-14q12-16 24 0v14z" fill="#FFFFFF" fill-opacity=".4" class="ink"/><path d="M-6-12v-19M0-12v-21M6-12v-19" class="s-ink" opacity=".6"/><path d="M-12-12h24" class="s-ink"/><ellipse cx="1" cy="-19" rx="4.5" ry="3.5" fill="#F2C14E" class="ink"/><circle cx="4" cy="-23" r="2.5" fill="#F2C14E" class="ink"/>',
    'grooming-table': '<path d="M-14 0v-14M14 0v-14" class="s-ink"/><rect x="-18" y="-17" width="36" height="4" class="f-roof ink"/><path d="M10-17v-20h-8" class="s-ink"/><path d="M2-37v5" stroke="#B8432F" stroke-width="1.6"/><ellipse cx="-3" cy="-22" rx="9" ry="5" fill="#E9D3B0" class="ink"/><circle cx="6" cy="-26" r="4" fill="#E9D3B0" class="ink"/><path d="M-12-22q-4-3-2-7" stroke="#E9D3B0" stroke-width="2" fill="none"/>',
    'pet-bed': '<ellipse cx="0" cy="-4" rx="20" ry="5" fill="#B8432F" class="ink"/><ellipse cx="0" cy="-6" rx="15" ry="3" fill="#F2C14E"/><ellipse cx="-3" cy="-11" rx="10" ry="6" fill="#C9A06A" class="ink"/><circle cx="8" cy="-15" r="5" fill="#C9A06A" class="ink"/><path d="M5-19q-3 2-1 6" stroke="#8A5A3B" stroke-width="2" fill="none"/>'
  });
  const placeArt = kind => PLACES[kind] || SHOP_PLACES[kind] || PLACES.village;

  /* Small props scattered over indoor maps, two per setting */
  const DECOR = {
    sack: '<path d="M-6 0q-3-8 1-12l-1-3h12l-1 3q4 4 1 12z" class="f-page ink"/><path d="M0-9v5" stroke="#C9A04A" stroke-width="1.6"/>',
    wheat: '<path d="M0 0v-15M-4 0l4-8M4 0l-4-8" class="s-ink"/><path d="M0-9l-3-3M0-9l3-3M0-13l-3-3M0-13l3-3" stroke="#C9A04A" stroke-width="1.6" stroke-linecap="round"/>',
    cup: '<path d="M-5 0v-7h10v7z" fill="#FFFFFF" class="ink"/><path d="M5-5q3 0 3 2t-3 2" fill="none" class="ink"/>',
    plant: '<path d="M-4 0l-1-5h10l-1 5z" class="f-roof ink"/><path d="M0-5q-8-6-2-12q4 4 2 12zM0-5q8-6 2-12q-4 4-2 12z" class="f-tree ink"/>',
    chair: '<path d="M-5 0v-6h10v6M-5-6v-8" class="s-ink"/>',
    box: '<rect x="-6" y="-10" width="12" height="10" class="f-rock ink"/><path d="M-6-7h12" class="s-ink"/>',
    bag: '<path d="M-5 0v-9h10v9z" class="f-roof ink"/><path d="M-2-9q2-4 4 0" fill="none" class="ink"/>',
    book: '<rect x="-7" y="-4" width="14" height="4" fill="#4F7CAC" class="ink"/><rect x="-6" y="-8" width="12" height="4" fill="#F2C14E" class="ink"/>',
    weight: '<rect x="-6" y="-3" width="12" height="2" class="f-ink"/><rect x="-8" y="-6" width="3" height="8" class="f-ink"/><rect x="5" y="-6" width="3" height="8" class="f-ink"/>',
    case: '<rect x="-6" y="-10" width="12" height="10" rx="1.5" class="f-roof ink"/><path d="M-2-10v-2h4v2" fill="none" class="ink"/>',
    bottle: '<rect x="-2.5" y="-10" width="5" height="10" rx="1" class="f-tree ink"/><rect x="-1" y="-13" width="2" height="3" class="f-ink"/>',
    bowl: '<path d="M-7-5h14l-2 5h-10z" class="f-roof ink"/><path d="M-5-5q5-3 10 0" fill="#C9A06A"/>',
    ball: '<circle cx="0" cy="-5" r="5" fill="#E85D75" class="ink"/><path d="M-5-5q5 3 10 0" stroke="#FFFFFF" stroke-width="1.6" fill="none"/>'
  };
  const DECOR_BY_SETTING = {
    bakery: ['sack', 'wheat'], cafe: ['cup', 'plant'], restaurant: ['chair', 'plant'], retail: ['box', 'bag'], fashion: ['bag', 'box'], petshop: ['bowl', 'ball'], custom: ['plant', 'box'], salon: ['bottle', 'plant'],
    gym: ['weight', 'bottle'], clinic: ['plant', 'chair'], hotel: ['case', 'plant'], office: ['plant', 'box'], school: ['book', 'chair']
  };
  const OUTDOOR_SETTINGS = ['village'];
  const SIGNPOST = '<path d="M0 0v-20" class="s-ink"/><path d="M-9-19h15l3 3-3 3H-9z" class="f-page ink"/>';

  function svgEl(markup) { const d = document.createElement('div'); d.innerHTML = markup; return d.firstElementChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

  /* Lays the route out in rows that snake back and forth so long quests still fit. */
  function layout(total, rand) {
    const rows = total <= 6 ? 1 : total <= 12 ? 2 : 3, perRow = Math.ceil(total / rows);
    const W = 400, top = 58, rowH = 116;
    const pts = [];
    for (let i = 0; i < total; i++) {
      const r = Math.floor(i / perRow), k = i % perRow, n = Math.min(perRow, total - r * perRow);
      let x = 48 + (n === 1 ? .5 : k / (n - 1)) * (W - 96);
      if (r % 2) x = W - x;
      pts.push({ x: x + (rand() - .5) * 10, y: top + r * rowH + (rand() - .5) * 14 });
    }
    return { pts, rows, H: top + (rows - 1) * rowH + 84 };
  }

  function segment(i) {
    const p = k => P[Math.max(0, Math.min(P.length - 1, k))];
    const a = p(i - 1), b = p(i), c = p(i + 1), d = p(i + 2);
    const clamp = v => Math.max(10, Math.min(390, v));
    const c1 = { x: clamp(b.x + (c.x - a.x) / 6), y: b.y + (c.y - a.y) / 6 };
    const c2 = { x: clamp(c.x - (d.x - b.x) / 6), y: c.y - (d.y - b.y) / 6 };
    return `M${b.x.toFixed(1)} ${b.y.toFixed(1)}C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }

  function buildMap() {
    const N = C.questions.length, total = N + 2, rand = QP.seeded(C.id);
    // The village is walked outdoors with the open-land map; every other setting is a tiled indoor floor.
    const setting = QP.scenes.of(C), indoor = Boolean(setting) && !OUTDOOR_SETTINGS.includes(setting);
    const props = indoor ? (DECOR_BY_SETTING[setting] || ['plant', 'box']).map(k => DECOR[k]) : null;
    const { pts, H, rows } = layout(total, rand);
    P = pts;
    let decor = '';
    for (let r = 0; r <= rows; r++) {
      const band = r < rows ? 58 + r * 116 + 68 : null;
      if (band === null || band > H - 20) continue;
      for (let j = 0; j < 3; j++) {
        const x = 90 + rand() * 220, y = band + rand() * 10;
        decor += indoor
          ? `<g transform="translate(${x.toFixed(0)} ${(y + 6).toFixed(0)})" opacity=".75">${props[rand() > .5 ? 0 : 1]}</g>`
          : rand() > .5
          ? `<path d="M${x.toFixed(0)} ${y.toFixed(0)}q6-9 12 0q5-6 10 0" class="s-ink" opacity=".55"/>`
          : `<g transform="translate(${x.toFixed(0)} ${(y + 6).toFixed(0)}) scale(.45)" opacity=".7">${PLACES.forest}</g>`;
      }
    }
    const segs = P.slice(0, -1).map((_, i) => `<path class="route" data-seg="${i}" d="${segment(i)}"/>`).join('');
    const stops = P.map((p, i) => {
      const goal = i === total - 1, start = i === 0;
      const kind = goal ? C.world.destination.kind : start ? null : C.stops[i - 1].kind;
      // A custom business may bring its own icon for a stop; otherwise the hand-drawn one for its kind.
      const custom = !start && !goal && C.setting === 'custom' && QP.sceneryStopIcon ? QP.sceneryStopIcon(QP.scenes.scenery, C.stops[i - 1].questionId) : '';
      const art = start ? SIGNPOST : custom || placeArt(kind);
      const place = goal ? `<g class="place" transform="translate(${p.x.toFixed(1)} ${(p.y + 44).toFixed(1)}) scale(1.3)">${art}</g>`
        : `<g class="place" transform="translate(${p.x.toFixed(1)} ${(p.y + 37).toFixed(1)})">${art}</g>`;
      return `<g class="stop${goal ? ' goal' : ''}" data-p="${i}"><circle class="ring" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="9"/><circle class="dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5"/>${place}</g>`;
    }).join('');
    const g = P[total - 1];
    // Indoor settings draw the map as a tiled shop floor instead of open land.
    const floor = indoor ? `<defs><pattern id="floorTiles" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="14" height="14" class="f-shade"/><rect x="14" y="14" width="14" height="14" class="f-shade"/></pattern></defs><rect width="400" height="${H}" fill="url(#floorTiles)" opacity=".5"/>` : '';
    // Setting maps (indoor floors and the village) take their colours from core/scenes.js instead of a world palette.
    // A palette picked in the Game Editor recolours the plain-look map too.
    const map = setting ? QP.scenes.style(setting).map : (QP.scenes.palette(C) || {}).map;
    const palette = map ? `class="pal-setting" style="--land:${map[0]};--shade:${map[1]};--tree:${map[2]};--water:${map[3]};--roof:${map[4]};--rock:${map[5]}"` : `class="pal-${C.world.palette}"`;
    mapBox.innerHTML = `<svg viewBox="0 0 400 ${H}" role="img" aria-labelledby="mapTitle mapDesc" ${palette}>
      <title id="mapTitle"></title><desc id="mapDesc"></desc>
      <rect width="400" height="${H}" class="f-land"/>${floor}
      <rect x="5" y="5" width="390" height="${H - 10}" fill="none" class="ink" stroke-width="1" opacity=".6"/>
      ${decor}${segs}${stops}
      <text class="label" x="${g.x.toFixed(1)}" y="${(g.y + 64).toFixed(1)}" text-anchor="${g.x > 330 ? 'end' : g.x < 70 ? 'start' : 'middle'}">${esc(C.world.destination.name)}</text>
      <text class="label" id="hereLabel" text-anchor="middle"></text>
      <g id="traveller"><g id="facing"><g class="bob"><g transform="translate(-14 -40) scale(.24)">${heroArt(C.hero.look)}</g></g></g></g>
    </svg>`;
    mapBox.setAttribute('aria-label', QP.fill(ui.mapTitle, { world: C.world.name }));
  }

  function placeTraveller(x, y, dir) {
    const t = $('#traveller'), f = $('#facing');
    t.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    if (dir) f.setAttribute('transform', dir < 0 ? 'scale(-1 1)' : '');
  }

  function placeName(p) {
    if (p === 0) return ui.trailhead;
    if (p === P.length - 1) return C.world.destination.name;
    return C.stops[p - 1].place;
  }

  function updateMap() {
    document.querySelectorAll('.route').forEach(s => s.classList.toggle('walked', Number(s.dataset.seg) < pos));
    document.querySelectorAll('.stop').forEach(g => {
      const p = Number(g.dataset.p);
      g.classList.toggle('here', p === pos);
      g.classList.toggle('visited', p > 0 && p < P.length - 1 && session.has(C.questions[p - 1].id));
    });
    const label = $('#hereLabel'), here = P[pos];
    const showLabel = pos > 0 && pos < P.length - 1;
    label.textContent = showLabel ? placeName(pos) : '';
    label.setAttribute('x', here.x.toFixed(1));
    label.setAttribute('y', (here.y + 57).toFixed(1));
    label.setAttribute('text-anchor', here.x > 330 ? 'end' : here.x < 70 ? 'start' : 'middle');
    placeTraveller(here.x, here.y);
    $('#mapTitle').textContent = QP.fill(ui.mapTitle, { world: C.world.name });
    $('#mapDesc').textContent = QP.fill(ui.mapDesc, { name: C.hero.name, place: placeName(pos), visited: session.count(), total: C.questions.length });
  }

  function travel(to, done) {
    moving = true;
    const path = document.querySelector(`.route[data-seg="${pos}"]`);
    const trav = $('#traveller');
    const finish = () => {
      moving = false; pos = to; trav.classList.remove('walking');
      updateMap();
      announce(QP.fill(ui.arrived, { place: placeName(to) }));
      done();
    };
    if (!path || QP.reducedMotion()) return finish();
    $('#hereLabel').textContent = '';
    trav.classList.add('walking');
    const len = path.getTotalLength(), dur = 650 + len * 3.2;
    const t0 = performance.now();
    let last = path.getPointAtLength(0);
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const pt = path.getPointAtLength(len * e);
      placeTraveller(pt.x, pt.y, Math.abs(pt.x - last.x) > .05 ? Math.sign(pt.x - last.x) : 0);
      last = pt;
      if (t < 1) requestAnimationFrame(step); else finish();
    })(t0);
  }

  function announce(text) { $('#announce').textContent = text; }

  /* ---------- screens ---------- */
  function setHeader() {
    $('#realm').textContent = QP.fill(ui.realm, { world: C.world.name, company: C.company });
    $('#questTitle').textContent = C.title;
    document.title = QP.fill(ui.docTitle, C);
    $('#satchelTitle').textContent = ui.satchel;
  }

  function setProgress() {
    $('#progress').textContent = idx < 0 ? '' : idx >= C.questions.length ? ui.journeyDone : QP.fill(ui.progress, { n: idx + 1, total: C.questions.length });
  }

  function renderSatchel() {
    items.innerHTML = '';
    C.stops.forEach((s, i) => {
      const q = C.questions[i], found = session.has(q.id);
      items.append(found
        ? el('li', { class: 'item found' + (fresh === i ? ' fresh' : ''), 'aria-label': QP.fill(ui.itemFound, { item: s.item.name, place: s.place }) }, itemSvg(s.item.icon), el('span', { 'aria-hidden': 'true' }, s.item.name))
        : el('li', { class: 'item', 'aria-label': QP.fill(ui.itemMissing, { n: i + 1 }) }, el('span', { 'aria-hidden': 'true' }, String(i + 1))));
    });
    $('#tally').textContent = QP.fill(ui.tally, { n: session.count(), total: C.questions.length });
    fresh = null;
  }

  const page = (cls, ...kids) => el('article', { class: 'page' + (cls ? ' ' + cls : '') }, ...kids);
  const inhabitantBlock = s => el('div', { class: 'inhabitant' },
    QP.scenes.hasOutfit(s.inhabitant) ? el('div', { class: 'portrait' }, QP.scenes.person(s.inhabitant))
      : el('div', { class: 'medal', 'aria-hidden': 'true' }, s.inhabitant.name.charAt(0)),
    el('div', {}, el('b', {}, s.inhabitant.name), el('span', {}, s.inhabitant.role)));

  function renderIntro() {
    stage.innerHTML = '';
    const go = el('button', { class: 'primary', onclick: () => {
      if (moving) return;
      session.start(); go.disabled = true; go.textContent = QP.fill(ui.travelling, { place: placeName(1) });
      travel(1, () => { idx = 0; renderQuestion(); });
    } }, ui.begin);
    stage.append(page('intro',
      el('div', { class: 'guide' }, heroSvg(C.hero.name), el('div', {}, el('b', {}, C.hero.name), el('span', {}, ui.guide))),
      el('p', { class: 'quip' }, C.hero.introLine),
      C.intro.map(p => el('p', {}, p)),
      el('div', { class: 'actions' }, go)));
    setProgress();
  }

  function renderQuestion() {
    const q = C.questions[idx], s = C.stops[idx];
    session.begin();
    const form = QP.questionForm(q, ui, value => record(q, s, value));
    stage.innerHTML = '';
    stage.append(page('',
      el('p', { class: 'kicker' }, QP.fill(ui.stopLabel, { n: idx + 1, total: C.questions.length, place: s.place })),
      inhabitantBlock(s),
      el('p', { class: 'setup' }, s.line),
      el('p', { class: 'prompt', id: 'prompt' }, q.prompt),
      form.control, form.actions));
    setProgress();
    stage.querySelector('button, textarea').focus({ preventScroll: true });
  }

  function record(q, s, value) {
    session.answer(q, value);
    fresh = idx;
    renderSatchel();
    updateMap();
    const last = idx === C.questions.length - 1;
    const next = placeName(pos + 1);
    const go = el('button', { class: 'primary', onclick: () => {
      if (moving) return;
      go.disabled = true; go.textContent = QP.fill(ui.travelling, { place: next });
      travel(pos + 1, () => { if (last) { idx++; renderEnd(); } else { idx++; renderQuestion(); } });
    } }, QP.fill(last ? ui.travelLast : ui.travel, { place: next }));
    stage.innerHTML = '';
    stage.append(page('',
      el('p', { class: 'kicker' }, QP.fill(ui.stopLabel, { n: idx + 1, total: C.questions.length, place: s.place })),
      inhabitantBlock(s),
      el('div', { class: 'reward', role: 'status' }, itemSvg(s.item.icon),
        el('div', {}, el('h3', {}, ui.received), el('p', { class: 'item-name' }, s.item.name), el('p', { class: 'from' }, QP.fill(ui.from, { name: s.inhabitant.name })))),
      el('div', { class: 'note' }, heroSvg(C.hero.name), el('p', {}, QP.fill(ui.quote, { name: C.hero.name, note: s.guideNote }))),
      el('div', { class: 'actions' }, go)));
    announce(QP.fill(ui.gained, { item: s.item.name }));
    go.focus({ preventScroll: true });
  }

  function renderEnd() {
    const response = session.record();
    stage.innerHTML = '';
    stage.append(page('end',
      el('h2', { tabindex: '-1' }, ui.endTitle),
      el('div', { class: 'guide' }, heroSvg(C.hero.name), el('div', {}, el('b', {}, C.hero.name), el('span', {}, C.world.destination.name))),
      el('p', { class: 'quip' }, QP.fill(ui.quote, { name: C.hero.name, note: C.ending })),
      el('p', {}, ui.thanks),
      QP.answerSummary(C.questions, session.answers, ui),
      el('div', { class: 'actions' }, el('button', { class: 'ghost', onclick: restart }, ui.restart))));
    setProgress();
    stage.querySelector('h2').focus({ preventScroll: true });
    QP.complete(response);
  }

  function restart() {
    idx = -1; pos = 0; session.reset();
    updateMap(); renderSatchel(); renderIntro();
  }

  function showError(message, errors = []) {
    stage.innerHTML = '';
    stage.append(el('article', { class: 'page' }, QP.errorParts(message, errors)));
  }

  QP.registerGame('rpg', {
    validate: QP.validateRpg,
    start(config) {
      C = config; ui = QP.copy(UI, C, 'rpg'); session = QP.createSession(C);
      idx = -1; pos = 0; fresh = null; moving = false;
      QP.scenes.apply(C);
      setHeader(); buildMap(); updateMap(); renderSatchel(); renderIntro();
    },
    preview(config, i) {
      C = config; ui = QP.copy(UI, C, 'rpg');
      const n = C.questions.length;
      session = QP.previewSession(C, Math.max(0, i));
      fresh = null; moving = false;
      idx = Math.min(i, n); pos = i < 0 ? 0 : i + 1;  // at a question the hero stands at its stop; at the end, at the destination
      QP.scenes.apply(C);
      setHeader(); buildMap(); updateMap(); renderSatchel();
      if (i < 0) renderIntro(); else if (i < n) renderQuestion(); else renderEnd();
    }
  });

  QP.boot('rpg', { reward: '#stage', sample: QP.samples.rpg, showError, back: { parent: 'header.tale' } });
})();
