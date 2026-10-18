/* Detective game engine. All story content comes from the CASE config; UI copy can be overridden via config.ui. */
(function () {
  const QP = window.QP, el = QP.el;
  const UI = {
    header: '{caseNumber}, {company}', docTitle: 'Case file: {title}', detectiveTitle: 'Detective',
    open: 'Open the case', submit: 'Log answer', skip: 'Skip this one', textPlaceholder: 'Write your answer here',
    statementLogged: 'Statement logged', newClue: 'New clue pinned to the board', note: '{name}: "{note}"',
    next: 'Next witness', solve: 'Solve the case', solved: 'Solved.', thanks: 'Thank you for your statements.',
    skipped: 'Skipped',
    restart: 'Start the case again', progress: 'Clues found: {n} of {total}', closed: 'Case closed',
    boardTitle: 'Evidence board', slotMissing: 'Clue {n} not found yet'
  };

  const $ = s => document.querySelector(s);
  const stage = $('#stage'), slots = $('#slots');
  let CASE, ui, session, idx = -1, justFound = null;

  /* Business setting: a scene of the premises above the case header */
  function setScene() {
    const old = $('.scene-banner');
    if (old) old.remove();
    const banner = QP.scenes.banner(QP.scenes.apply(CASE));
    if (banner) $('header.case').before(banner);
  }

  function setHeader() {
    $('#caseNum').textContent = QP.fill(ui.header, CASE);
    $('#caseTitle').textContent = CASE.title;
    document.title = QP.fill(ui.docTitle, CASE);
    const board = $('.board');
    board.setAttribute('aria-label', ui.boardTitle);
    board.querySelector('h2').textContent = ui.boardTitle;
  }

  /* Draws the detective from the AI-chosen "look" parameters */
  function drawDetective(look = {}) {
    const coat = look.coatColor || '#6B4F3A', accent = look.accentColor || '#B3261E', skin = look.skinTone || '#C68E63';
    const hats = {
      fedora: `<path d="M30 40 Q60 30 90 40 L84 44 Q60 38 36 44Z" fill="#2B2B2B"/><path d="M40 42 Q42 18 60 18 Q78 18 80 42Z" fill="#2B2B2B"/><rect x="40" y="35" width="40" height="5" fill="${accent}"/>`,
      deerstalker: `<path d="M38 44 Q40 16 60 16 Q80 16 82 44Z" fill="#8A6F4D"/><path d="M36 44 L28 50 L42 46Z M84 44 L92 50 L78 46Z" fill="#8A6F4D"/><path d="M44 28 H76 M42 36 H78" stroke="${accent}" stroke-width="2"/>`,
      beret: `<ellipse cx="62" cy="34" rx="26" ry="11" fill="${accent}"/><circle cx="62" cy="22" r="3" fill="${accent}"/>`,
      cap: `<path d="M40 42 Q42 20 60 20 Q78 20 80 42Z" fill="${accent}"/><path d="M78 40 L96 44 L78 44Z" fill="${accent}"/>`,
      toque: `<path d="M44 34 Q32 32 36 20 Q40 12 48 15 Q52 4 60 4 Q68 4 72 15 Q80 12 84 20 Q88 32 76 34Z" fill="#FFFFFF" stroke="#3A3A3A" stroke-width="2"/><rect x="43" y="32" width="34" height="10" rx="2" fill="#FFFFFF" stroke="#3A3A3A" stroke-width="2"/>`
    };
    const apron = look.apron ? `<path d="M46 98 H74 L80 140 H40Z" fill="#FFFFFF" stroke="#00000040" stroke-width="1.5"/><path d="M48 98 L54 78 M72 98 L66 78" stroke="#FFFFFF" stroke-width="3"/><rect x="52" y="112" width="16" height="10" rx="2" fill="none" stroke="${accent}" stroke-width="2"/>` : '';
    const items = {
      magnifier: `<line x1="94" y1="104" x2="104" y2="122" stroke="#3A3A3A" stroke-width="5" stroke-linecap="round"/><circle cx="88" cy="94" r="12" fill="#DDEBF5" fill-opacity=".7" stroke="#3A3A3A" stroke-width="4"/>`,
      notebook: `<rect x="82" y="88" width="20" height="26" rx="2" fill="#F5E9C8" stroke="#3A3A3A" stroke-width="2"/><line x1="86" y1="96" x2="98" y2="96" stroke="#3A3A3A"/><line x1="86" y1="102" x2="98" y2="102" stroke="#3A3A3A"/>`,
      umbrella: `<line x1="96" y1="70" x2="96" y2="130" stroke="#2B2B2B" stroke-width="3"/><path d="M96 130 q0 6 -6 6" fill="none" stroke="#2B2B2B" stroke-width="3"/>`
    };
    return `<svg viewBox="0 0 120 140" role="img" aria-label="Detective character">
    <path d="M28 140 L36 78 Q60 66 84 78 L92 140Z" fill="${coat}"/>
    <path d="M60 74 L52 100 L60 96 L68 100Z" fill="#F4F0E6"/>
    <line x1="60" y1="96" x2="60" y2="140" stroke="#00000033" stroke-width="2"/>
    ${apron}
    <circle cx="60" cy="52" r="18" fill="${skin}"/>
    <circle cx="53" cy="52" r="2.2" fill="#1E1E1E"/><circle cx="67" cy="52" r="2.2" fill="#1E1E1E"/>
    <path d="M54 60 Q60 64 66 60" fill="none" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round"/>
    ${hats[look.hat] || hats.fedora}
    ${items[look.accessory] || items.magnifier}
  </svg>`;
  }
  function detectiveSvg() { const d = document.createElement('div'); d.innerHTML = drawDetective(CASE.detective && CASE.detective.look); return d.firstElementChild; }

  const witnessBlock = (w, sub) => el('div', { class: 'witness' },
    QP.scenes.hasOutfit(w) ? el('div', { class: 'portrait' }, QP.scenes.person(w))
      : el('div', { class: 'badge', 'aria-hidden': 'true' }, w.initial || w.name.charAt(0)),
    el('div', {}, el('b', {}, w.name), el('span', {}, sub || '')));

  function renderBoard() {
    slots.innerHTML = '';
    CASE.questions.forEach((q, i) => {
      const found = session.has(q.id);
      const s = el('div', { class: 'slot' + (found ? ' found' : '') + (q.id === justFound ? ' fresh' : '') }, found ? q.clue : '?');
      if (!found) s.setAttribute('aria-label', QP.fill(ui.slotMissing, { n: i + 1 }));
      slots.append(s);
    });
    $('#progress').textContent = idx < 0 ? '' : QP.fill(ui.progress, { n: session.count(), total: CASE.questions.length });
    justFound = null;
  }

  function renderIntro() {
    stage.innerHTML = '';
    const d = CASE.detective;
    stage.append(el('div', { class: 'card intro' },
      el('div', { class: 'detective' }, detectiveSvg(),
        el('div', { class: 'who' }, el('b', {}, d.name), el('span', {}, d.title || ui.detectiveTitle))),
      el('p', { class: 'quip' }, d.introLine),
      CASE.intro.map(p => el('p', {}, p)),
      d.catchphrase ? el('p', {}, el('b', {}, d.catchphrase)) : '',
      el('div', { class: 'actions' },
        el('button', { class: 'primary', onclick: () => { session.start(); idx = 0; renderQuestion(); } }, ui.open))
    ));
    renderBoard();
  }

  function renderQuestion() {
    const q = CASE.questions[idx];
    session.begin();
    const form = QP.questionForm(q, ui, value => record(q, value));
    stage.innerHTML = '';
    stage.append(el('div', { class: 'card' },
      witnessBlock(q.witness, q.witness.role),
      q.setup ? el('p', { class: 'setup' }, q.setup) : '',
      el('p', { class: 'prompt', id: 'prompt' }, q.prompt),
      form.control, form.actions
    ));
    renderBoard();
    stage.querySelector('button, textarea').focus({ preventScroll: true });
  }

  function record(q, value) {
    session.answer(q, value);
    justFound = q.id;
    const last = idx === CASE.questions.length - 1;
    stage.innerHTML = '';
    stage.append(el('div', { class: 'card' },
      witnessBlock(q.witness, ui.statementLogged),
      el('div', { class: 'evidence', role: 'status' }, el('h3', {}, ui.newClue), el('p', { style: 'margin:0' }, q.clue)),
      q.detectiveNote ? el('div', { class: 'note' }, detectiveSvg(),
        el('p', {}, QP.fill(ui.note, { name: CASE.detective.name, note: q.detectiveNote }))) : '',
      el('div', { class: 'actions' }, el('button', { class: 'primary', onclick: () => {
        if (last) renderClosed(); else { idx++; renderQuestion(); }
      } }, last ? ui.solve : ui.next))
    ));
    renderBoard();
    stage.querySelector('.primary').focus({ preventScroll: true });
  }

  function renderClosed() {
    const response = session.record();
    stage.innerHTML = '';
    stage.append(el('div', { class: 'card' },
      el('div', { class: 'stamp', 'aria-hidden': 'true' }, ui.closed),
      el('p', { class: 'prompt solved', style: 'max-width:70%' }, ui.solved),
      el('div', { class: 'note' }, detectiveSvg(), el('p', {}, QP.fill(ui.note, { name: CASE.detective.name, note: CASE.ending }))),
      el('p', {}, ui.thanks),
      QP.answerSummary(CASE.questions, session.answers, ui),
      el('div', { class: 'actions' }, el('button', { class: 'ghost', onclick: () => {
        idx = -1; session.reset(); renderIntro(); } }, ui.restart))
    ));
    renderBoard();
    QP.complete(response);
  }

  function showError(message, errors = []) {
    stage.innerHTML = '';
    stage.append(el('div', { class: 'card' }, QP.errorParts(message, errors)));
  }

  QP.registerGame('detective', {
    validate: QP.validateCase,
    start(config) {
      CASE = QP.normalizeDetective(config);
      ui = QP.copy(UI, CASE, 'detective');
      session = QP.createSession(CASE);
      idx = -1;
      setHeader();
      setScene();
      renderIntro();
    },
    preview(config, i) {
      CASE = QP.normalizeDetective(config);
      ui = QP.copy(UI, CASE, 'detective');
      const n = CASE.questions.length;
      session = QP.previewSession(CASE, Math.max(0, i));
      setHeader();
      setScene();
      if (i < 0) { idx = -1; renderIntro(); }
      else if (i < n) { idx = i; renderQuestion(); }
      else { idx = n - 1; renderClosed(); }
    }
  });

  window.validateCase = QP.validateCase;
  window.startCase = config => window.startGame('detective', config);
  QP.boot('detective', { reward: '#stage', sample: QP.samples.detective, showError, back: { parent: 'header.case' } });
})();
