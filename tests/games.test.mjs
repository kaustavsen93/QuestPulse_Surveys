// End-to-end checks for the four survey games. Requires the dev server on :8080.
// Usage: node tests/games.test.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASE = process.env.BASE || 'http://localhost:8080';
const TYPES = ['detective', 'rpg', 'quiz', 'platformer'];
const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); }
};

const browser = await chromium.launch();
const newPage = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.addInitScript(() => { window.__records = []; addEventListener('questpulse:complete', e => window.__records.push(e.detail)); });
  return page;
};
const open = async (page, type, query = '') => {
  await page.goto(`${BASE}/games/${type}.html${query}`, { waitUntil: 'networkidle' });
};

/* Keyboard helpers: reach a control with Tab only, then activate it. */
async function tabTo(page, selector, max = 80) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate(sel => { const a = document.activeElement; return !!a && a.matches(sel); }, selector)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Could not reach ${selector} with Tab`);
}
async function answerWithKeyboard(page, scope, { slow = false } = {}) {
  const has = sel => page.locator(`${scope} ${sel}`).count();
  if (await has('.scale button')) { await tabTo(page, `${scope} .scale button:nth-child(4)`); await page.keyboard.press('Space'); }
  else if (await has('.opt')) { await tabTo(page, `${scope} .opt`); await page.keyboard.press('Space'); }
  else if (await has('textarea')) { await tabTo(page, `${scope} .actions .ghost`); if (slow) await page.waitForTimeout(1600); await page.keyboard.press('Enter'); return; }
  if (slow) await page.waitForTimeout(1600);
  await tabTo(page, `${scope} .actions .primary:not([disabled])`);
  await page.keyboard.press('Enter');
}

/* Plays a whole game with the keyboard only. q2 is answered slowly, everything else fast. */
const keyboardFlows = {
  async detective(page, n) {
    await tabTo(page, '#stage .primary'); await page.keyboard.press('Enter');
    for (let i = 0; i < n; i++) {
      await page.locator('#prompt').waitFor();
      await answerWithKeyboard(page, '#stage', { slow: i === 1 });
      await page.locator('.evidence').waitFor();
      await tabTo(page, '#stage .actions .primary'); await page.keyboard.press('Enter');
    }
  },
  async rpg(page, n) {
    await tabTo(page, '#stage .primary'); await page.keyboard.press('Enter');
    for (let i = 0; i < n; i++) {
      await page.locator('#prompt').waitFor();
      await answerWithKeyboard(page, '#stage', { slow: i === 1 });
      await page.locator('.reward').waitFor();
      await tabTo(page, '#stage .actions .primary'); await page.keyboard.press('Enter');
    }
    await page.locator('.end').waitFor();
  },
  async quiz(page, n) {
    await tabTo(page, '#stage .primary'); await page.keyboard.press('Enter');
    for (let i = 0; i < n; i++) {
      await page.locator('#prompt').waitFor();
      await answerWithKeyboard(page, '#stage', { slow: i === 1 });
      await page.locator('.points').waitFor();
      await tabTo(page, '#stage .card .primary'); await page.keyboard.press('Enter');
    }
  },
  async platformer(page, n) {
    await tabTo(page, '#panel .primary'); await page.keyboard.press('Enter');
    // Run right and jump just before each gap edge, like a player would.
    await page.keyboard.down('ArrowRight');
    const t0 = Date.now();
    while (!(await page.locator('#prompt').isVisible()) && Date.now() - t0 < 25000) {
      const s = await page.evaluate(() => QP.inspect());
      if (s.onGround && s.edgeAhead !== null && s.edgeAhead < 26) {
        await page.keyboard.down(' '); await page.waitForTimeout(300); await page.keyboard.up(' ');
      } else await page.waitForTimeout(16);
    }
    await page.keyboard.up('ArrowRight');
    for (let i = 0; i < n; i++) {
      if (i > 0) { await tabTo(page, '#skipRun'); await page.keyboard.press('Enter'); }
      await page.locator('#prompt').waitFor();
      await answerWithKeyboard(page, '#panel', { slow: i === 1 });
      await page.locator('#panel .cheer').waitFor();
      await tabTo(page, '#panel .actions .primary'); await page.keyboard.press('Enter');
    }
    await tabTo(page, '#skipRun'); await page.keyboard.press('Enter');
    await page.locator('#after h2').waitFor();
  }
};

/* Accessibility: axe-core WCAG 2 A/AA audit on each screen, light and dark. */
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const axeReport = [];
async function audit(page, label) {
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations
    .map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length, sample: v.nodes[0].target.join(' '), detail: (v.nodes[0].any[0] || v.nodes[0].all[0] || {}).message || '' })));
  res.forEach(v => axeReport.push({ screen: label, ...v }));
}

for (const type of TYPES) {
  const page = await newPage();
  await open(page, type);
  const sample = await page.evaluate(t => QP.samples[t], type);

  await check(`${type}: startGame returns {ok, errors} and rejects bad configs`, async () => {
    const r = await page.evaluate(t => {
      const s = QP.samples[t];
      const bad = startGame(t, { title: 'Broken' });
      const wrongType = startGame(t === 'quiz' ? 'rpg' : 'quiz', s);
      const good = startGame(t, s);
      return { bad, wrongType, good };
    }, type);
    assert.equal(r.bad.ok, false); assert.ok(r.bad.errors.length > 3, 'expected a list of errors');
    assert.equal(r.wrongType.ok, false); assert.match(r.wrongType.errors[0], /not loaded/);
    assert.deepEqual(r.good, { ok: true, errors: [] });
  });

  if (type === 'detective') {
    await check('detective: startCase and validateCase keep working, including the original CASE shape', async () => {
      const r = await page.evaluate(() => {
        const s = QP.samples.detective;
        const legacy = { ...s, caseId: s.id, solution: s.ending }; delete legacy.id; delete legacy.ending;
        return { legacy: startCase(legacy), errs: validateCase({}), judged: validateCase({ ...s, ending: 'Great choice, well done!' }), reset: startCase(s) };
      });
      assert.deepEqual(r.legacy, { ok: true, errors: [] });
      assert.ok(Array.isArray(r.errs) && r.errs.length > 0);
      assert.ok(r.judged.some(e => /judges the answer/.test(e)), 'story text that praises answers is rejected');
      assert.deepEqual(r.reset, { ok: true, errors: [] });
    });
  }

  await check(`${type}: playable with the keyboard only, and produces the shared response record`, async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await keyboardFlows[type](page, sample.questions.length);
    await page.waitForFunction(() => window.__records.length > 0, null, { timeout: 5000 });
    const { record, type: reported } = await page.evaluate(() => window.__records[0]);
    assert.equal(reported, type);
    assert.deepEqual(Object.keys(record), ['caseId', 'startedAt', 'completedAt', 'answers', 'msPerQuestion', 'flags']);
    assert.deepEqual(Object.keys(record.flags), ['tooFast']);
    assert.equal(record.caseId, sample.id);
    assert.deepEqual(Object.keys(record.answers), sample.questions.map(q => q.id));
    assert.deepEqual(Object.keys(record.msPerQuestion), sample.questions.map(q => q.id));
    sample.questions.filter(q => q.type === 'text').forEach(q => assert.equal(record.answers[q.id], null, 'skipped text answers are null'));
    assert.ok(record.flags.tooFast.includes('q1'), 'fast answer is flagged');
    assert.ok(!record.flags.tooFast.includes('q2'), 'slow answer is not flagged');
    assert.ok(record.msPerQuestion.q2 >= 1500);
    assert.ok(Date.parse(record.completedAt) >= Date.parse(record.startedAt));
    assert.deepEqual(page.errors, []);
    await audit(page, `${type}/light/end`);
  });
  await page.context().close();
}

await check('platformer: falling respawns instantly at the last checkpoint, no game over', async () => {
  const page = await newPage();
  await open(page, 'platformer');
  await page.getByRole('button', { name: 'Start running' }).click();
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => /Back at the last checkpoint/.test(document.getElementById('announce').textContent), null, { timeout: 8000 });
  await page.keyboard.up('ArrowRight');
  const s = await page.evaluate(() => QP.inspect());
  assert.equal(s.state, 'run');
  assert.ok(s.x < 200, `runner is back near the start (x=${Math.round(s.x)})`);
  await page.context().close();
});

await check('platformer: the game pauses while a question is open, and touch buttons move the runner', async () => {
  const page = await newPage();
  await open(page, 'platformer');
  await page.getByRole('button', { name: 'Start running' }).click();
  const before = await page.evaluate(() => QP.inspect().x);
  const right = page.locator('.ctl[data-key="right"]');
  const box = await right.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(400); await page.mouse.up();
  const moved = await page.evaluate(() => QP.inspect().x);
  assert.ok(moved > before + 30, `touch button moved the runner (${Math.round(before)} → ${Math.round(moved)})`);
  await page.getByRole('button', { name: 'Skip the running' }).click();
  await page.locator('#prompt').waitFor();
  const paused = await page.evaluate(() => QP.inspect());
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.up('ArrowRight');
  const still = await page.evaluate(() => QP.inspect());
  assert.equal(paused.state, 'question');
  assert.equal(still.x, paused.x, 'runner does not move while answering');
  assert.equal(await page.locator('#skipRun').isDisabled(), true, 'skip is disabled while a question is open');
  await page.context().close();
});

await check('reduced motion: no confetti, and the RPG traveller moves instantly', async () => {
  const page = await newPage({ reducedMotion: 'reduce' });
  await open(page, 'rpg');
  await page.getByRole('button', { name: 'Set out' }).click();
  await page.locator('#prompt').waitFor({ timeout: 300 });
  await open(page, 'quiz');
  await page.getByRole('button', { name: 'Start the show' }).click();
  const n = await page.evaluate(() => QP.activeGame.config.questions.length);
  for (let i = 0; i < n; i++) {
    const s = page.locator('#stage');
    if (await s.locator('.scale button').count()) await s.locator('.scale button').first().click();
    else if (await s.locator('.opt').count()) await s.locator('.opt').first().click();
    else { await s.locator('.ghost').click(); await page.locator('.points').waitFor(); await s.locator('.card .primary').click(); continue; }
    await s.locator('.card .actions .primary').click();
    await s.locator('.card .primary').click();
  }
  await page.locator('.finale').waitFor();
  assert.equal(await page.locator('.confetti').count(), 0);
  await page.context().close();
});

/* Firestore: mocked REST endpoints. */
function encode(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)])) } };
}
function decode(v) {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]));
}

await check('firestore: loads a survey by ID, redirects to the right game, and writes the response record', async () => {
  const page = await newPage();
  await page.addInitScript(() => { window.QP_FIREBASE = { projectId: 'demo-project', apiKey: 'test-key' }; });
  await open(page, 'quiz');
  const sample = await page.evaluate(() => QP.samples.quiz);
  const posted = [];
  await page.context().route('https://firestore.googleapis.com/**', async route => {
    const req = route.request(), url = req.url();
    if (req.method() === 'GET' && url.includes('/surveys/sv-quiz-1?')) {
      return route.fulfill({ json: { name: 'x', fields: { type: encode('quiz'), config: encode({ ...sample, id: 'sv-quiz-1-config' }) } } });
    }
    if (req.method() === 'GET') return route.fulfill({ status: 404, json: { error: { message: 'not found' } } });
    if (req.method() === 'POST' && url.includes('/surveys/sv-quiz-1/responses?key=test-key')) {
      posted.push(JSON.parse(req.postData()));
      return route.fulfill({ json: { name: 'projects/demo-project/databases/(default)/documents/surveys/sv-quiz-1/responses/abc' } });
    }
    return route.abort();
  });
  await page.goto(`${BASE}/games/detective.html?survey=sv-quiz-1`, { waitUntil: 'networkidle' });
  assert.match(page.url(), /quiz\.html\?survey=sv-quiz-1$/, 'detective page redirects to the quiz page');
  await page.locator('#showName').filter({ hasText: sample.show.name }).waitFor();
  await page.getByRole('button', { name: 'Start the show' }).click();
  for (let i = 0; i < sample.questions.length; i++) {
    const s = page.locator('#stage');
    if (await s.locator('.scale button').count()) { await s.locator('.scale button').nth(2).click(); await s.locator('.card .actions .primary').click(); }
    else if (await s.locator('.opt').count()) { await s.locator('.opt').nth(1).click(); await s.locator('.card .actions .primary').click(); }
    else { await s.locator('textarea').fill('Bring back the late sessions.'); await s.locator('.card .actions .primary').click(); }
    await s.locator('.card .primary').click();
  }
  await page.waitForFunction(() => window.__records.length > 0);
  await page.waitForTimeout(500);
  assert.equal(posted.length, 1, 'one response document written');
  const doc = decode({ mapValue: { fields: posted[0].fields } });
  assert.equal(doc.surveyId, 'sv-quiz-1');
  assert.equal(doc.gameType, 'quiz');
  assert.equal(doc.caseId, 'sv-quiz-1-config');
  assert.equal(doc.answers.q5, 'Bring back the late sessions.');
  assert.ok(Array.isArray(doc.flags.tooFast));
  assert.ok(doc.submittedAt && doc.startedAt && doc.completedAt);

  await page.goto(`${BASE}/games/rpg.html?survey=missing-id`, { waitUntil: 'networkidle' });
  assert.match(await page.locator('#stage').innerText(), /could not load this survey/i);
  await page.context().close();
});

await check('firestore: a survey link without Firebase settings shows a clear message', async () => {
  const page = await newPage();
  await open(page, 'platformer', '?survey=abc');
  assert.match(await page.locator('#panel').innerText(), /not connected to a database/i);
  await page.context().close();
});




/* Business settings: each setting's sample dresses every game for that business and stays fully playable. */
const SETTINGS = require('../public/games/core/validators.js').SETTINGS.filter(s => s !== 'none');
for (const setting of SETTINGS) for (const type of TYPES) {
  await check(`${type}: ${setting} setting draws its scenery and job portraits, and plays through`, async () => {
    const page = await newPage();
    await open(page, type, `?sample=${setting}`);
    const sample = await page.evaluate(([s, t]) => QP.samples[s][t], [setting, type]);
    assert.equal(sample.setting, setting);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.setting), setting);
    if (type === 'detective' || type === 'quiz') assert.equal(await page.locator('.scene-banner svg[role="img"]').count(), 1, 'one scene banner');
    if (type === 'rpg') assert.equal(await page.locator('#mapBox svg.pal-setting').count(), 1, 'map drawn as the premises');
    if (type === 'detective' || type === 'rpg') {
      await page.locator('#stage .primary').click();
      await page.locator('#prompt').waitFor();
      assert.equal(await page.locator('#stage .portrait svg').count(), 1, 'supporting character shown in their outfit');
      await page.reload({ waitUntil: 'networkidle' });
    }
    await keyboardFlows[type](page, sample.questions.length);
    await page.waitForFunction(() => window.__records.length > 0, null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => window.__records[0].record.caseId), sample.id);
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });
}

/* Published surveys: accounts, short links, responses, coupons and owner-only analytics, straight against the API. */
await check('server: publish needs a login; short link opens the game; coupons are unique, owner-only and redeem once', async () => {
  const call = async (path, { token, ...opts } = {}) => {
    const res = await fetch(BASE + path, { redirect: 'manual', ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } });
    return { status: res.status, location: res.headers.get('location'), body: await res.json().catch(() => null) };
  };
  const signup = async who => (await call('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name: who, email: `${who}-${Date.now()}@questpulse.test`, password: 'test-only-' + Date.now() }) })).body.token;
  const owner = await signup('owner'), stranger = await signup('stranger');
  const sample = require(path.join(root, 'tests/fixtures/quiz-sample.json'));
  const body = JSON.stringify({ type: 'quiz', config: sample, reward: { title: '10% off', prefix: 'TEST' } });
  assert.equal((await call('/api/surveys', { method: 'POST', body })).status, 401, 'anonymous publish refused');
  const pub = await call('/api/surveys', { method: 'POST', body, token: owner });
  assert.equal(pub.status, 201); assert.match(pub.body.code, /^[A-Za-z2-9]{6}$/);
  const go = await call(`/s/${pub.body.code}`);
  assert.equal(go.status, 302); assert.equal(go.location, `/games/quiz.html?s=${pub.body.code}`);
  assert.equal((await call('/s/nope00')).location, '/?missing=1');
  const record = { caseId: sample.id, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), answers: { q1: sample.questions[0].type === 'choice' ? sample.questions[0].options[0] : 3 }, msPerQuestion: {}, flags: { tooFast: [] } };
  const play = async () => (await call(`/api/surveys/${pub.body.code}`)).body.playToken;
  const submit = (playToken, rec = record) => call(`/api/surveys/${pub.body.code}/responses`, { method: 'POST', body: JSON.stringify({ record: rec, playToken }) });
  assert.equal((await submit(undefined)).status, 403, 'answers need a play token');
  assert.equal((await submit('forged.token')).status, 403, 'forged play token refused');
  const rushed = await submit(await play());
  assert.equal(rushed.status, 201, 'rushed answers are still saved');
  assert.equal(rushed.body.coupon, null); assert.equal(rushed.body.couponWithheld, 'too-fast');
  const [t1, t2] = [await play(), await play()];
  await new Promise(done => setTimeout(done, sample.questions.length * 1000 + 200));
  const r1 = await submit(t1), r2 = await submit(t2);
  assert.match(r1.body.coupon.code, /^TEST-[A-Z2-9]{5}$/); assert.notEqual(r1.body.coupon.code, r2.body.coupon.code);
  const replay = await submit(t1);
  assert.equal(replay.status, 200); assert.equal(replay.body.coupon.code, r1.body.coupon.code, 'a replayed token returns its first coupon');
  assert.equal((await submit(await play(), { answers: { nope: 1 } })).status, 400, 'mismatched answers refused');
  assert.equal((await call(`/api/surveys/${pub.body.code}/analytics`, { token: stranger })).status, 404, 'other accounts cannot see analytics');
  assert.equal((await call(`/api/surveys/${pub.body.code}/analytics`, { token: owner })).body.responses.length, 3);
  const redeem = token => call('/api/coupons/redeem', { method: 'POST', token, body: JSON.stringify({ code: r1.body.coupon.code.toLowerCase() }) });
  assert.equal((await redeem(stranger)).status, 404, 'only the issuing company can redeem');
  assert.equal((await redeem(owner)).body.status, 'redeemed');
  assert.equal((await redeem(owner)).body.status, 'already-used');
  const list = (await call('/api/surveys', { token: owner })).body.surveys;
  assert.equal(list[0].responses, 3); assert.equal(list[0].redeemed, 1);
  await call('/api/auth/logout', { method: 'POST', token: owner });
  assert.equal((await call('/api/surveys', { token: owner })).status, 401, 'logging out ends the session on the server');
});

/* Hindi: config.lang switches the interface text, page language and fonts; English configs are unchanged. */
await check('all games: lang "hi" shows Hindi buttons and sets the page language', async () => {
  const want = { detective: 'केस खोलें', rpg: 'सफ़र शुरू करें', quiz: 'शो शुरू करें', platformer: 'दौड़ शुरू करें' };
  for (const type of TYPES) {
    const page = await newPage();
    await open(page, type);
    await page.evaluate(t => startGame(t, Object.assign({}, QP.samples[t], { lang: 'hi' })), type);
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'hi', type);
    assert.equal((await page.locator(type === 'platformer' ? '#panel .primary' : '#stage .primary').innerText()).trim(), want[type], type);
    assert.equal(await page.locator('.qp-back').innerText(), '← QuestPulse पर वापस');
    await page.evaluate(t => startGame(t, QP.samples[t]), type);
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en', type + ' back to English');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  }
});

for (const theme of ['light', 'dark']) {
  for (const type of TYPES) for (const query of ['', ...SETTINGS.map(s => `?sample=${s}`)]) {
    const page = await newPage({ colorScheme: theme });
    await open(page, type, query);
    await page.waitForTimeout(300);
    const label = `${type}${query ? '/' + query.split('=')[1] : ''}/${theme}`;
    await audit(page, `${label}/intro`);
    if (type === 'detective') { await page.getByRole('button', { name: 'Open the case' }).click(); }
    if (type === 'rpg') { await page.getByRole('button', { name: 'Set out' }).click(); await page.locator('#prompt').waitFor(); }
    if (type === 'quiz') { await page.getByRole('button', { name: 'Start the show' }).click(); }
    if (type === 'platformer') { await page.getByRole('button', { name: 'Start running' }).click(); await page.getByRole('button', { name: 'Skip the running' }).click(); }
    await page.locator('#prompt').waitFor();
    await audit(page, `${label}/question`);
    const scope = type === 'platformer' ? '#panel' : '#stage';
    const s = page.locator(scope);
    if (await s.locator('.scale button').count()) await s.locator('.scale button').first().click(); else await s.locator('.opt').first().click();
    await s.locator('.actions .primary').click();
    await page.waitForTimeout(400);
    await audit(page, `${label}/reward`);
    await page.context().close();
  }
}

/* Size budget: page + its scripts + shared core, excluding web fonts. */
const sizes = TYPES.map(type => {
  const files = [`${type}.html`, `${type}.js`, `samples/${type}.js`, 'core/qp.js', 'core/i18n.js', 'core/validators.js', 'core/firestore.js', 'core/firebase-config.js', 'core/scenes.js', 'core/scenes.css', 'core/banners.js'];
  const bytes = files.reduce((n, f) => n + fs.statSync(path.join(root, 'public/games', f)).size, 0);
  return [type, (bytes / 1024).toFixed(1)];
});

await browser.close();

console.log('\nFUNCTIONAL CHECKS');
results.forEach(([s, name, why]) => console.log(`${s}  ${name}${why ? `\n      ${why}` : ''}`));
console.log('\nACCESSIBILITY (axe-core, WCAG 2.1 A/AA)');
if (!axeReport.length) console.log('No violations on any screen.');
axeReport.forEach(v => console.log(`${v.screen}: ${v.id} (${v.impact}) x${v.count} e.g. ${v.sample} — ${v.detail}`));
console.log('\nSIZE (KB, excluding fonts)');
sizes.forEach(([t, kb]) => console.log(`${t.padEnd(11)} ${kb} KB`));
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} check(s) failed` : `\nAll ${results.length} functional checks passed`);
process.exit(failed ? 1 : 0);
