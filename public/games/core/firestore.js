/* Firestore over REST (no SDK, keeps each game small) and the page boot logic shared by all games.
   Survey doc:   surveys/{surveyId}            { type: "detective", config: {...} }  (or configJson: "<json>")
   Response doc: surveys/{surveyId}/responses   { ...response record, surveyId, gameType, submittedAt } */
(function (root) {
  const QP = root.QP = root.QP || {};

  function encode(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
    return { mapValue: { fields: encodeFields(v) } };
  }
  function encodeFields(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = encode(v);
    return out;
  }
  function decode(v) {
    if ('nullValue' in v) return null;
    if ('booleanValue' in v) return v.booleanValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('stringValue' in v) return v.stringValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
    if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
    return null;
  }
  function decodeFields(fields) {
    const out = {};
    for (const [k, v] of Object.entries(fields)) out[k] = decode(v);
    return out;
  }

  const settings = () => root.QP_FIREBASE || {};
  const base = () => `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(settings().projectId)}/databases/(default)/documents`;
  const key = () => `key=${encodeURIComponent(settings().apiKey)}`;

  QP.firestore = {
    encode, decode, encodeFields, decodeFields,
    configured: () => Boolean(settings().projectId && settings().apiKey),
    async loadSurvey(surveyId) {
      const res = await fetch(`${base()}/surveys/${encodeURIComponent(surveyId)}?${key()}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'Survey not found' : `Firestore returned HTTP ${res.status}`);
      const doc = decodeFields((await res.json()).fields || {});
      const config = doc.config || (doc.configJson ? JSON.parse(doc.configJson) : null);
      if (!config) throw new Error('Survey has no game config');
      return { type: doc.type, config };
    },
    async saveResponse(surveyId, gameType, record) {
      const body = { fields: encodeFields(Object.assign({}, record, { surveyId, gameType, submittedAt: new Date().toISOString() })) };
      const res = await fetch(`${base()}/surveys/${encodeURIComponent(surveyId)}/responses?${key()}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`Firestore returned HTTP ${res.status}`);
      return res.json();
    }
  };

  async function saveWithRetry(surveyId, type, record) {
    try { await QP.firestore.saveResponse(surveyId, type, record); }
    catch (e) {
      await new Promise(r => setTimeout(r, 1500));
      try { await QP.firestore.saveResponse(surveyId, type, record); }
      catch (e2) { console.error('Could not save the response record:', e2.message); }
    }
  }

  /* The game editor (index.html) loads this page in an iframe with ?mode=walkthrough or ?mode=test and sends the draft
     config by postMessage, so nothing is stored and the editor keeps its state. Messages from anyone else are ignored.
     Walkthrough: every { type: 'qp:config', config, screen } redraws screen (0 intro, 1..n questions, n+1 ending).
     Test: the first config starts a normal, playable game; QP.complete never saves or rewards in either mode. */
  function builderMode(type, opts, run) {
    const origin = root.location.origin, game = QP.games[type];
    let started = false, lastScreen = null;
    root.addEventListener('message', e => {
      if (e.source !== root.parent || e.origin !== origin || !e.data || e.data.type !== 'qp:config' || !e.data.config) return;
      const { config, screen } = e.data;
      if (QP.mode === 'test') {
        if (!started) { started = true; run(config); }
        return;
      }
      if (!game || !game.preview) return opts.showError('This game cannot be previewed yet.');
      QP.activeGame = { type, config };
      if (QP.i18n) QP.i18n.apply(config);
      const n = Array.isArray(config.questions) ? config.questions.length : 0;
      const at = Math.max(0, Math.min(n + 1, Number(screen) || 0));
      // A half-typed draft can fail to draw; the previous picture stays until the next edit.
      try { game.preview(config, at - 1); }
      catch (error) { console.warn('Preview could not draw this screen:', error.message); }
      if (at !== lastScreen) { lastScreen = at; scrollToScreen(); if (game.previewScroll) game.previewScroll(at - 1, n); }
      root.parent.postMessage({ type: 'qp:shown', screen: at }, origin);
    });
    root.parent.postMessage({ type: 'qp:ready', mode: QP.mode, gameType: type }, origin);
  }
  // A new screen starts at the top, scrolled just far enough to show its question (#prompt) when there is one.
  function scrollToScreen() {
    root.scrollTo(0, 0);
    const prompt = document.getElementById('prompt'), box = prompt && prompt.getBoundingClientRect();
    if (box && box.bottom + 160 > root.innerHeight) root.scrollTo(0, box.bottom + 160 - root.innerHeight);
  }

  /* ?s=CODE loads a published survey from this app's server, ?survey=ID from Firestore, otherwise a sample runs.
     opts: { sample, showError(message, errors) } */
  QP.boot = async function (type, opts) {
    const params = new URLSearchParams(root.location.search);
    const surveyId = params.get('survey');
    const run = config => {
      const result = root.startGame(type, config);
      if (!result.ok) opts.showError('This game could not start because its setup has problems.', result.errors);
      return result;
    };

    if (QP.mode) return builderMode(type, opts, run);

    const shortCode = params.get('s');
    if (!surveyId && !shortCode && opts.back) QP.addBackLink(opts.back);

    // ?s=<code>: a survey published from the dashboard (short link /s/<code>), stored on this app's server.
    if (shortCode) {
      let doc;
      try {
        const res = await fetch(`/api/surveys/${encodeURIComponent(shortCode)}`);
        if (!res.ok) throw new Error(res.status === 404 ? 'Survey not found' : `Server returned HTTP ${res.status}`);
        doc = await res.json();
      } catch (e) { return opts.showError('We could not load this survey. Please check the link and try again.', [e.message]); }
      if (doc.type !== type) { root.location.replace(`${doc.type}.html${root.location.search}`); return; }
      QP.onComplete = record => QP.submitResponse(shortCode, record, opts.reward, doc.config, doc.playToken);
      QP.voiceUpload = { code: shortCode, playToken: doc.playToken };
      return run(doc.config);
    }

    if (surveyId) {
      if (!QP.firestore.configured()) return opts.showError('This survey link is not connected to a database yet.');
      let doc;
      try { doc = await QP.firestore.loadSurvey(surveyId); }
      catch (e) { return opts.showError('We could not load this survey. Please check the link and try again.', [e.message]); }
      if (doc.type && doc.type !== type) {
        if (!(QP.GAME_TYPES || []).includes(doc.type)) return opts.showError('This survey uses an unknown game type.', [String(doc.type)]);
        root.location.replace(`${doc.type}.html${root.location.search}`);
        return;
      }
      QP.onComplete = record => saveWithRetry(surveyId, type, record);
      return run(doc.config);
    }


    // ?sample=<setting> plays that business setting's sample, loaded only when asked for so respondents never download it.
    const setting = params.get('sample');
    if (setting && (QP.SETTINGS || []).includes(setting) && !QP.samples[setting]) {
      await new Promise(done => {
        const tag = document.createElement('script');
        tag.src = `samples/${setting === 'bakery' ? 'bakery' : 'settings'}.js`;
        tag.onload = tag.onerror = done;
        document.head.append(tag);
      });
    }
    const set = QP.samples[setting];
    // Samples are hand-written; each setting's four games get four different main characters (QP.castMainCharacter).
    const sample = JSON.parse(JSON.stringify((set && set[type]) || opts.sample));
    if (QP.castMainCharacter) QP.castMainCharacter(type, sample, set ? setting : 'default');
    return run(sample);
  };
})(window);
