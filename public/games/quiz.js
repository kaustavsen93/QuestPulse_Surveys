/* Quiz show engine. Every answer scores the same: points are for taking part, never for what is answered. */
(function () {
  const QP = window.QP, el = QP.el;
  const POINTS = 100;
  const UI = {
    episode: 'Tonight: {title}', docTitle: '{show}: {title}', begin: 'Start the show', submit: 'Lock it in',
    skip: 'Skip this one', textPlaceholder: 'Type your answer here', round: 'Round {n} of {total}',
    points: 'Points', rounds: 'Rounds', applause: 'Applause', earned: 'points for taking part',
    answerIn: 'Thanks, your answer is in.', next: 'Next round', toFinale: 'To the finale',
    finale: 'That\'s a wrap!', finalScore: 'Final score', thanks: 'Thank you for playing along.',
    skipped: 'Skipped',
    restart: 'Watch the show again', said: '{name}:', scoreNow: '{score} points', lampDone: 'Round {n} played', lampTodo: 'Round {n} to play'
  };

  const $ = s => document.querySelector(s);
  const stage = $('#stage'), studio = $('#studio');
  let C, ui, session, idx = -1, score = 0, shown = 0;

  function hostArt(look) {
    const s = look.suitColor, a = look.accentColor, k = look.skinTone;
    const hair = {
      quiff: '<path d="M41 60 Q39 37 60 35 Q76 33 82 44 Q90 40 88 31 Q76 21 57 25 Q39 30 41 60Z" fill="#2A1B12"/>',
      bob: '<path d="M39 76 Q34 38 60 37 Q86 38 81 76 L76 76 Q77 50 60 48 Q43 50 44 76Z" fill="#3B2416"/>',
      curls: '<g fill="#24160E"><circle cx="45" cy="50" r="8"/><circle cx="52" cy="41" r="8"/><circle cx="62" cy="38" r="8"/><circle cx="72" cy="42" r="8"/><circle cx="77" cy="51" r="7"/></g>',
      bald: '<ellipse cx="68" cy="47" rx="6" ry="3" fill="#FFFFFF" opacity=".25"/>',
      bun: '<path d="M41 62 Q40 39 60 38 Q80 39 79 62 Q74 48 60 47 Q46 48 41 62Z" fill="#3B2416"/><circle cx="60" cy="33" r="9" fill="#3B2416"/>'
    }[look.hair] || '';
    const extra = {
      microphone: `<path d="M84 118 Q100 104 93 88" fill="none" stroke="${s}" stroke-width="10" stroke-linecap="round"/><circle cx="92" cy="86" r="5" fill="${k}"/><rect x="88.5" y="66" width="7" height="20" rx="3" fill="#2B2B2B"/><circle cx="92" cy="63" r="7" fill="#A3A9B0" stroke="#2B2B2B" stroke-width="1.5"/><path d="M87 63h10M92 58v10" stroke="#2B2B2B" stroke-width=".8" opacity=".5"/>`,
      'cue-cards': `<path d="M84 122 Q98 116 96 104" fill="none" stroke="${s}" stroke-width="10" stroke-linecap="round"/><g transform="rotate(-12 92 104)"><rect x="80" y="94" width="26" height="17" rx="2" fill="#FFFFFF" stroke="#2B2B2B" stroke-width="1.5"/><path d="M84 100h17M84 105h12" stroke="${a}" stroke-width="1.6"/></g><circle cx="95" cy="104" r="5" fill="${k}"/>`,
      glasses: '<g fill="none" stroke="#1E1E1E" stroke-width="2"><circle cx="52" cy="62" r="6"/><circle cx="68" cy="62" r="6"/><path d="M58 62h4"/></g>',
      whisk: `<path d="M84 118 Q100 104 93 88" fill="none" stroke="${s}" stroke-width="10" stroke-linecap="round"/><rect x="89.5" y="72" width="5" height="16" rx="2.5" fill="#A86F45" stroke="#2B2B2B" stroke-width="1.2"/><path d="M92 72c-11-8-9-24 0-24s11 16 0 24zM92 72c-5-8-4-24 0-24s5 16 0 24z" fill="none" stroke="#7C848C" stroke-width="2"/><circle cx="92" cy="86" r="5" fill="${k}"/>`
    }[look.accessory] || '';
    const apron = look.apron ? `<path d="M45 112 H75 L80 160 H40Z" fill="#FFFFFF" stroke="#00000030" stroke-width="1.5"/><path d="M47 112 L51 96 M73 112 L69 96" stroke="#FFFFFF" stroke-width="3"/><rect x="52" y="126" width="16" height="11" rx="2" fill="none" stroke="${a}" stroke-width="2"/>` : '';
    return `<path d="M20 160 L27 104 Q60 86 93 104 L100 160Z" fill="${s}"/>
      <rect x="54" y="80" width="12" height="14" fill="${k}"/>
      <path d="M49 94 L60 122 L71 94Z" fill="#FFFFFF"/>
      <path d="M49 94 L60 122 L44 108Z M71 94 L60 122 L76 108Z" fill="#00000030"/>
      <path d="M51 98 L60 102 L51 106Z M69 98 L60 102 L69 106Z" fill="${a}"/><circle cx="60" cy="102" r="2.6" fill="${a}"/>${apron}
      <ellipse cx="60" cy="62" rx="19" ry="21" fill="${k}"/>
      <path d="M47 53q5-3 9 0M64 53q5-3 9 0" fill="none" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round"/>
      <circle cx="52" cy="61" r="2.2" fill="#1E1E1E"/><circle cx="68" cy="61" r="2.2" fill="#1E1E1E"/>
      <path d="M51 70 Q60 80 69 70Z" fill="#FFFFFF" stroke="#1E1E1E" stroke-width="2" stroke-linejoin="round"/>
      ${hair}${extra}`;
  }
  const hostSvg = () => {
    const d = document.createElement('div');
    d.innerHTML = `<svg viewBox="0 0 120 160" role="img">${hostArt(C.host.look)}</svg>`;
    d.firstElementChild.setAttribute('aria-label', `${C.host.name}, the host`);
    return d.firstElementChild;
  };

  const pad = n => String(n).padStart(4, '0');
  function setScore(target) {
    score = target;
    const out = $('#score');
    $('#board').setAttribute('aria-label', `${ui.points}: ${QP.fill(ui.scoreNow, { score })}`);
    if (QP.reducedMotion()) { shown = score; out.textContent = pad(score); return; }
    const from = shown, t0 = performance.now();
    (function tick(now) {
      const t = Math.min(1, (now - t0) / 700);
      shown = Math.round(from + (score - from) * (1 - Math.pow(1 - t, 3)));
      out.textContent = pad(shown);
      if (t < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function renderLamps() {
    const lamps = $('#lamps');
    lamps.innerHTML = '';
    C.questions.forEach((q, i) => {
      const on = session.has(q.id);
      lamps.append(el('li', { class: 'lamp' + (on ? ' on' : '') + (i === idx && !on ? ' now' : ''), 'aria-label': QP.fill(on ? ui.lampDone : ui.lampTodo, { n: i + 1 }) }));
    });
  }

  function cheer() {
    const sign = $('#applause');
    sign.classList.remove('on'); studio.classList.remove('cheer');
    void sign.offsetWidth;
    sign.classList.add('on'); studio.classList.add('cheer');
    clearTimeout(cheer.t);
    cheer.t = setTimeout(() => { sign.classList.remove('on'); studio.classList.remove('cheer'); }, 1700);
  }

  function confetti() {
    if (QP.reducedMotion()) return;
    const colors = ['var(--hot)', 'var(--cool)', 'var(--gold)', '#FFFFFF', 'var(--hot-deep)'];
    const box = el('div', { class: 'confetti', 'aria-hidden': 'true' });
    for (let i = 0; i < 90; i++) {
      const piece = el('i');
      piece.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-duration:${2.6 + Math.random() * 2.4}s;animation-delay:${Math.random() * .9}s;--drift:${(Math.random() - .5) * 160}px;--spin:${(Math.random() - .5) * 1080}deg;`;
      box.append(piece);
    }
    document.body.append(box);
    setTimeout(() => box.remove(), 6500);
  }

  const announce = t => { $('#announce').textContent = t; };
  const hostRow = line => el('div', { class: 'host-row' }, hostSvg(), el('p', { class: 'bubble' }, el('b', {}, QP.fill(ui.said, { name: C.host.name })), ' ', line));
  const roundTitle = q => el('h2', { class: 'round-title' }, el('span', {}, q.roundTitle));

  function setHeader() {
    $('#company').textContent = C.company;
    $('#showName').textContent = C.show.name;
    $('#episode').textContent = QP.fill(ui.episode, C);
    document.title = QP.fill(ui.docTitle, { show: C.show.name, title: C.title });
    studio.className = 'studio pal-' + C.show.palette;
    // Business setting: the show's set is dressed as the premises
    const old = $('.scene-banner');
    if (old) old.remove();
    const banner = QP.scenes.banner(QP.scenes.apply(C));
    if (banner) $('#board').after(banner);
    $('#pointsCap').textContent = ui.points;
    $('#roundsCap').textContent = ui.rounds;
    $('#applause').textContent = ui.applause;
  }

  function renderIntro() {
    stage.innerHTML = '';
    stage.append(el('div', { class: 'segment' },
      hostRow(C.host.introLine),
      el('article', { class: 'card intro' },
        C.intro.map(p => el('p', {}, p)),
        el('p', {}, el('b', {}, C.host.catchphrase)),
        el('div', { class: 'actions' }, el('button', { class: 'primary', onclick: () => { session.start(); idx = 0; renderQuestion(); } }, ui.begin)))));
    renderLamps();
  }

  function renderQuestion() {
    const q = C.questions[idx];
    session.begin();
    const form = QP.questionForm(q, ui, value => record(q, value));
    stage.innerHTML = '';
    stage.append(el('div', { class: 'segment' },
      hostRow(q.hostLine),
      el('article', { class: 'card' },
        el('p', { class: 'round-tag' }, QP.fill(ui.round, { n: idx + 1, total: C.questions.length })),
        roundTitle(q),
        el('p', { class: 'prompt', id: 'prompt' }, q.prompt),
        form.control, form.actions)));
    renderLamps();
    stage.querySelector('.card button, .card textarea').focus({ preventScroll: true });
  }

  function record(q, value) {
    session.answer(q, value);
    const last = idx === C.questions.length - 1;
    setScore(score + POINTS);
    cheer();
    stage.innerHTML = '';
    stage.append(el('div', { class: 'segment' },
      hostRow(q.hostLine),
      el('article', { class: 'card' },
        el('p', { class: 'round-tag' }, QP.fill(ui.round, { n: idx + 1, total: C.questions.length })),
        roundTitle(q),
        el('div', { class: 'points', role: 'status' }, el('strong', {}, '+' + POINTS), el('span', {}, ui.earned)),
        el('p', {}, ui.answerIn),
        el('div', { class: 'actions' }, el('button', { class: 'primary', onclick: () => {
          if (last) { idx++; renderFinale(); } else { idx++; renderQuestion(); }
        } }, last ? ui.toFinale : ui.next)))));
    renderLamps();
    announce(`+${POINTS} ${ui.earned}. ${QP.fill(ui.scoreNow, { score })}`);
    stage.querySelector('.card .primary').focus({ preventScroll: true });
  }

  function renderFinale() {
    const response = session.record();
    stage.innerHTML = '';
    stage.append(el('div', { class: 'segment' },
      hostRow(C.ending),
      el('article', { class: 'card finale' },
        el('h2', { tabindex: '-1' }, ui.finale),
        el('p', { class: 'round-tag' }, ui.finalScore),
        el('p', { class: 'final-score' }, pad(score)),
        el('p', {}, ui.thanks),
        QP.answerSummary(C.questions, session.answers, ui),
        el('div', { class: 'actions' }, el('button', { class: 'ghost', onclick: restart }, ui.restart)))));
    renderLamps();
    confetti();
    stage.querySelector('h2').focus({ preventScroll: true });
    QP.complete(response);
  }

  function restart() {
    idx = -1; session.reset(); shown = 0; setScore(0); renderIntro();
  }

  function showError(message, errors = []) {
    stage.innerHTML = '';
    stage.append(el('article', { class: 'card' }, QP.errorParts(message, errors)));
  }

  QP.registerGame('quiz', {
    validate: QP.validateQuiz,
    start(config) {
      C = config; ui = QP.copy(UI, C, 'quiz'); session = QP.createSession(C);
      idx = -1; shown = 0; score = 0;
      setHeader(); $('#score').textContent = pad(0); renderIntro();
    },
    preview(config, i) {
      C = config; ui = QP.copy(UI, C, 'quiz');
      const n = C.questions.length;
      session = QP.previewSession(C, Math.max(0, i));
      setHeader();
      score = shown = session.count() * POINTS; $('#score').textContent = pad(score);
      if (i < 0) { idx = -1; renderIntro(); }
      else if (i < n) { idx = i; renderQuestion(); }
      else { idx = n; renderFinale(); }
    }
  });

  QP.boot('quiz', { reward: '#stage .segment', sample: QP.samples.quiz, showError, back: { parent: '.wrap', color: 'var(--on-wall)' } });
})();
