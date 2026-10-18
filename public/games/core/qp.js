/* QuestPulse shared game foundation: DOM helper, answer controls, response record, entry point. */
(function (root) {
  const QP = root.QP = root.QP || {};
  QP.TOO_FAST_MS = 1500;
  QP.games = QP.games || {};
  QP.samples = QP.samples || {};

  QP.el = function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    kids.flat().forEach(c => n.append(c instanceof Node ? c : document.createTextNode(c)));
    return n;
  };

  /* Repeatable pseudo-random numbers, so a config always draws the same map or level. */
  QP.seeded = function (str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  };

  QP.reducedMotion = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Builder modes, set by the game editor in index.html, which drives the page through postMessage (see QP.boot):
     ?mode=walkthrough shows any screen of a draft without game logic; ?mode=test plays a draft for real.
     Neither ever saves a response or issues a reward (QP.complete below). */
  const mode = new URLSearchParams(root.location.search).get('mode');
  QP.mode = ['walkthrough', 'test'].includes(mode) ? mode : null;
  if (QP.mode === 'walkthrough') {
    // A still picture of each screen: no animation, nothing clickable, and focus or scrolling never leaves this frame
    // (a game focusing its first button would otherwise pull focus out of the editor the business is typing in).
    QP.reducedMotion = () => true;
    root.HTMLElement.prototype.focus = function () {};
    root.Element.prototype.scrollIntoView = function () {};
    ['click', 'pointerdown', 'keydown', 'submit'].forEach(t => root.addEventListener(t, e => { e.preventDefault(); e.stopPropagation(); }, true));
  }

  /* A session for the walkthrough with the first n questions already answered, so progress, maps and boards match the screen. */
  QP.previewSession = function (config, n) {
    const s = QP.createSession(config);
    config.questions.slice(0, n).forEach(q => { s.answers[q.id] = '…'; });
    return s;
  };

  /* Merges a game's default UI copy with optional config.ui overrides (for other languages). */
  // Interface text: English defaults, then the config's language (core/i18n.js), then any per-survey overrides.
  QP.copy = (defaults, config, type) => Object.assign({}, defaults, QP.i18n ? QP.i18n.strings(config, type) : {}, (config && config.ui) || {});
  QP.fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (_, k) => (values[k] !== undefined ? values[k] : ''));

  function choiceButtons(values, cls, onPick) {
    const el = QP.el;
    return values.map(v => el('button', {
      class: cls, 'aria-pressed': 'false', onclick: e => {
        e.currentTarget.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false'));
        e.currentTarget.setAttribute('aria-pressed', 'true'); onPick(v);
      }
    }, String(v)));
  }

  /* The answer control for one question. Same markup and behaviour in every game; each game styles it.
     ui: { submit, skip, textPlaceholder }. Returns { control, actions, submitButton }. */
  QP.questionForm = function (q, ui, onSubmit) {
    const el = QP.el;
    let pending = null;
    const submit = el('button', { class: 'primary', disabled: '', onclick: () => onSubmit(pending) }, ui.submit);
    const ready = v => { pending = v; submit.disabled = (v === null || v === ''); };
    let control;
    if (q.type === 'rating' || q.type === 'nps') {
      const range = q.type === 'nps' ? [...Array(11).keys()] : [...Array(q.scale).keys()].map(i => i + 1);
      control = el('div', {}, el('div', { class: 'scale', role: 'group', 'aria-label': q.prompt }, choiceButtons(range, '', ready)),
        el('div', { class: 'scale-labels' }, el('span', {}, q.labels[0]), el('span', {}, q.labels[1])));
    } else if (q.type === 'choice') {
      control = el('div', { class: 'opts', role: 'group', 'aria-label': q.prompt }, choiceButtons(q.options, 'opt', ready));
    } else {
      // Text questions can also be answered with a voice note (core/voice.js), which is easier than typing on a phone.
      const ta = el('textarea', { 'aria-label': q.prompt, placeholder: ui.textPlaceholder });
      const voice = QP.voiceRecorder ? QP.voiceRecorder(q, ta, ready) : null;
      ta.addEventListener('input', () => ready(voice ? voice.value() : ta.value.trim()));
      control = el('div', { class: 'qp-text' }, voice ? voice.element : '', ta);
    }
    const actions = el('div', { class: 'actions' }, submit);
    if (q.optional || q.type === 'text') actions.append(el('button', { class: 'ghost', onclick: () => onSubmit(null) }, ui.skip));
    // The walkthrough shows the answer controls as the respondent will see them, but nobody answers there.
    if (QP.mode === 'walkthrough') [control, ...control.querySelectorAll('button, textarea'), ...actions.children].forEach(b => { b.disabled = true; });
    return { control, actions, submitButton: submit };
  };

  /* Answer timing and the response record. Identical across games so analytics works for every type. */
  QP.createSession = function (config) {
    const s = { answers: {}, times: {}, voice: {}, startedAt: null, qStart: 0 };
    s.start = () => { s.startedAt = new Date().toISOString(); };
    s.begin = () => { s.qStart = performance.now(); };
    s.answer = (q, value) => {
      s.answers[q.id] = value;
      s.times[q.id] = Math.round(performance.now() - s.qStart);
      // The saved voice note behind a text answer, if there is one (core/voice.js).
      const note = QP.voiceNotes && QP.voiceNotes[q.id];
      if (note && typeof value === 'string') s.voice[q.id] = note; else delete s.voice[q.id];
    };
    s.has = id => Object.prototype.hasOwnProperty.call(s.answers, id);
    s.count = () => Object.keys(s.answers).length;
    s.reset = () => { s.answers = {}; s.times = {}; s.voice = {}; };
    s.record = () => ({
      caseId: config.id, startedAt: s.startedAt, completedAt: new Date().toISOString(),
      answers: s.answers, msPerQuestion: s.times, ...(Object.keys(s.voice).length && { voice: s.voice }),
      flags: { tooFast: Object.entries(s.times).filter(([, ms]) => ms < QP.TOO_FAST_MS).map(([id]) => id) }
    });
    return s;
  };

  /* "Back to QuestPulse" link for games opened from the app. opts: { parent, color } */
  QP.addBackLink = function (opts) {
    const parent = document.querySelector(opts.parent);
    if (!parent || document.querySelector('.qp-back')) return;
    const a = QP.el('a', { class: 'qp-back', href: '/' }, '← Back to QuestPulse');
    a.style.cssText = `display:inline-block;margin:0 0 10px;font-size:15px;line-height:1.4;color:${opts.color || 'inherit'};text-decoration:underline;text-underline-offset:3px;`;
    parent.prepend(a);
  };

  /* The end screen's list of every question with the answer given (or "Skipped"). */
  QP.answerSummary = (questions, answers, ui) => QP.el('ul', { class: 'summary' },
    questions.map(q => QP.el('li', {}, QP.el('small', {}, q.prompt), answers[q.id] === null ? ui.skipped : String(answers[q.id]))));
  /* A message and the list of problems behind it, for a game's showError. */
  QP.errorParts = (message, errors = []) => [QP.el('p', { class: 'prompt' }, message),
    errors.length ? QP.el('ul', { class: 'summary' }, errors.map(e => QP.el('li', {}, e))) : ''];

  /* Each game page registers itself; startGame validates before anything renders.
     game: { validate(config), start(config), preview(config, i) } where preview draws one screen for the builder's
     walkthrough: i = -1 the intro, 0..n-1 that question (answers disabled), n the ending. */
  QP.registerGame = function (type, game) { QP.games[type] = game; };

  root.startGame = function (type, config) {
    const game = QP.games[type];
    if (!game) {
      const errors = [`The ${type} game is not loaded on this page`];
      console.error('Game config rejected:', errors);
      return { ok: false, errors };
    }
    const errors = game.validate(config);
    if (errors.length) { console.error('Game config rejected:', errors); return { ok: false, errors }; }
    QP.activeGame = { type, config };
    if (QP.i18n) QP.i18n.apply(config);
    game.start(config);
    return { ok: true, errors: [] };
  };

  /* Called by every game when the respondent finishes. Pages can listen for the event; boot sets onComplete to save it. */
  QP.complete = function (record) {
    // Builder walkthroughs and test plays are never saved, counted or rewarded.
    if (QP.mode) return;
    const detail = { type: QP.activeGame && QP.activeGame.type, record };
    root.dispatchEvent(new CustomEvent('questpulse:complete', { detail }));
    if (typeof QP.onComplete === 'function') QP.onComplete(record, detail.type);
  };
})(window);
