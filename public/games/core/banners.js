/* Scene banners for each business setting: 800 x 200 panoramas, back wall (or sky, for the village) above y=150 and floor below.
   Focal content sits between x=260 and x=540 so phones (which crop the sides) still see the room. */
(function (root) {
  const QP = root.QP = root.QP || {};
  const INK = '#3A2618';
  const ol = (w = 2) => `stroke="${INK}" stroke-width="${w}"`;
  const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');

  /* ---------- shared pieces ---------- */
  function wall(base, stripe, step = 44, width = step / 2) {
    return `<rect width="800" height="200" fill="${base}"/>` + (stripe ? repeat(Math.ceil(800 / step), i => `<rect x="${i * step}" width="${width}" height="150" fill="${stripe}"/>`) : '');
  }
  function planks(fill, line) {
    let s = `<rect y="150" width="800" height="50" fill="${fill}"/>`;
    for (let r = 0; r < 3; r++) {
      const y = 150 + r * 17;
      if (r) s += `<path d="M0 ${y}H800" stroke="${line}" stroke-width="2"/>`;
      for (let x = (r % 2) * 45; x < 800; x += 90) s += `<path d="M${x} ${y}v17" stroke="${line}" stroke-width="2"/>`;
    }
    return s + `<path d="M0 150H800" ${ol()}/>`;
  }
  function tiles(a, b, size = 25) {
    let s = `<rect y="150" width="800" height="50" fill="${a}"/>`;
    for (let y = 150, r = 0; y < 200; y += size, r++) for (let x = (r % 2) * size; x < 800; x += size * 2) s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${b}"/>`;
    return s + `<path d="M0 150H800" ${ol()}/>`;
  }
  function carpet(fill, line, step = 50) {
    return `<rect y="150" width="800" height="50" fill="${fill}"/>` + repeat(800 / step, i => `<path d="M${i * step} 150v50" stroke="${line}" stroke-width="1.5"/>`) +
      `<path d="M0 175H800" stroke="${line}" stroke-width="1.5"/><path d="M0 150H800" ${ol()}/>`;
  }
  const lamp = (x, shade = '#2F5D50') => `<path d="M${x} 0v26" ${ol()}/><circle cx="${x}" cy="44" r="26" fill="#FFE3A3" opacity=".45"/><path d="M${x - 14} 40l5 -14h18l5 14z" fill="${shade}" ${ol()} stroke-linejoin="round"/><circle cx="${x}" cy="42" r="4" fill="#FFE9A8"/>`;
  function win(x, y, w, h, view = 'trees', bars = 1) {
    let scene = '';
    if (view === 'trees') scene = `<rect x="${x}" y="${y + h * .72}" width="${w}" height="${h * .28}" fill="#A9D18E"/>` + repeat(3, i => `<circle cx="${x + w * (i + .5) / 3}" cy="${y + h * .66}" r="${h * .2}" fill="#7DB46C"/>`) +
      `<circle cx="${x + w * .8}" cy="${y + h * .22}" r="${h * .1}" fill="#FFF3C4"/>`;
    if (view === 'city') scene = repeat(Math.round(w / 34), i => { const bh = h * (.35 + ((i * 37) % 5) / 10); return `<rect x="${x + i * 34 + 3}" y="${y + h - bh}" width="28" height="${bh}" fill="${i % 2 ? '#9FB6C9' : '#B4C6D6'}"/>` + repeat(Math.floor(bh / 14), j => `<rect x="${x + i * 34 + 9}" y="${y + h - bh + 6 + j * 14}" width="16" height="5" fill="#E6EEF5"/>`); });
    const barLines = repeat(bars, i => `M${x + w * (i + 1) / (bars + 1)} ${y}v${h}`) + `M${x} ${y + h / 2}h${w}`;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#CDE8F2"/>${scene}<path d="${barLines}" stroke="#FFFFFF" stroke-width="5"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${ol(3)}/><rect x="${x - 6}" y="${y + h}" width="${w + 12}" height="6" rx="2" fill="#FFFFFF" ${ol()}/>`;
  }
  const plant = (x, base, s = 1, pot = '#C96F4A') => `<g transform="translate(${x} ${base}) scale(${s})"><path d="M-12 -18C-30 -30 -26 -52 -10 -44C-14 -62 6 -66 4 -46C14 -62 32 -50 14 -34C30 -32 26 -16 12 -18Z" fill="#6E9F58" ${ol(1.6)}/><path d="M0 -18v-20M0 -30l-8 -8M0 -26l9 -9" stroke="#4E7C3A" stroke-width="1.6" fill="none"/><path d="M-11 0l-3 -18h28l-3 18z" fill="${pot}" ${ol()}/></g>`;
  const clock = (x, y, r = 14) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" ${ol()}/><path d="M${x} ${y}v${-r * .62}M${x} ${y}h${r * .45}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
  const frame = (x, y, w, h, inner = '', color = '#A86F45') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" ${ol()}/><rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" fill="#FFF8EC"/>${inner}`;
  const hills = (x, y, w, h) => `<path d="M${x + 5} ${y + h - 5}q${w * .25} ${-h * .55} ${w * .5} ${-h * .2}t${w * .5 - 10} ${-h * .1}v${h * .3}z" fill="#7DB46C"/><circle cx="${x + w * .72}" cy="${y + h * .32}" r="${h * .1}" fill="#F2C14E"/>`;
  const chair = (x, base, color = '#A86F45', flip) => `<g transform="translate(${x} ${base})${flip ? ' scale(-1 1)' : ''}"><path d="M-11 0v-20M11 0v-20M-13 -20v-28" stroke="${color}" stroke-width="4" stroke-linecap="round"/><rect x="-14" y="-24" width="28" height="6" rx="2" fill="${color}" ${ol(1.6)}/><rect x="-16" y="-50" width="6" height="28" rx="2" fill="${color}" ${ol(1.6)}/></g>`;
  function table(x, base, w = 70, color = '#8A5A3B', cloth) {
    const h = w / 2 + 3;
    return `<g transform="translate(${x} ${base})"><path d="M${-w / 2 + 6} 0v-32M${w / 2 - 6} 0v-32" stroke="${color}" stroke-width="5"/><rect x="${-w / 2}" y="-36" width="${w}" height="6" rx="2" fill="${color}" ${ol(1.6)}/>` +
      (cloth ? `<path d="M${-h} -38h${2 * h}v16q${-h / 3} 6 ${-2 * h / 3} 0t${-2 * h / 3} 0t${-2 * h / 3} 0z" fill="${cloth}" ${ol(1.6)}/>` : '') + '</g>';
  }
  const COLORS = ['#B8432F', '#4F7CAC', '#F2C14E', '#6E9F58', '#7B5BA6', '#D08A2E', '#2F5D50', '#E85D75'];
  const books = (x, y, w, h = 22, seed = 0) => { let s = '', cx = x; for (let i = 0; cx < x + w - 6; i++) { const bw = 6 + ((i + seed) * 5) % 5, bh = h - ((i + seed) * 7) % 7; s += `<rect x="${cx}" y="${y - bh}" width="${bw}" height="${bh}" fill="${COLORS[(i + seed) % COLORS.length]}" ${ol(1.2)}/>`; cx += bw + 1; } return s; };
  const counter = (x0, x1, top, topColor, body, bottom = 190) => `<rect x="${x0}" y="${top + 6}" width="${x1 - x0}" height="${bottom - top - 6}" fill="${body}" ${ol()}/>` +
    repeat(Math.floor((x1 - x0) / 54), i => `<path d="M${x0 + (i + 1) * 54} ${top + 12}v${bottom - top - 18}" stroke="#00000022" stroke-width="2"/>`) +
    `<rect x="${x0 - 4}" y="${top}" width="${x1 - x0 + 8}" height="7" rx="2" fill="${topColor}" ${ol()}/>`;
  const chalkboard = (x, y, w, h, doodle) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#A86F45" ${ol()}/><rect x="${x + 7}" y="${y + 7}" width="${w - 14}" height="${h - 14}" rx="2" fill="#2F3B35"/>` +
    `<g fill="none" stroke="#F4EFE4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".9">${doodle}</g>`;
  const register = (x, y) => `<rect x="${x}" y="${y - 22}" width="48" height="22" rx="3" fill="#3B4A54" ${ol()}/><rect x="${x + 7}" y="${y - 36}" width="34" height="14" rx="2" fill="#7FD1C2" ${ol()}/><path d="M${x + 8} ${y - 14}h32M${x + 8} ${y - 8}h32" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="4 3" opacity=".7"/>`;
  const bag = (x, y, color) => `<path d="M${x} ${y}v-22h22v22z" fill="${color}" ${ol()}/><path d="M${x + 5} ${y - 22}q6-11 12 0" fill="none" ${ol()}/>`;
  const reception = (x0, x1, top, color, trim) => `<path d="M${x0} 190V${top + 6}q${(x1 - x0) / 2} -14 ${x1 - x0} 0V190z" fill="${color}" ${ol()}/><path d="M${x0 - 4} ${top + 8}q${(x1 - x0) / 2 + 4} -18 ${x1 - x0 + 8} 0v8q${-(x1 - x0) / 2 - 4} -18 ${-(x1 - x0) - 8} 0z" fill="${trim}" ${ol()}/>`;
  const monitor = (x, y) => `<rect x="${x - 20}" y="${y - 34}" width="40" height="26" rx="2" fill="#3B4A54" ${ol()}/><rect x="${x - 16}" y="${y - 30}" width="32" height="18" fill="#7FB5E0"/><path d="M${x} ${y - 8}v8M${x - 10} ${y}h20" ${ol()}/>`;

  /* ---------- bakery ---------- */
  function bakeryBanner() {
    let stripes = '';
    for (let x = 0; x < 800; x += 44) stripes += `<rect x="${x}" y="0" width="22" height="150" fill="#F4D9C6"/>`;
    let bricks = '';
    for (let y = 30, r = 0; y < 150; y += 14, r++) {
      bricks += `<path d="M636 ${y}H784" stroke="#8E3E2A" stroke-width="1.2"/>`;
      for (let x = 636 + (r % 2) * 14; x < 784; x += 28) bricks += `<path d="M${x} ${y}v14" stroke="#8E3E2A" stroke-width="1.2"/>`;
    }
    const boule = (cx, cy, r, c) => `<ellipse cx="${cx}" cy="${cy - r * .55}" rx="${r}" ry="${r * .62}" fill="${c}" stroke="${INK}" stroke-width="2"/><path d="M${cx - r * .5} ${cy - r * .8}q${r * .5} -${r * .3} ${r} 0M${cx - r * .35} ${cy - r * .45}q${r * .35} -${r * .22} ${r * .7} 0" stroke="#F3D9A8" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    const croissant = (cx, cy) => `<path d="M${cx - 16} ${cy}q2 -16 16 -16q14 0 16 16q-6 -5 -9 -2q-3 -6 -7 -6t-7 6q-3 -3 -9 2z" fill="#D9963F" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
    const cupcake = (cx, cy, c) => `<path d="M${cx - 9} ${cy - 12}h18l-3 12h-12z" fill="#F3E6D0" stroke="${INK}" stroke-width="1.6"/><path d="M${cx - 11} ${cy - 12}q0 -11 11 -11t11 11z" fill="${c}" stroke="${INK}" stroke-width="1.6"/><circle cx="${cx}" cy="${cy - 24}" r="2.6" fill="#C0392B"/>`;
    const tart = (cx, cy, c) => `<path d="M${cx - 12} ${cy - 7}h24l-3 7h-18z" fill="#D9963F" stroke="${INK}" stroke-width="1.6"/><ellipse cx="${cx}" cy="${cy - 7}" rx="12" ry="3.5" fill="${c}" stroke="${INK}" stroke-width="1.6"/>`;
    const lamp = x => `<path d="M${x} 0v26" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="44" r="26" fill="#FFE3A3" opacity=".45"/><path d="M${x - 14} 40l5 -14h18l5 14z" fill="#2F5D50" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="${x}" cy="42" r="4" fill="#FFE9A8"/>`;
    return `
      <rect width="800" height="200" fill="#FBEBDD"/>${stripes}
      <rect y="142" width="800" height="10" fill="#E9C9B0"/>

      <!-- bread shelves -->
      <g>
        <rect x="24" y="22" width="8" height="128" fill="#8A5A3B" stroke="${INK}" stroke-width="2"/>
        <rect x="224" y="22" width="8" height="128" fill="#8A5A3B" stroke="${INK}" stroke-width="2"/>
        <rect x="18" y="70" width="220" height="8" rx="2" fill="#A86F45" stroke="${INK}" stroke-width="2"/>
        <rect x="18" y="116" width="220" height="8" rx="2" fill="#A86F45" stroke="${INK}" stroke-width="2"/>
        ${boule(62, 70, 20, '#C98A4B')}${boule(112, 70, 17, '#B9773A')}${boule(158, 70, 20, '#C98A4B')}
        <rect x="186" y="44" width="34" height="26" rx="4" fill="#D9A15E" stroke="${INK}" stroke-width="2"/><path d="M192 52q11 -6 22 0" stroke="#F3D9A8" stroke-width="2" fill="none"/>
        ${croissant(58, 116)}${croissant(100, 116)}${croissant(142, 116)}
        <g transform="rotate(-6 186 106)"><rect x="160" y="100" width="54" height="13" rx="6.5" fill="#D08A3E" stroke="${INK}" stroke-width="2"/><path d="M172 103l6 7M186 103l6 7M200 103l6 7" stroke="#F3D9A8" stroke-width="2" stroke-linecap="round"/></g>
      </g>

      ${lamp(292)}${lamp(508)}

      <!-- chalkboard with a cupcake doodle -->
      <g>
        <rect x="336" y="22" width="128" height="84" rx="4" fill="#A86F45" stroke="${INK}" stroke-width="2"/>
        <rect x="343" y="29" width="114" height="70" rx="2" fill="#2F3B35"/>
        <g fill="none" stroke="#F4EFE4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".9">
          <path d="M361 70h22l-3 15h-16z"/><path d="M358 70q0 -15 14 -15t14 15z"/><circle cx="372" cy="51" r="2.5"/>
          <path d="M398 48h42M398 60h34M398 72h40M398 84h26" opacity=".75"/>
        </g>
      </g>

      <!-- brick oven -->
      <g>
        <rect x="636" y="30" width="148" height="120" fill="#B5563C" stroke="${INK}" stroke-width="2"/>${bricks}
        <path d="M636 30h148" stroke="${INK}" stroke-width="2"/>
        <path d="M664 150v-46a46 40 0 0 1 92 0v46z" fill="#3A2216" stroke="${INK}" stroke-width="2"/>
        <ellipse cx="710" cy="146" rx="38" ry="16" fill="#FF9B3D" opacity=".55"/>
        <path d="M688 150q4 -22 12 -14q2 -16 10 -6q6 -18 12 2q8 -10 10 18z" fill="#FFB547" stroke="#D9531E" stroke-width="2" stroke-linejoin="round"/>
        <rect x="654" y="20" width="112" height="12" rx="3" fill="#8E3E2A" stroke="${INK}" stroke-width="2"/>
      </g>

      <!-- counter -->
      <rect y="150" width="800" height="9" fill="#7A4E2D" stroke="${INK}" stroke-width="2"/>
      <rect y="159" width="800" height="41" fill="#C88A55"/>
      <path d="M0 172h800" stroke="#A86F45" stroke-width="2"/>
      ${Array.from({ length: 20 }, (_, i) => `<path d="M${i * 40 + 20} 159v41" stroke="#A86F45" stroke-width="2"/>`).join('')}

      <!-- glass display case -->
      <g>
        <rect x="268" y="96" width="264" height="54" rx="6" fill="#FFFFFF" fill-opacity=".55" stroke="${INK}" stroke-width="2"/>
        <path d="M268 122h264" stroke="${INK}" stroke-width="1.6"/>
        <path d="M284 102l16 16M300 102l8 8" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".9"/>
        ${tart(312, 121, '#E85D75')}${tart(352, 121, '#F2C14E')}${tart(392, 121, '#7DB46C')}${tart(432, 121, '#E85D75')}${tart(472, 121, '#9B6BC4')}
        ${cupcake(300, 149, '#F7B8C8')}${cupcake(336, 149, '#FFF3E0')}${cupcake(372, 149, '#C9A6F2')}${cupcake(408, 149, '#F7B8C8')}${cupcake(444, 149, '#A8DADC')}${cupcake(480, 149, '#FFF3E0')}${cupcake(514, 149, '#C9A6F2')}
      </g>

      <!-- tiered cake on a stand -->
      <g>
        <path d="M566 150h40l-8 -6h-24z" fill="#E7E2DA" stroke="${INK}" stroke-width="2"/><rect x="583" y="128" width="6" height="16" fill="#E7E2DA" stroke="${INK}" stroke-width="2"/>
        <ellipse cx="586" cy="128" rx="30" ry="5" fill="#E7E2DA" stroke="${INK}" stroke-width="2"/>
        <rect x="562" y="104" width="48" height="22" rx="4" fill="#F7C5D2" stroke="${INK}" stroke-width="2"/>
        <path d="M562 110q6 6 12 0t12 0 12 0 12 0" fill="none" stroke="#FFFFFF" stroke-width="3"/>
        <rect x="570" y="84" width="32" height="20" rx="4" fill="#FFF3E0" stroke="${INK}" stroke-width="2"/>
        <path d="M570 90q4 5 8 0t8 0 8 0 8 0" fill="none" stroke="#F7B8C8" stroke-width="3"/>
        <circle cx="586" cy="78" r="5" fill="#C0392B" stroke="${INK}" stroke-width="1.6"/><path d="M586 73q3 -6 8 -6" stroke="#4E7C3A" stroke-width="2" fill="none"/>
      </g>

      <!-- flour sack and rolling pin on the counter -->
      <g>
        <path d="M206 150q-6 -26 4 -40l-4 -6h34l-4 6q10 14 4 40z" fill="#F1E6D2" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M223 122v18M223 126l-5 -5M223 126l5 -5M223 133l-5 -5M223 133l5 -5" stroke="#C9A04A" stroke-width="2" stroke-linecap="round"/>
        <rect x="120" y="141" width="56" height="9" rx="4.5" fill="#D9A15E" stroke="${INK}" stroke-width="2"/>
        <rect x="108" y="143" width="14" height="5" rx="2.5" fill="#A86F45" stroke="${INK}" stroke-width="1.6"/><rect x="174" y="143" width="14" height="5" rx="2.5" fill="#A86F45" stroke="${INK}" stroke-width="1.6"/>
      </g>`;
  }

  /* ---------- café ---------- */
  function cafeBanner() {
    const jar = x => `<rect x="${x}" y="46" width="20" height="18" rx="3" fill="#F4EBD8" ${ol(1.6)}/><rect x="${x + 2}" y="42" width="16" height="5" fill="#8C5A3A" ${ol(1.2)}/><g fill="#6B3E22">${repeat(4, i => `<ellipse cx="${x + 5 + (i % 2) * 9}" cy="${52 + Math.floor(i / 2) * 6}" rx="2.6" ry="1.8"/>`)}</g>`;
    return wall('#F6EBDD', '#EFE0CC') + planks('#B98455', '#9A6A40') +
      win(30, 28, 168, 92, 'trees') + plant(200, 188, .95) +
      `<rect x="244" y="64" width="92" height="6" rx="2" fill="#A86F45" ${ol()}/>${jar(250)}${jar(280)}${jar(310)}` +
      lamp(312) + lamp(528) +
      chalkboard(350, 18, 140, 80, `<path d="M372 60h22v10a11 9 0 0 1-22 0z"/><path d="M394 62q8 0 6 7t-6 4"/><path d="M378 54q-3-5 1-9M386 54q-3-5 1-9"/><path d="M412 44h56M412 56h44M412 68h52M412 80h30" opacity=".75"/>`) +
      counter(236, 564, 118, '#5B3A26', '#8C5A3A') +
      // espresso machine
      `<rect x="252" y="80" width="70" height="38" rx="4" fill="#C9CED4" ${ol()}/><rect x="256" y="72" width="62" height="8" rx="2" fill="#9AA3AB" ${ol()}/>` +
      `<path d="M262 72v-7h9v7M300 72v-7h9v7" fill="#FFFFFF" ${ol(1.4)}/><rect x="266" y="94" width="12" height="7" fill="#3A3A3A"/><rect x="296" y="94" width="12" height="7" fill="#3A3A3A"/>` +
      `<path d="M267 108h10v10h-10zM297 108h10v10h-10z" fill="#FFFFFF" ${ol(1.4)}/><circle cx="287" cy="86" r="4" fill="#E85D75" ${ol(1)}/><path d="M272 104q-3-4 1-8" stroke="#FFFFFF" stroke-width="2" fill="none"/>` +
      // pastry dome
      `<ellipse cx="400" cy="116" rx="28" ry="4" fill="#E7E2DA" ${ol()}/><path d="M386 114q2-13 14-13t14 13q-4-3-7-1q-3-5-7-5t-7 5q-3-2-7 1z" fill="#D9963F" ${ol(1.4)}/>` +
      `<path d="M376 114q0-32 24-32t24 32z" fill="#FFFFFF" fill-opacity=".45" ${ol()}/><circle cx="400" cy="80" r="3.5" fill="#E7E2DA" ${ol(1.4)}/>` +
      // cups and register
      repeat(3, i => `<path d="M440 ${116 - i * 8}l2-7h16l2 7z" fill="#FFFFFF" ${ol(1.4)}/>`) + register(494, 118) +
      frame(640, 28, 76, 54, `<path d="M664 52h22v8a11 8 0 0 1-22 0z" fill="#8C5A3A"/><path d="M686 54q7 0 5 6t-5 3" fill="none" stroke="#8C5A3A" stroke-width="2"/>`) +
      table(690, 188, 64, '#5B3A26') + `<path d="M683 152l1-8h12l1 8z" fill="#FFFFFF" ${ol(1.4)}/>` + chair(640, 188, '#2F5D50') + chair(742, 188, '#2F5D50', true);
  }

  /* ---------- restaurant ---------- */
  function restaurantBanner() {
    const plate = (x, food) => `<ellipse cx="${x}" cy="104" rx="17" ry="4.5" fill="#FFFFFF" ${ol(1.6)}/><path d="M${x - 9} 104q9-11 18 0z" fill="${food}" ${ol(1.2)}/><circle cx="${x + 3}" cy="97" r="2" fill="#6E9F58"/>`;
    const pan = (x, r) => `<path d="M${x} 36v${10}" stroke="#5A6068" stroke-width="2"/><circle cx="${x}" cy="${46 + r}" r="${r}" fill="#5A6068" ${ol(1.6)}/>`;
    const setTable = x => table(x, 188, 104, '#6E4428', '#FFFFFF') +
      `<rect x="${x - 3}" y="136" width="6" height="12" fill="#FFF3D6" ${ol(1.2)}/><path d="M${x} 136q-4-6 0-10q4 4 0 10z" fill="#FFB547"/>` +
      `<path d="M${x - 30} 150l1-12h9l1 12z" fill="#DDEFF5" ${ol(1.2)}/><path d="M${x + 20} 150l1-12h9l1 12z" fill="#DDEFF5" ${ol(1.2)}/>` + chair(x - 66, 188, '#6E4428') + chair(x + 66, 188, '#6E4428', true);
    return wall('#F4E9DA') + `<rect y="96" width="800" height="54" fill="#7A2E2E"/>` + repeat(10, i => `<rect x="${i * 80 + 10}" y="104" width="60" height="38" rx="3" fill="none" stroke="#5A1F1F" stroke-width="2"/>`) +
      `<rect y="90" width="800" height="7" fill="#5A1F1F" ${ol()}/>` + planks('#8A5A3B', '#6E4428') +
      // kitchen pass
      `<rect x="290" y="26" width="220" height="80" fill="#3A2A22" ${ol()}/><rect x="296" y="32" width="208" height="70" fill="#9AA5B1"/>` +
      `<path d="M296 52h208" stroke="#7D8794" stroke-width="2"/>${pan(320, 9)}${pan(350, 7)}${pan(470, 8)}` +
      `<rect x="380" y="34" width="44" height="5" fill="#3A3A3A"/><path d="M382 39l-6 12h52l-6-12z" fill="#FFB547" opacity=".55"/>` +
      `<rect x="284" y="104" width="232" height="8" rx="2" fill="#C9CED4" ${ol()}/>${plate(330, '#D9963F')}${plate(380, '#B8432F')}${plate(430, '#F2C14E')}` +
      `<path d="M470 104q0-10 10-10t10 10z" fill="#C9A04A" ${ol(1.4)}/><rect x="468" y="103" width="24" height="3" fill="#8A6A16"/>` +
      frame(20, 24, 60, 48, hills(20, 24, 60, 48)) + frame(720, 24, 60, 48, hills(720, 24, 60, 48)) +
      lamp(150, '#7A2E2E') + lamp(650, '#7A2E2E') + setTable(150) + setTable(650) + plant(268, 190, 1) + plant(533, 190, 1);
  }

  /* ---------- general shop (kirana, grocery, supermarket) ---------- */
  function retailBanner() {
    const tube = x => `<rect x="${x - 40}" y="8" width="80" height="7" rx="3.5" fill="#FFF6D6" ${ol(1.4)}/><path d="M${x - 40} 15l-30 135h140l-30-135z" fill="#FFF6D6" opacity=".22"/>`;
    const jar = (x, y, c) => `<rect x="${x}" y="${y - 17}" width="15" height="17" rx="3" fill="#E9F2F2" ${ol(1.2)}/><rect x="${x + 2}" y="${y - 12}" width="11" height="10" rx="2" fill="${c}"/><rect x="${x - 1}" y="${y - 22}" width="17" height="6" rx="2" fill="${c}" ${ol(1.2)}/>`;
    const packet = (x, y, c) => `<path d="M${x} ${y}v-22l3-4h12l3 4v22z" fill="${c}" ${ol(1.2)} stroke-linejoin="round"/><circle cx="${x + 9}" cy="${y - 11}" r="4.5" fill="#FFFFFF" opacity=".75"/>`;
    const box = (x, y, w, h, c) => `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" rx="1.5" fill="${c}" ${ol(1.2)}/><rect x="${x + 3}" y="${y - h + 4}" width="${w - 6}" height="5" fill="#FFFFFF" opacity=".6"/>`;
    const shelfBoards = (x0, w, ys) => ys.map(y => `<rect x="${x0 + 3}" y="${y}" width="${w - 6}" height="5" fill="#A87C4A" ${ol(1.2)}/>`).join('');
    const bottle = (x, y, c) => `<rect x="${x}" y="${y - 18}" width="9" height="18" rx="3" fill="${c}" ${ol(1)}/><rect x="${x + 2.5}" y="${y - 23}" width="4" height="5" fill="${c}" ${ol(1)}/>`;
    const sack = (x, c, label) => `<path d="M${x - 24} 188q-6-30 4-46l-2-8h44l-2 8q10 16 4 46z" fill="${c}" ${ol()} stroke-linejoin="round"/><path d="M${x - 18} 134q18 6 36 0" fill="none" ${ol(1.4)}/>` +
      `<rect x="${x - 14}" y="152" width="28" height="16" rx="2" fill="#FFFFFF" opacity=".8"/><path d="M${x - 9} 160h18" stroke="${label}" stroke-width="3" stroke-linecap="round"/>`;
    const fruit = (x, y, c) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}" ${ol(1.2)}/><path d="M${x} ${y - 7}l2-4" ${ol(1.2)}/>`;
    const crate = (x0, top, w) => `<rect x="${x0}" y="${top}" width="${w}" height="30" fill="#C9A06A" ${ol()}/><path d="M${x0} ${top + 10}h${w}M${x0} ${top + 20}h${w}" stroke="#A87C4A" stroke-width="2"/>`;
    return wall('#F7F2E4', '#EFE7D2') + tiles('#E9DFC4', '#DCCFAE') + tube(150) + tube(420) + tube(690) +
      // tall shelves of jars, packets and boxes
      `<rect x="20" y="28" width="212" height="122" fill="#C9A06A" ${ol()}/><rect x="27" y="34" width="198" height="116" fill="#F3E9D2"/>` + shelfBoards(20, 212, [66, 104, 142]) +
      repeat(9, i => jar(32 + i * 21.5, 66, COLORS[i % 8])) + repeat(8, i => packet(32 + i * 24, 104, COLORS[(i + 3) % 8])) +
      [[30, 34, 26], [68, 26, 32], [98, 40, 22], [142, 30, 30], [176, 46, 24]].map(([x, w, h], i) => box(x, 142, w - 4, h, COLORS[(i + 5) % 8])).join('') +
      // cold drinks fridge
      `<rect x="248" y="24" width="86" height="164" rx="4" fill="#E9EEF2" ${ol()}/><rect x="248" y="24" width="86" height="18" rx="4" fill="#2F5D50" ${ol()}/>` +
      `<path d="M262 33h58" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".85"/><rect x="256" y="48" width="70" height="104" rx="2" fill="#CFE8F2" ${ol(1.6)}/>` +
      [80, 114, 148].map((y, r) => `<path d="M258 ${y}h66" stroke="#9FB6C9" stroke-width="2"/>` + repeat(5, i => bottle(262 + i * 12.5, y, COLORS[(i + r * 2) % 8]))).join('') +
      `<rect x="318" y="88" width="4" height="26" rx="2" fill="#8A8F96"/><path d="M256 52l18 20M268 52l26 30" stroke="#FFFFFF" stroke-width="3" opacity=".6" stroke-linecap="round"/>` +
      `<rect x="256" y="160" width="70" height="20" rx="2" fill="#C9CED4" ${ol(1.4)}/><path d="M264 166h54M264 172h54" stroke="#8A8F96" stroke-width="1.6"/>` +
      // price board, checkout counter, weighing scale and bags
      `<path d="M380 0v26M468 0v26" stroke="#5A6068" stroke-width="1.6"/>` + chalkboard(366, 24, 116, 58, `<path d="M380 40h46M380 54h64M380 68h38"/><path d="M458 40h10M462 54h8M458 68h12"/>`) +
      counter(352, 504, 120, '#2F5D50', '#E2D8C0') + register(366, 120) +
      `<rect x="428" y="112" width="40" height="8" rx="2" fill="#C9CED4" ${ol(1.4)}/><rect x="436" y="102" width="24" height="10" rx="2" fill="#3B4A54" ${ol(1.2)}/><ellipse cx="448" cy="100" rx="18" ry="3.5" fill="#E7E2DA" ${ol(1.4)}/>` +
      fruit(442, 93, '#B8432F') + fruit(454, 93, '#F28C28') + bag(476, 120, '#C2571A') +
      // fruit crates
      crate(524, 158, 84) + crate(530, 128, 72) + repeat(5, i => fruit(538 + i * 14, 124, i % 2 ? '#F28C28' : '#B8432F')) + repeat(6, i => fruit(532 + i * 14, 154, i % 2 ? '#6E9F58' : '#F2C14E')) +
      // a wall shelf of tins above sacks of rice and dal
      `<rect x="630" y="70" width="150" height="6" fill="#A87C4A" ${ol(1.4)}/>` + repeat(6, i => `<rect x="${638 + i * 24}" y="46" width="18" height="24" rx="2" fill="${COLORS[(i + 1) % 8]}" ${ol(1.2)}/><rect x="${638 + i * 24}" y="52" width="18" height="8" fill="#FFFFFF" opacity=".6"/>`) +
      sack(660, '#E9DCC0', '#B8432F') + sack(712, '#D9C7A0', '#6E9F58') + sack(760, '#E9DCC0', '#F2C14E');
  }

  /* ---------- clothes shop ---------- */
  function fashionBanner() {
    const shirt = (x, c) => `<path d="M${x - 12} 64l8-6h8l8 6-4 9-4-2v34h-16v-34l-4 2z" fill="${c}" ${ol(1.4)} stroke-linejoin="round"/>`;
    const dress = (x, c) => `<path d="M${x - 6} 60h12l12 50h-36z" fill="${c}" ${ol(1.4)} stroke-linejoin="round"/><path d="M${x - 6} 60l3-4M${x + 6} 60l-3-4" ${ol(1.4)}/>`;
    const fold = (x, y, c) => repeat(3, i => `<rect x="${x}" y="${y - 7 - i * 7}" width="26" height="7" rx="2" fill="${c}" ${ol(1.2)}/>`);
    const shoe = (x, y, c) => `<path d="M${x} ${y}v-10q6 0 8 4l12 3q4 1 4 3z" fill="${c}" ${ol(1.2)} stroke-linejoin="round"/>`;
    const beam = x => `<path d="M${x} 26l-44 124h88z" fill="#FFF6D6" opacity=".35"/><path d="M${x} 12l-9 14h18z" fill="#3A3F45" ${ol(1.4)}/>`;
    return wall('#F5F1EA', '#EDE6DA') + planks('#D9B98E', '#C29E70') +
      `<rect y="8" width="800" height="4" fill="#5A6068"/>${beam(124)}${beam(300)}${beam(520)}${beam(700)}` +
      // clothes rack
      `<path d="M36 52V186M214 52V186M24 186h24M202 186h24" stroke="#8A8F96" stroke-width="4" stroke-linecap="round"/><path d="M30 52H220" stroke="#8A8F96" stroke-width="5" stroke-linecap="round"/>` +
      repeat(7, i => { const x = 50 + i * 26, c = COLORS[i]; return `<path d="M${x} 58v-6" ${ol(1.4)}/>` + (i % 2 ? dress(x, c) : shirt(x, c)); }) +
      `<path d="M128 74l10 6" ${ol(1)}/><rect x="136" y="78" width="12" height="8" rx="1" fill="#FFFFFF" ${ol(1)}/>` +
      // folded shelves
      `<rect x="236" y="40" width="88" height="110" fill="#EDE6DA" ${ol()}/>` + [72, 104, 136].map((y, r) => `<rect x="236" y="${y}" width="88" height="5" fill="#C29E70" ${ol(1.4)}/>` + fold(244, y, COLORS[r + 1]) + fold(290, y, COLORS[r + 4])).join('') +
      // checkout
      `<path d="M408 12l3 22M432 12l-3 22" stroke="#5A6068" stroke-width="1.6"/><circle cx="420" cy="56" r="24" fill="#2F5D50" ${ol()}/><path d="M406 62h28l-14-14zM420 48v-5q0-4 4-4" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
      counter(344, 496, 118, '#2F5D50', '#E7E2DA') + register(380, 118) + bag(446, 118, '#E85D75') + bag(358, 118, '#F2C14E') +
      // mannequin
      `<path d="M560 188v-34M548 188h24" stroke="#5A6068" stroke-width="3" stroke-linecap="round"/><path d="M546 70q14-8 28 0l-3 26 12 58h-46l12-58z" fill="#F2C14E" ${ol()} stroke-linejoin="round"/>` +
      `<rect x="557" y="56" width="6" height="10" fill="#E7E2DA" ${ol(1.2)}/><ellipse cx="560" cy="46" rx="9" ry="11" fill="#E7E2DA" ${ol()}/>` +
      // shoe shelves
      `<rect x="616" y="50" width="164" height="100" fill="#EDE6DA" ${ol()}/>` + [82, 116, 150].map((y, r) => `<rect x="616" y="${y - 4}" width="164" height="5" fill="#C29E70" ${ol(1.4)}/>` + repeat(4, i => shoe(626 + i * 38, y - 4, COLORS[(i + r * 3) % 8]))).join('');
  }

  /* ---------- pet shop ---------- */
  function petshopBanner() {
    const spot = x => `<path d="M${x} 12l-40 138h80z" fill="#FFF6D6" opacity=".3"/><path d="M${x} 10l-8 12h16z" fill="#3A3F45" ${ol(1.2)}/>`;
    const fish = (x, y, c, flip) => `<g transform="translate(${x} ${y})${flip ? ' scale(-1 1)' : ''}"><path d="M8 0l9-7v14z" fill="${c}" ${ol(1.2)} stroke-linejoin="round"/><ellipse cx="0" cy="0" rx="11" ry="7" fill="${c}" ${ol(1.2)}/><circle cx="-5" cy="-1.5" r="1.6" fill="${INK}"/></g>`;
    const paw = (x, y, c, r = 5) => `<circle cx="${x}" cy="${y + r * .4}" r="${r}" fill="${c}"/>` + [[-1, -1.1], [-.35, -1.6], [.35, -1.6], [1, -1.1]].map(([dx, dy]) => `<circle cx="${x + dx * r * 1.1}" cy="${y + dy * r}" r="${r * .42}" fill="${c}"/>`).join('');
    const foodBag = (x, y, c) => `<path d="M${x} ${y}v-26l4-4h18l4 4v26z" fill="${c}" ${ol(1.2)} stroke-linejoin="round"/>` + paw(x + 13, y - 13, '#FFFFFF', 4);
    const can = (x, y, c) => `<rect x="${x}" y="${y - 14}" width="14" height="14" rx="2" fill="${c}" ${ol(1.2)}/><path d="M${x} ${y - 10}h14" stroke="#FFFFFF" stroke-width="2" opacity=".7"/>`;
    return wall('#F1F6FA', '#E6EEF6') + tiles('#E2E8EE', '#D3DCE6') + spot(130) + spot(420) + spot(700) +
      // aquarium on its cabinet
      `<rect x="22" y="120" width="196" height="68" fill="#4F7CAC" ${ol()}/><path d="M120 126v56" ${ol(1.4)}/><circle cx="110" cy="154" r="3" fill="#F2C14E"/><circle cx="130" cy="154" r="3" fill="#F2C14E"/>` +
      `<rect x="26" y="40" width="188" height="80" fill="#9FD3E8" ${ol(3)}/><rect x="26" y="40" width="188" height="10" fill="#7FB8D0"/><path d="M28 112q20-6 40 0t40 0 40 0 40 0 24 0v6H28z" fill="#E2C79A"/>` +
      `<path d="M50 114q-8-16 0-30q8 14 0 30zM60 114q10-22 2-40M178 114q-10-14-2-34q8 18 2 34zM190 114q6-12 0-26" fill="none" stroke="#4E8A3E" stroke-width="3" stroke-linecap="round"/>` +
      fish(84, 70, '#F28C28') + fish(140, 86, '#F2C14E', true) + fish(110, 100, '#E85D75') + fish(168, 62, '#F28C28', true) +
      `<g fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity=".85"><circle cx="70" cy="62" r="3"/><circle cx="74" cy="52" r="2"/><circle cx="150" cy="58" r="2.5"/></g>` +
      `<path d="M34 46l22 26M46 46l30 36" stroke="#FFFFFF" stroke-width="3" opacity=".45" stroke-linecap="round"/>` +
      // pet food shelves
      `<rect x="236" y="34" width="100" height="116" fill="#C9A06A" ${ol()}/><rect x="242" y="40" width="88" height="110" fill="#F3E9D2"/>` +
      [80, 116, 146].map(y => `<rect x="238" y="${y}" width="96" height="5" fill="#A87C4A" ${ol(1.2)}/>`).join('') +
      repeat(3, i => foodBag(246 + i * 28, 80, ['#E08A3C', '#4F7CAC', '#6E9F58'][i])) + repeat(5, i => can(246 + i * 17, 116, COLORS[(i + 2) % 8])) + repeat(3, i => foodBag(246 + i * 28, 146, ['#B8432F', '#F2C14E', '#7B5BA6'][i])) +
      // checkout with a paw sign and a jar of treats
      `<path d="M392 0v26M456 0v26" stroke="#5A6068" stroke-width="1.6"/><rect x="376" y="24" width="96" height="52" rx="10" fill="#4F7CAC" ${ol()}/>` + paw(424, 52, '#FFFFFF', 9) +
      counter(352, 500, 120, '#E08A3C', '#F2E6D8') + register(366, 120) +
      `<rect x="432" y="94" width="28" height="26" rx="5" fill="#E9F2F2" ${ol(1.4)}/><rect x="430" y="88" width="32" height="7" rx="2" fill="#E08A3C" ${ol(1.2)}/>` +
      `<path d="M438 108h6M440 104l-3 2 3 2M442 104l3 2-3 2M448 112h6M450 108l-3 2 3 2M452 108l3 2-3 2" stroke="#C9A06A" stroke-width="2.4" stroke-linecap="round" fill="none"/>` +
      `<path d="M472 120q2-10 12-10t12 10z" fill="#B8432F" ${ol(1.4)}/>` +
      // bird cage on a stand
      `<path d="M555 188v-74M539 188h32" stroke="#5A6068" stroke-width="4" stroke-linecap="round"/><path d="M527 114v-48q28-36 56 0v48z" fill="#FFFFFF" fill-opacity=".35" ${ol(1.6)}/>` +
      `<path d="M537 114v-58M546 114v-64M555 114v-66M564 114v-64M573 114v-58" stroke="${INK}" stroke-width="1.2"/><path d="M527 114h56" ${ol(2.4)}/><circle cx="555" cy="34" r="4" fill="none" ${ol(1.6)}/>` +
      `<path d="M540 94h30" stroke="#A86F45" stroke-width="3"/><ellipse cx="556" cy="84" rx="10" ry="8" fill="#F2C14E" ${ol(1.2)}/><circle cx="562" cy="76" r="5.5" fill="#F2C14E" ${ol(1.2)}/><path d="M567 76l5 1.5-5 1.5z" fill="#F28C28"/><circle cx="563" cy="75" r="1.2" fill="${INK}"/><path d="M547 86l-7 4" stroke="#6E9F58" stroke-width="3" stroke-linecap="round"/>` +
      // cat on a scratching post
      `<rect x="600" y="176" width="66" height="12" rx="2" fill="#B98E62" ${ol()}/><rect x="625" y="98" width="16" height="78" fill="#E2C79A" ${ol()}/>` + repeat(6, i => `<path d="M625 ${106 + i * 12}h16" stroke="#B98E62" stroke-width="2"/>`) +
      `<rect x="608" y="92" width="50" height="8" rx="2" fill="#B98E62" ${ol()}/><path d="M650 86q16-2 12-20" fill="none" stroke="#E08A3C" stroke-width="5" stroke-linecap="round"/><path d="M650 86q16-2 12-20" fill="none" ${ol(1)}/>` +
      `<ellipse cx="633" cy="78" rx="16" ry="14" fill="#E08A3C" ${ol()}/><circle cx="633" cy="56" r="11" fill="#E08A3C" ${ol()}/><path d="M624 50l-2-11 8 6zM642 50l2-11-8 6z" fill="#E08A3C" ${ol(1.4)} stroke-linejoin="round"/>` +
      `<circle cx="629" cy="56" r="1.6" fill="${INK}"/><circle cx="637" cy="56" r="1.6" fill="${INK}"/><path d="M631 61l2 1.5 2-1.5" fill="none" ${ol(1)}/><path d="M627 72q6 4 12 0M625 80q8 4 16 0" stroke="#C2571A" stroke-width="2" fill="none"/>` +
      // dog on its bed
      `<ellipse cx="732" cy="178" rx="52" ry="12" fill="#B8432F" ${ol()}/><ellipse cx="732" cy="174" rx="40" ry="7" fill="#F2C14E"/>` +
      `<path d="M708 172q20 8 40 0" fill="none" stroke="#C9A06A" stroke-width="10" stroke-linecap="round"/><path d="M700 156q-12-6-8-18" fill="none" stroke="#C9A06A" stroke-width="5" stroke-linecap="round"/>` +
      `<ellipse cx="722" cy="152" rx="24" ry="20" fill="#C9A06A" ${ol()}/><rect x="737" y="138" width="10" height="34" rx="5" fill="#C9A06A" ${ol(1.4)}/><circle cx="744" cy="124" r="15" fill="#C9A06A" ${ol()}/><ellipse cx="756" cy="130" rx="9" ry="7" fill="#E9D3B0" ${ol(1.2)}/>` +
      `<circle cx="762" cy="127" r="2.6" fill="${INK}"/><circle cx="745" cy="119" r="1.8" fill="${INK}"/><path d="M732 112q-10 4-6 22q8-2 10-14z" fill="#8A5A3B" ${ol(1.2)}/>`;
  }

  /* ---------- salon ---------- */
  function salonBanner() {
    const bottle = (x, y, c, h = 16) => `<rect x="${x}" y="${y - h}" width="9" height="${h}" rx="2" fill="${c}" ${ol(1.2)}/><rect x="${x + 2.5}" y="${y - h - 5}" width="4" height="5" fill="#FFFFFF" ${ol(1)}/>`;
    const station = x => `<rect x="${x - 44}" y="22" width="88" height="84" rx="6" fill="#DCEBF2" stroke="#C9A04A" stroke-width="5"/><rect x="${x - 44}" y="22" width="88" height="84" rx="6" fill="none" ${ol()}/>` +
      `<path d="M${x - 30} 34l20 20M${x - 18} 34l10 10" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>` +
      repeat(5, i => `<circle cx="${x - 36 + i * 18}" cy="22" r="4" fill="#FFF3C4" ${ol(1.2)}/>`) +
      `<rect x="${x - 52}" y="108" width="104" height="6" rx="2" fill="#FFFFFF" ${ol()}/>${bottle(x - 40, 108, '#D46A8E')}${bottle(x - 26, 108, '#9B6BC4', 12)}${bottle(x + 28, 108, '#7FD1C2', 14)}` +
      `<path d="M${x - 14} 188h28M${x} 188v-20" stroke="#3A3A40" stroke-width="4" stroke-linecap="round"/><rect x="${x - 18}" y="112" width="36" height="42" rx="8" fill="#2B2B33" ${ol()}/>` +
      `<rect x="${x - 22}" y="148" width="44" height="18" rx="6" fill="#2B2B33" ${ol()}/><rect x="${x - 28}" y="140" width="10" height="5" rx="2" fill="#2B2B33" ${ol(1.2)}/><rect x="${x + 18}" y="140" width="10" height="5" rx="2" fill="#2B2B33" ${ol(1.2)}/>`;
    return wall('#F8EEF2', '#F2E2E9') + tiles('#F4F1EE', '#3A3A40') +
      station(110) + station(690) +
      // product shelves
      `<rect x="290" y="56" width="168" height="5" rx="2" fill="#FFFFFF" ${ol()}/><rect x="290" y="92" width="168" height="5" rx="2" fill="#FFFFFF" ${ol()}/>` +
      repeat(8, i => bottle(298 + i * 20, 56, COLORS[i % 8], 12 + (i % 3) * 3)) + repeat(8, i => bottle(298 + i * 20, 92, COLORS[(i + 3) % 8], 12 + ((i + 1) % 3) * 3)) +
      // wash basin and chair
      `<rect x="318" y="134" width="16" height="54" fill="#E7E2DA" ${ol()}/><path d="M294 120h64q0 18-32 18t-32-18z" fill="#FFFFFF" ${ol()}/><path d="M346 116v-8q0-4 4-4h6" fill="none" stroke="#8A8F96" stroke-width="3"/>` +
      `<path d="M338 150l20-26h10l-14 26z" fill="#D46A8E" ${ol()}/><rect x="338" y="150" width="60" height="16" rx="6" fill="#D46A8E" ${ol()}/><path d="M350 188v-22M388 188v-22" stroke="#3A3A40" stroke-width="4"/>` +
      // hood dryer
      `<path d="M526 188v-74M512 188h28M526 114h-10" stroke="#8A8F96" stroke-width="4" stroke-linecap="round" fill="none"/>` + chair(500, 188, '#D46A8E', true) +
      `<ellipse cx="502" cy="112" rx="28" ry="19" fill="#F7B8C8" ${ol()} transform="rotate(-10 502 112)"/><path d="M481 120q20 10 40 0" fill="none" stroke="#FFFFFF" stroke-width="3"/>` + plant(590, 188, 1.1, '#9B6BC4');
  }

  /* ---------- gym ---------- */
  function gymBanner() {
    const bell = (x, y, c) => `<rect x="${x - 12}" y="${y - 2.5}" width="24" height="5" fill="#8A8F96"/><rect x="${x - 17}" y="${y - 9}" width="7" height="18" rx="2" fill="${c}" ${ol(1.4)}/><rect x="${x + 10}" y="${y - 9}" width="7" height="18" rx="2" fill="${c}" ${ol(1.4)}/>`;
    const kettle = (x, c) => `<path d="M${x - 7} 172q7-16 14 0" fill="none" stroke="${c}" stroke-width="5"/><path d="M${x - 12} 190q-4-20 12-22q16 2 12 22z" fill="${c}" ${ol()}/>`;
    return wall('#E8ECEF') + `<rect y="62" width="800" height="14" fill="#B6D94C"/><rect y="76" width="800" height="4" fill="#2B2F33"/>` +
      `<rect y="150" width="800" height="50" fill="#3A3F45"/>` + repeat(10, i => `<path d="M${i * 80 + 40} 150v50" stroke="#4A5056" stroke-width="2"/>`) + `<path d="M0 150H800" ${ol()}/>` +
      // dumbbell rack
      `<path d="M42 148V190M208 148V190" stroke="#4A5056" stroke-width="5"/><rect x="30" y="114" width="190" height="7" rx="2" fill="#4A5056" ${ol()}/><rect x="30" y="144" width="190" height="7" rx="2" fill="#4A5056" ${ol()}/>` +
      `<path d="M42 121v23M208 121v23" stroke="#4A5056" stroke-width="5"/>` +
      repeat(4, i => bell(60 + i * 46, 104, ['#E85D75', '#2F9BD6', '#F28C28', '#7FA51E'][i])) + repeat(4, i => bell(60 + i * 46, 134, '#2B2F33')) + clock(250, 38) +
      // mirror and treadmill
      `<rect x="296" y="16" width="208" height="112" fill="#DCEBF2" ${ol(3)}/><path d="M316 30l40 40M336 30l20 20M440 70l40 40" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M310 186h146l8-14H322z" fill="#2B2F33" ${ol()}/><rect x="324" y="168" width="128" height="5" fill="#5A6068"/>` +
      `<path d="M446 172l16-64" stroke="#2B2F33" stroke-width="6" stroke-linecap="round"/><rect x="440" y="96" width="46" height="16" rx="4" fill="#4A5056" ${ol()}/><rect x="448" y="100" width="22" height="8" fill="#7FD1C2"/>` +
      `<path d="M456 118H398v52" stroke="#8A8F96" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
      // ball, kettlebells, bench
      `<circle cx="540" cy="166" r="23" fill="#2F9BD6" ${ol()}/><path d="M524 154q10-8 22-4" stroke="#FFFFFF" stroke-width="3" fill="none" opacity=".7"/>` +
      kettle(588, '#2B2F33') + kettle(614, '#E85D75') +
      `<path d="M668 190V100M734 190V100" stroke="#5A6068" stroke-width="5"/><path d="M640 104H762" stroke="#8A8F96" stroke-width="4" stroke-linecap="round"/>` +
      `<rect x="644" y="88" width="10" height="34" rx="2" fill="#2B2F33" ${ol(1.4)}/><rect x="748" y="88" width="10" height="34" rx="2" fill="#2B2F33" ${ol(1.4)}/>` +
      `<rect x="650" y="150" width="100" height="11" rx="4" fill="#B6D94C" ${ol()}/><path d="M664 161v29M736 161v29" stroke="#2B2F33" stroke-width="5"/>`;
  }

  /* ---------- clinic ---------- */
  function clinicBanner() {
    const seat = x => `<rect x="${x - 18}" y="146" width="36" height="12" rx="4" fill="#5FA8A0" ${ol()}/><rect x="${x - 16}" y="114" width="32" height="34" rx="5" fill="#5FA8A0" ${ol()}/>`;
    return wall('#EAF4F4', '#E0EEEE') + tiles('#F2F6F6', '#E2ECEC') +
      win(30, 26, 150, 84, 'trees') +
      `<rect x="34" y="158" width="168" height="6" fill="#8A8F96"/><path d="M46 164v26M190 164v26" stroke="#8A8F96" stroke-width="4"/>${seat(64)}${seat(118)}${seat(172)}` + plant(228, 190, 1) +
      // sign, reception, monitor
      `<circle cx="400" cy="50" r="26" fill="#5FA8A0" ${ol()}/><path d="M400 36v28M386 50h28" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>` +
      reception(290, 510, 112, '#FFFFFF', '#5FA8A0') + monitor(360, 112) + plant(466, 114, .6) +
      `<path d="M420 112l12-6 12 6z" fill="#FFFFFF" ${ol(1.4)}/>` +
      // door, clock, water cooler
      `<rect x="598" y="40" width="74" height="110" fill="#CFE3E3" ${ol()}/><rect x="614" y="54" width="42" height="28" fill="#DCEBF2" ${ol(1.6)}/><circle cx="660" cy="100" r="3.5" fill="#8A8F96" ${ol(1.2)}/>` +
      clock(554, 46) +
      `<path d="M708 98h26v-30q0-6-13-6t-13 6z" fill="#BFE0F0" ${ol()}/><rect x="704" y="98" width="34" height="90" rx="3" fill="#FFFFFF" ${ol()}/>` +
      `<rect x="712" y="112" width="6" height="8" fill="#2F9BD6"/><rect x="724" y="112" width="6" height="8" fill="#E85D75"/>` + plant(772, 190, .9);
  }

  /* ---------- hotel ---------- */
  function hotelBanner() {
    const chandelier = x => `<path d="M${x} 0v20" ${ol()}/><circle cx="${x}" cy="34" r="30" fill="#FFE3A3" opacity=".4"/><path d="M${x - 22} 34q22 12 44 0" stroke="#C9A04A" stroke-width="3" fill="none"/>` +
      [-22, 0, 22].map(dx => `<rect x="${x + dx - 2.5}" y="${dx ? 24 : 28}" width="5" height="10" fill="#FFF3D6" ${ol(1)}/><circle cx="${x + dx}" cy="${dx ? 21 : 25}" r="3" fill="#FFB547"/>`).join('');
    const key = (x, y) => `<circle cx="${x}" cy="${y}" r="2" fill="#3A2618"/><path d="M${x} ${y}v8" stroke="#C9A04A" stroke-width="2"/><rect x="${x - 3}" y="${y + 8}" width="6" height="8" rx="1" fill="#C9A04A"/>`;
    return wall('#F3EBDD', '#E3D2B0', 36, 2) +
      `<rect y="150" width="800" height="50" fill="#7A2E3A"/>` + repeat(20, i => repeat(2, r => `<path d="M${i * 40 + 20 + r * 20} ${164 + r * 16}l6 6-6 6-6-6z" fill="#C9A04A" opacity=".55"/>`)) + `<path d="M0 150H800" ${ol()}/>` +
      chandelier(210) + chandelier(590) +
      // key board and desk
      `<rect x="340" y="24" width="120" height="70" rx="3" fill="#6B4A2B" ${ol()}/>` + repeat(12, i => key(356 + (i % 6) * 18, 34 + Math.floor(i / 6) * 28)) +
      `<rect x="280" y="116" width="240" height="74" fill="#6B4A2B" ${ol()}/>` + repeat(4, i => `<rect x="${292 + i * 57}" y="132" width="46" height="48" rx="3" fill="none" stroke="#4A3220" stroke-width="2"/>`) +
      `<rect x="272" y="108" width="256" height="10" rx="2" fill="#3A2618"/><rect x="280" y="122" width="240" height="4" fill="#C9A04A"/>` +
      `<path d="M458 108q0-14 12-14t12 14z" fill="#C9A04A" ${ol()}/><rect x="454" y="105" width="32" height="4" fill="#8A6A16"/><circle cx="470" cy="91" r="2.5" fill="#C9A04A"/>` +
      `<path d="M318 108l16-7 16 7zM350 108l16-7 16 7z" fill="#FFFFFF" ${ol(1.2)}/>` +
      // palm, luggage cart
      plant(56, 190, 1.5, '#C9A04A') +
      `<rect x="100" y="174" width="124" height="8" rx="2" fill="#C9A04A" ${ol()}/><circle cx="112" cy="190" r="6" fill="#3A2618"/><circle cx="212" cy="190" r="6" fill="#3A2618"/>` +
      `<path d="M106 174V74M218 174V74" stroke="#C9A04A" stroke-width="4"/><path d="M106 74q56-30 112 0" stroke="#C9A04A" stroke-width="4" fill="none"/>` +
      `<rect x="114" y="138" width="60" height="36" rx="4" fill="#4F7CAC" ${ol()}/><rect x="122" y="108" width="44" height="30" rx="4" fill="#B8432F" ${ol()}/><rect x="180" y="122" width="32" height="52" rx="4" fill="#2F5D50" ${ol()}/>` +
      `<path d="M136 108v-5h16v5M190 122v-5h12v5" fill="none" ${ol(1.6)}/>` +
      // lift
      `<rect x="608" y="34" width="124" height="116" fill="#C9A04A" ${ol()}/><rect x="616" y="44" width="54" height="106" fill="#B8BEC6" ${ol()}/><rect x="670" y="44" width="54" height="106" fill="#B8BEC6" ${ol()}/>` +
      `<circle cx="670" cy="38" r="3" fill="#FFFFFF"/><circle cx="748" cy="96" r="5" fill="#C9A04A" ${ol(1.4)}/>` + plant(772, 190, 1.1, '#C9A04A');
  }

  /* ---------- office ---------- */
  function officeBanner() {
    const desk = x => `<path d="M${x - 52} 190v-42M${x + 52} 190v-42" stroke="#8A8F96" stroke-width="4"/><rect x="${x - 60}" y="142" width="120" height="7" rx="2" fill="#D9DDE3" ${ol()}/>` + monitor(x - 12, 142) +
      `<rect x="${x - 30}" y="137" width="34" height="4" rx="1" fill="#5A6068"/><path d="M${x + 30} 142l2-12h12l2 12z" fill="#FFFFFF" ${ol(1.2)}/>`;
    const officeChair = x => `<path d="M${x} 186v-22M${x - 14} 190l14-4 14 4" stroke="#3A3F45" stroke-width="3.5" stroke-linecap="round" fill="none"/><rect x="${x - 16}" y="156" width="32" height="9" rx="4" fill="#2F6DB5" ${ol()}/><rect x="${x + 8}" y="128" width="10" height="30" rx="4" fill="#2F6DB5" ${ol()}/>`;
    return wall('#EEF1F5') + carpet('#8C96A3', '#7D8794') +
      win(30, 22, 300, 96, 'city', 3) + desk(110) + desk(278) + officeChair(186) + officeChair(352) +
      // whiteboard
      `<rect x="396" y="24" width="170" height="82" fill="#FFFFFF" ${ol(3)}/><rect x="406" y="106" width="150" height="4" fill="#B8C2CC" ${ol(1.2)}/>` +
      [['#4F7CAC', 30], ['#6E9F58', 46], ['#F2C14E', 38], ['#E85D75', 58]].map(([c, h], i) => `<rect x="${414 + i * 22}" y="${96 - h}" width="14" height="${h}" fill="${c}"/>`).join('') +
      `<path d="M410 96h96" ${ol(1.6)}/><rect x="520" y="34" width="18" height="18" fill="#F7E07A" ${ol(1)}/><rect x="540" y="56" width="18" height="18" fill="#F7B8C8" ${ol(1)}/><rect x="520" y="70" width="18" height="18" fill="#A8DADC" ${ol(1)}/>` +
      plant(600, 190, 1.3) +
      // bookshelf
      `<rect x="638" y="46" width="136" height="144" fill="#D9DDE3" ${ol()}/>` + [80, 116, 152, 188].map((y, r) => `<rect x="638" y="${y}" width="136" height="5" fill="#8C96A3" ${ol(1.2)}/>` + (r < 3 ? books(646, y, 120, 26, r * 3) : '')).join('');
  }

  /* ---------- school ---------- */
  function schoolBanner() {
    const studentDesk = x => `<path d="M${x - 24} 190v-32M${x + 24} 190v-32" stroke="#8A8F96" stroke-width="3.5"/><rect x="${x - 32}" y="152" width="64" height="7" rx="2" fill="#E2B66B" ${ol()}/><rect x="${x - 10}" y="146" width="20" height="6" fill="#FFFFFF" ${ol(1)}/>`;
    return wall('#F6F1DE') + `<rect y="104" width="800" height="46" fill="#CFE0C3"/><rect y="100" width="800" height="6" fill="#A86F45" ${ol()}/>` + planks('#C9A06A', '#AF8650') +
      `<path d="M0 6q100 14 200 0t200 0 200 0 200 0" fill="none" stroke="#5A4632" stroke-width="1.5"/>` + repeat(25, i => `<path d="M${i * 32 + 6} ${8 + Math.abs(Math.sin(i * .8)) * 4}l18 0-9 14z" fill="${COLORS[i % 8]}"/>`) +
      win(30, 26, 86, 70, 'trees') + win(140, 26, 86, 70, 'trees') +
      `<rect x="30" y="118" width="200" height="72" fill="#A86F45" ${ol()}/><rect x="30" y="152" width="200" height="5" fill="#8A5A3B"/>${books(38, 150, 186, 26)}${books(38, 186, 186, 26, 4)}` +
      // blackboard
      `<rect x="252" y="22" width="296" height="80" rx="3" fill="#A86F45" ${ol()}/><rect x="260" y="30" width="280" height="64" fill="#2E4A3A"/>` +
      `<g fill="none" stroke="#F4EFE4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".9"><path d="M280 80l14-28 14 28z"/><circle cx="340" cy="66" r="14"/>` +
      `<path d="M384 56h16M392 48v16M412 60h16M412 68h16"/><path d="M452 52l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z"/><path d="M490 76q10-24 20 0t20 0" /></g>` +
      `<rect x="252" y="100" width="296" height="6" fill="#A86F45" ${ol(1.4)}/><rect x="300" y="96" width="12" height="4" fill="#FFFFFF"/><rect x="330" y="96" width="10" height="4" fill="#F7B8C8"/>` +
      // teacher's desk
      `<rect x="324" y="148" width="152" height="42" fill="#C9905A" ${ol()}/><rect x="316" y="140" width="168" height="9" rx="2" fill="#A86F45" ${ol()}/>` +
      `<circle cx="352" cy="132" r="7" fill="#C0392B" ${ol(1.4)}/><path d="M352 125q3-5 7-4" stroke="#4E7C3A" stroke-width="2" fill="none"/>` +
      `<rect x="384" y="130" width="34" height="5" fill="#4F7CAC" ${ol(1)}/><rect x="386" y="125" width="30" height="5" fill="#F2C14E" ${ol(1)}/>` +
      `<path d="M452 140v-6M444 140h16" ${ol(1.6)}/><circle cx="452" cy="120" r="13" fill="#6FB0C4" ${ol()}/><path d="M444 114q6-4 8 2t6 4M448 126q4 2 8-2" stroke="#6E9F58" stroke-width="3" fill="none"/>` +
      clock(604, 40) + frame(650, 26, 120, 66, `<rect x="655" y="31" width="110" height="56" fill="#BFE0F0"/><path d="M664 46q12-8 22 0t6 18q-10 6-18-2zM704 40q20-6 30 6t12 24q-14 4-26-6t-16-24z" fill="#7DB46C"/>`, '#4F7CAC') +
      chair(586, 190, '#4F7CAC') + studentDesk(634) + chair(706, 190, '#E85D75') + studentDesk(754);
  }

  /* ---------- village (outdoors: sky above y=150, grass and a mud path below) ---------- */
  function villageBanner() {
    const frond = (dx, dy, tx, ty) => `<path d="M0 0q${dx} ${dy} ${tx} ${ty}q${dx * .2} ${dy * -.6} ${-tx} ${-ty}z"/>`;
    const palm = (x, base, h, s = 1) => `<g transform="translate(${x} ${base}) scale(${s})"><path d="M0 0q6 ${-h / 2} 0 ${-h}" fill="none" stroke="#8A6A3E" stroke-width="5" stroke-linecap="round"/>` +
      `<g transform="translate(0 ${-h})" fill="#5E8C3A" ${ol(1.4)} stroke-linejoin="round">${frond(-14, -16, -34, 6)}${frond(14, -16, 34, 6)}${frond(-20, -2, -30, 18)}${frond(20, -2, 30, 18)}${frond(-4, -18, -10, -22)}${frond(4, -18, 12, -20)}</g></g>`;
    const hut = (x, w, h, wall, roof) => `<g><rect x="${x}" y="${150 - h}" width="${w}" height="${h}" fill="${wall}" ${ol()}/>` +
      `<path d="M${x - 14} ${150 - h + 4}L${x + w / 2} ${150 - h - 34}L${x + w + 14} ${150 - h + 4}z" fill="${roof}" ${ol()} stroke-linejoin="round"/>` +
      repeat(Math.floor((w + 20) / 9), i => `<path d="M${x - 8 + i * 9} ${150 - h + 2}l${(x + w / 2 - (x - 8 + i * 9)) * .35} -10" stroke="#9A6E2E" stroke-width="1.4"/>`) +
      `<rect x="${x + w * .38}" y="${150 - h * .62}" width="${w * .24}" height="${h * .62}" fill="#4A3424" ${ol(1.6)}/></g>`;
    let bricks = '';
    for (let y = 104, r = 0; y < 150; y += 8, r++) {
      bricks += `<path d="M118 ${y}H186" stroke="#7E3B22" stroke-width="1"/>`;
      for (let x = 118 + (r % 2) * 8; x < 186; x += 16) bricks += `<path d="M${x} ${y}v8" stroke="#7E3B22" stroke-width="1"/>`;
    }
    return `
      <rect width="800" height="200" fill="#BFE4F2"/><rect y="70" width="800" height="80" fill="#D6EEF5"/>
      <circle cx="610" cy="34" r="16" fill="#FFE7A3"/>
      <g fill="#FFFFFF" opacity=".85"><ellipse cx="230" cy="30" rx="34" ry="9"/><ellipse cx="258" cy="24" rx="20" ry="9"/><ellipse cx="700" cy="56" rx="28" ry="7"/></g>

      <!-- far fields -->
      <path d="M0 122q120 -14 260 -6t280 -4 260 2v38H0z" fill="#A9CF8A"/>
      <path d="M0 132q200 -10 400 -4t400 0v22H0z" fill="#8DBF6A"/>
      ${repeat(26, i => `<path d="M${i * 32} 150l18 -18" stroke="#76A852" stroke-width="2" opacity=".7"/>`)}
      ${palm(232, 128, 58, .9)}${palm(588, 132, 70)}${palm(668, 128, 52, .8)}

      <!-- neem tree -->
      <path d="M64 150q4 -40 -2 -78M66 108q-16 -8 -26 -22M64 96q18 -10 30 -26" fill="none" stroke="#6B4A2B" stroke-width="9" stroke-linecap="round"/>
      <g fill="#4F8A45" ${ol(1.6)}><circle cx="30" cy="40" r="30"/><circle cx="76" cy="22" r="32"/><circle cx="122" cy="44" r="28"/><circle cx="62" cy="60" r="26"/><circle cx="100" cy="66" r="20"/></g>
      <g fill="#6FA85A"><circle cx="60" cy="18" r="10"/><circle cx="110" cy="36" r="8"/><circle cx="24" cy="34" r="8"/></g>

      <!-- brick shed with a sloping tin roof -->
      <rect x="118" y="104" width="68" height="46" fill="#B5563C" ${ol()}/>${bricks}
      <path d="M110 108l12 -20h80v20z" fill="#8C96A3" ${ol()} stroke-linejoin="round"/>

      <!-- pucca house: plastered walls, flat roof with a coloured parapet, door and barred window -->
      <g>
        <rect x="262" y="70" width="190" height="80" fill="#D99A7E" ${ol()}/>
        <rect x="256" y="62" width="202" height="10" fill="#E0A21A" ${ol()}/>
        <rect x="262" y="140" width="190" height="10" fill="#B87A60" ${ol(1.6)}/>
        <rect x="318" y="88" width="40" height="62" fill="#5B4A3E" ${ol()}/><rect x="324" y="94" width="28" height="14" fill="#8C7A6A" ${ol(1.2)}/>
        <rect x="390" y="92" width="38" height="18" fill="#3E3A36" ${ol()}/>
        <path d="M396 92v18M402 92v18M408 92v18M414 92v18M420 92v18" stroke="#B8B2A8" stroke-width="1.6"/>
        <rect x="292" y="80" width="14" height="4" rx="2" fill="#F4EFE2" opacity=".6"/>
      </g>

      <!-- handpump -->
      <g>
        <rect x="474" y="142" width="26" height="8" fill="#9AA5B1" ${ol(1.6)}/>
        <rect x="483" y="104" width="9" height="40" fill="#2F6DB5" ${ol(1.6)}/>
        <path d="M492 112h10l-3 6" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <path d="M487 104l-20 -14" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><circle cx="467" cy="90" r="3" fill="${INK}"/>
      </g>

      <!-- haystack -->
      <path d="M520 150q2 -34 24 -38t26 38z" fill="#E3B45C" ${ol()}/><path d="M530 132q12 -6 30 0M526 142q18 -6 38 0" fill="none" stroke="#B8862E" stroke-width="1.6"/>

      <!-- thatched huts -->
      ${hut(600, 70, 44, '#C9A27A', '#C99A4A')}${hut(700, 86, 52, '#B98E62', '#B88A3A')}

      <!-- grass and a mud path winding out of the house -->
      <rect y="150" width="800" height="50" fill="#7DB46C"/>
      <path d="M0 150H800" ${ol()}/>
      <path d="M326 150q-10 16 -60 22t-86 28h86q30 -14 76 -22t4 -28z" fill="#E2C79A" stroke="#B98E5A" stroke-width="2"/>
      ${[40, 128, 420, 508, 596, 684, 760].map((x, i) => `<path d="M${x} ${168 + (i % 3) * 8}l4 -8 3 8 4 -10 3 10" fill="none" stroke="#4E8A3E" stroke-width="1.8" stroke-linecap="round"/>`).join('')}
    `;
  }

  /* ---------- AI-designed scenery for a "custom" business ----------
     The scenery is a description cleaned by QP.cleanScenery: which hand-drawn part stands in each of five columns, and
     up to three objects the AI drew as simple shapes. Placement, outlines and colours all come from here, so the scene
     matches the hand-made ones. */
  const SC_COLS = [{ cx: 80, w: 150 }, { cx: 232, w: 140 }, { cx: 400, w: 190 }, { cx: 568, w: 140 }, { cx: 720, w: 150 }];
  const SC_PARTS = {
    // wall
    window: (cx) => win(cx - 58, 30, 116, 72, 'trees', 1),
    'city-window': (cx) => win(cx - 58, 30, 116, 72, 'city', 2),
    clock: (cx) => clock(cx, 62, 18),
    picture: (cx) => frame(cx - 34, 36, 68, 52, hills(cx - 34, 36, 68, 52)),
    noticeboard: (cx) => `<rect x="${cx - 48}" y="30" width="96" height="70" rx="3" fill="#A86F45" ${ol()}/><rect x="${cx - 42}" y="36" width="84" height="58" fill="#D9B98E"/>` +
      [[-34, 42, '#FFFFFF', -4], [-6, 40, '#F2C14E', 3], [16, 46, '#BFE0E8', -2], [-24, 66, '#F7B8C8', 2], [6, 68, '#FFFFFF', -3]].map(([dx, y, c, r]) =>
        `<g transform="rotate(${r} ${cx + dx + 10} ${y + 10})"><rect x="${cx + dx}" y="${y}" width="22" height="20" fill="${c}" ${ol(1.2)}/><path d="M${cx + dx + 4} ${y + 8}h14M${cx + dx + 4} ${y + 13}h10" stroke="#8A8F96" stroke-width="1.4"/><circle cx="${cx + dx + 11}" cy="${y + 2}" r="2" fill="#B8432F"/></g>`).join(''),
    // floor
    // Neutral counter for any business: a till and a tray of papers
    counter: (cx, w, st) => counter(cx - w / 2 + 12, cx + w / 2 - 12, 118, st.page[5], '#E7E2DA') + register(cx - 40, 118) +
      `<rect x="${cx + 18}" y="111" width="34" height="7" rx="1.5" fill="#C9CED4" ${ol(1.4)}/><rect x="${cx + 22}" y="105" width="26" height="7" fill="#FFFFFF" ${ol(1.2)}/><rect x="${cx + 25}" y="100" width="22" height="6" fill="${st.page[3]}" ${ol(1.2)}/>`,
    'reception-desk': (cx, w, st) => reception(cx - w / 2 + 16, cx + w / 2 - 16, 120, '#E7E2DA', st.page[5]) +
      `<rect x="${cx + 4}" y="100" width="34" height="22" rx="2" fill="#3B4A54" ${ol(1.4)}/><rect x="${cx + 8}" y="104" width="26" height="14" fill="#BFE0E8"/><path d="M${cx + 21} 122v6M${cx + 13} 128h16" ${ol(1.4)}/>` +
      `<path d="M${cx - 34} 124q8-12 16 0z" fill="#C9A04A" ${ol(1.4)}/><circle cx="${cx - 26}" cy="111" r="2" fill="#C9A04A" ${ol(1)}/>`,
    'waiting-chairs': (cx, w, st) => [-1, 0, 1].map(i => chair(cx + i * 38, 188, [st.page[5], st.map[4], st.map[2]][i + 1])).join('') +
      `<path d="M${cx - 60} 164h120" stroke="#8A8F96" stroke-width="4" stroke-linecap="round"/>`,
    'table-and-chairs': (cx, w, st) => table(cx, 188, 74, '#8A5A3B', st.page[3]) + chair(cx - 50, 188, st.page[5]) + chair(cx + 50, 188, st.page[5], true),
    desk: (cx, w, st) => `<rect x="${cx - 52}" y="134" width="104" height="7" rx="2" fill="#A86F45" ${ol()}/><path d="M${cx - 44} 141v47M${cx + 44} 141v47" stroke="#8A5A3B" stroke-width="5"/>` +
      `<rect x="${cx - 46}" y="141" width="36" height="34" fill="#C9A06A" ${ol(1.4)}/><path d="M${cx - 40} 158h24" ${ol(1.2)}/>` +
      `<rect x="${cx - 4}" y="98" width="46" height="32" rx="2" fill="#3B4A54" ${ol()}/><rect x="${cx}" y="102" width="38" height="24" fill="#BFE0E8"/><path d="M${cx + 19} 130v4M${cx + 9} 134h20" ${ol(1.6)}/>` +
      `<rect x="${cx - 36}" y="128" width="26" height="6" rx="1" fill="#E7E2DA" ${ol(1.2)}/>` + chair(cx + 54, 188, st.map[2], true),
    bookshelf: (cx) => `<rect x="${cx - 56}" y="28" width="112" height="160" fill="#A86F45" ${ol()}/><rect x="${cx - 50}" y="34" width="100" height="148" fill="#C9A06A"/>` +
      [66, 102, 138, 174].map((y, r) => `<rect x="${cx - 54}" y="${y}" width="108" height="5" fill="#8A5A3B" ${ol(1.2)}/>` + books(cx - 48, y, 96, 26, r * 3)).join(''),
    plant: (cx) => plant(cx, 188, 1.35),
    'water-cooler': (cx) => `<rect x="${cx - 18}" y="120" width="36" height="68" rx="3" fill="#E7E2DA" ${ol()}/><rect x="${cx - 6}" y="140" width="12" height="8" fill="#5A6068"/>` +
      `<path d="M${cx - 16} 120q0-14 16-14t16 14z" fill="#BFE0E8" ${ol()}/><rect x="${cx - 16}" y="76" width="32" height="34" rx="8" fill="#9FD3E8" ${ol()}/><path d="M${cx - 8} 84v18" stroke="#FFFFFF" stroke-width="3" opacity=".7"/>`,
    sofa: (cx, w, st) => `<rect x="${cx - 54}" y="132" width="108" height="30" rx="8" fill="${st.map[2]}" ${ol()}/><rect x="${cx - 62}" y="146" width="124" height="30" rx="8" fill="${st.map[2]}" ${ol()}/>` +
      `<rect x="${cx - 66}" y="140" width="16" height="40" rx="6" fill="${st.map[2]}" ${ol()}/><rect x="${cx + 50}" y="140" width="16" height="40" rx="6" fill="${st.map[2]}" ${ol()}/><path d="M${cx} 148v26" stroke="#00000033" stroke-width="2"/>` +
      `<path d="M${cx - 54} 188v-8M${cx + 54} 188v-8" ${ol(3)}/><rect x="${cx - 40}" y="136" width="22" height="16" rx="5" fill="${st.page[3]}" ${ol(1.4)}/>`,
    // Waist high, so whatever hangs on the wall above stays clear
    'filing-cabinet': (cx) => `<rect x="${cx - 26}" y="116" width="52" height="72" rx="2" fill="#C9CED4" ${ol()}/>` +
      [0, 1, 2].map(i => `<rect x="${cx - 20}" y="${122 + i * 21.5}" width="40" height="17" rx="2" fill="#E7E2DA" ${ol(1.2)}/><rect x="${cx - 8}" y="${128 + i * 21.5}" width="16" height="4" rx="2" fill="#5A6068"/>`).join('')
  };

  // One AI-drawn object, scaled into its slot and clipped to it. Strokes are set so the outline matches the hand-drawn parts.
  function sceneryShapes(shapes, stroke) {
    const C = (QP.SCENERY || {}).colours || {};
    return shapes.map(sh => {
      const fill = sh.fill === 'none' ? 'none' : C[sh.fill];
      const line = sh.outline === 'none' ? '' : ` stroke="${INK}" stroke-width="${(sh.outline === 'thin' ? stroke * .6 : stroke).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"`;
      if (sh.t === 'rect') return `<rect x="${sh.x}" y="${sh.y}" width="${sh.w}" height="${sh.h}" rx="${sh.rx}" fill="${fill}"${line}/>`;
      if (sh.t === 'circle') return `<circle cx="${sh.cx}" cy="${sh.cy}" r="${sh.r}" fill="${fill}"${line}/>`;
      if (sh.t === 'ellipse') return `<ellipse cx="${sh.cx}" cy="${sh.cy}" rx="${sh.rx}" ry="${sh.ry}" fill="${fill}"${line}/>`;
      return `<path d="${sh.d}" fill="${fill}"${line}/>`;
    }).join('');
  }
  function propMarkup(p, x, y, w, h, outline = 2) {
    const k = Math.min(w / p.w, h / p.h, 1.6), pw = p.w * k, ph = p.h * k;
    // Floor objects stand on the floor line; wall objects hang in the middle of their space.
    const px = x + (w - pw) / 2, py = p.zone === 'floor' ? y + h - ph : y + (h - ph) / 2;
    return `<svg x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" viewBox="-2 -2 ${p.w + 4} ${p.h + 4}" overflow="hidden">${sceneryShapes(p.shapes, outline / k)}</svg>`;
  }

  function drawScenery(sc, st) {
    const props = Object.fromEntries(sc.props.map(p => [p.id, p]));
    const prop = name => name && name.startsWith('prop:') ? props[name.slice(5)] : null;
    const isTall = name => (QP.SCENERY.tallParts || []).includes(name) || Boolean(prop(name) && prop(name).tall);
    const floorFill = { planks: () => planks('#D9B98E', '#C29E70'), tiles: () => tiles(st.page[4], st.map[1]), carpet: () => carpet(st.map[1], st.page[3]) }[sc.floor];
    const spot = x => `<path d="M${x} 12l-40 138h80z" fill="#FFF6D6" opacity=".28"/><path d="M${x} 10l-8 12h16z" fill="#3A3F45" ${ol(1.2)}/>`;
    let out = wall(st.page[0], sc.wallStripes ? st.page[3] : null) + floorFill() + (sc.lamps ? spot(156) + spot(400) + spot(644) : '');
    SC_COLS.forEach((col, i) => {
      const { wall: w, floor: f } = sc.columns[i];
      if (w && !isTall(f)) {
        const p = prop(w);
        out += p ? propMarkup(p, col.cx - col.w / 2 + 10, 26, col.w - 20, 84) : SC_PARTS[w](col.cx, col.w, st);
      }
      if (f) {
        const p = prop(f);
        out += p ? propMarkup(p, col.cx - col.w / 2 + 8, p.tall ? 28 : 96, col.w - 16, p.tall ? 160 : 92) : SC_PARTS[f](col.cx, col.w, st);
      }
    });
    return out;
  }
  QP.drawScenery = drawScenery;

  // A custom RPG stop icon, in the 44 x 40 box the map's stop drawings use (centred on x = 0, standing on y = 0).
  QP.sceneryStopIcon = (sc, questionId) => {
    const icon = sc && sc.stopIcons.find(s => s.questionId === questionId);
    return icon ? `<svg x="-22" y="-40" width="44" height="40" viewBox="-1 -1 46 42" overflow="hidden">${sceneryShapes(icon.shapes, 1.4)}</svg>` : '';
  };

  QP.banners = {
    bakery: { draw: bakeryBanner, labelHi: 'बेकरी के अंदर: ब्रेड की अलमारियाँ, केक से भरा शीशे का डिब्बा, कई मंज़िला केक और ईंटों का तंदूर।', label: 'Inside the bakery: bread shelves, a glass display case of cakes, a tiered cake and a brick oven.' },
    cafe: { draw: cafeBanner, labelHi: 'कैफ़े के अंदर: पेड़ों वाली खिड़की, एस्प्रेसो मशीन, काउंटर पर पेस्ट्री, चॉकबोर्ड मेन्यू और दो लोगों की छोटी मेज़।', label: 'Inside the café: a window with trees, an espresso machine, a pastry dome on the counter, a chalkboard menu and a small table for two.' },
    restaurant: { draw: restaurantBanner, labelHi: 'रेस्टोरेंट के अंदर: रसोई की खिड़की के दोनों ओर मोमबत्ती वाली सजी मेज़ें, जहाँ परोसने के लिए प्लेटें तैयार हैं।', label: 'Inside the restaurant: candle-lit tables set for dinner on either side of the kitchen pass, where plates wait to be served.' },
    retail: { draw: retailBanner, labelHi: 'दुकान के अंदर: डिब्बों और पैकेटों से भरी अलमारियाँ, ठंडे पेय का फ़्रिज, तराज़ू वाला बिलिंग काउंटर, फलों की टोकरियाँ और चावल-दाल की बोरियाँ।', label: 'Inside the shop: shelves of jars and packets, a cold drinks fridge, the checkout counter with a weighing scale, crates of fruit and sacks of rice and dal.' },
    fashion: { draw: fashionBanner, labelHi: 'कपड़ों की दुकान के अंदर: कपड़ों की रैक, तह किए कपड़ों की अलमारी, शॉपिंग बैग वाला बिलिंग काउंटर, पुतला और जूतों की दीवार।', label: 'Inside the clothes shop: a rail of clothes, folded shelves, the checkout counter with shopping bags, a mannequin and a wall of shoes.' },
    petshop: { draw: petshopBanner, labelHi: 'पेट शॉप के अंदर: मछलियों वाला एक्वेरियम, पालतू जानवरों के खाने की अलमारी, बिलिंग काउंटर, पिंजरे में चिड़िया, स्क्रैचिंग पोस्ट पर बिल्ली और बिस्तर पर बैठा कुत्ता।', label: 'Inside the pet shop: an aquarium of fish, shelves of pet food, the checkout counter, a bird in its cage, a cat on a scratching post and a dog on its bed.' },
    salon: { draw: salonBanner, labelHi: 'सैलून के अंदर: रोशनी वाले आईनों के सामने दो कुर्सियाँ, उत्पादों की अलमारियाँ, बाल धोने का बेसिन और हेयर ड्रायर।', label: 'Inside the salon: two styling chairs at lit mirrors, shelves of products, a wash basin and a hood dryer.' },
    gym: { draw: gymBanner, labelHi: 'जिम के अंदर: डम्बल रैक, आईने के सामने ट्रेडमिल, एक्सरसाइज़ बॉल, केटलबेल और बेंच प्रेस।', label: 'Inside the gym: a dumbbell rack, a treadmill in front of a mirror wall, an exercise ball, kettlebells and a bench press.' },
    clinic: { draw: clinicBanner, labelHi: 'क्लिनिक के अंदर: खिड़की के पास शांत प्रतीक्षा क्षेत्र, रिसेप्शन डेस्क, परामर्श कक्ष का दरवाज़ा और वॉटर कूलर।', label: 'Inside the clinic: a calm waiting area by the window, the reception desk, a consulting room door and a water cooler.' },
    hotel: { draw: hotelBanner, labelHi: 'होटल की लॉबी: झूमर, घंटी और कमरे की चाबियों वाला रिसेप्शन डेस्क, सामान की ट्रॉली और लिफ़्ट।', label: 'Inside the hotel lobby: chandeliers, the reception desk with a bell and room keys, a luggage cart and the lift.' },
    office: { draw: officeBanner, labelHi: 'ऑफ़िस के अंदर: शहर की ओर खुलती खिड़की के पास मॉनिटर वाली मेज़ें, बार चार्ट वाला व्हाइटबोर्ड, पौधा और किताबों की अलमारी।', label: 'Inside the office: desks with monitors by a city window, a whiteboard with a bar chart, a plant and a bookshelf.' },
    village: { draw: villageBanner, labelHi: 'गाँव का दृश्य: नीम का पेड़, ईंटों का छप्पर, पक्का घर, हैंडपंप, भूसे का ढेर, फूस की झोपड़ियाँ, खेत और कच्चा रास्ता।', label: 'A village: a neem tree, a brick shed, a plastered house, a handpump, a haystack, thatched huts, fields and a mud path.' },
    school: { draw: schoolBanner, labelHi: 'कक्षा के अंदर: चॉक से बनी आकृतियों वाला ब्लैकबोर्ड, सेब और ग्लोब वाली शिक्षक की मेज़, किताबों की अलमारियाँ और बच्चों की मेज़ें।', label: 'Inside the classroom: a blackboard with chalk drawings, the teacher\'s desk with an apple and a globe, bookshelves and pupils\' desks.' }
  };
})(window);
