// Plays a game start to finish and screenshots each stage at 390px and 1280px, light and dark.
// Usage: node tests/game-shots.mjs <rpg|quiz|platformer> [mobile|desktop] [light|dark]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [type = 'rpg', onlyVp, onlyTheme] = process.argv.slice(2);
const base = process.env.BASE || 'http://localhost:8080';
const outDir = path.join(root, 'tests/screens', type);
fs.mkdirSync(outDir, { recursive: true });

const viewports = { mobile: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } };

export async function answerCurrent(page, scope = 'body') {
  const s = page.locator(scope);
  if (await s.locator('.scale button').count()) await s.locator('.scale button').nth(3).click();
  else if (await s.locator('.opt').count()) await s.locator('.opt').first().click();
  else if (await s.locator('textarea').count()) await s.locator('textarea').fill('More evening opening hours, please.');
  await s.locator('.actions .primary').click();
}

const flows = {
  async rpg(page, shot) {
    await shot('1-intro');
    await page.getByRole('button', { name: 'Set out' }).click();
    await page.locator('#prompt').waitFor();
    await shot('2-question');
    await answerCurrent(page);
    await page.locator('.reward').waitFor();
    await shot('3-reward');
    const n = await page.evaluate(() => QP.activeGame.config.questions.length);
    for (let i = 1; i < n; i++) {
      await page.locator('.actions .primary').click();
      await page.locator('#prompt').waitFor();
      if (i === 4) await shot('4-midway');
      await answerCurrent(page);
      await page.locator('.reward').waitFor();
    }
    await page.locator('.actions .primary').click();
    await page.locator('.end').waitFor();
    await shot('5-end');
  }
};

flows.quiz = async (page, shot) => {
  await shot('1-intro');
  await page.getByRole('button', { name: 'Start the show' }).click();
  await shot('2-question');
  await answerCurrent(page);
  await page.waitForTimeout(500);
  await shot('3-reward');
  const n = await page.evaluate(() => QP.activeGame.config.questions.length);
  for (let i = 1; i < n; i++) {
    await page.locator('.card .primary').click();
    if (i === 4) await shot('4-text-round');
    await answerCurrent(page);
  }
  await page.locator('.card .primary').click();
  await page.waitForTimeout(900);
  await shot('5-finale');
};

flows.platformer = async (page, shot) => {
  await page.waitForTimeout(300);
  await shot('1-intro');
  await page.getByRole('button', { name: 'Start running' }).click();
  await page.waitForTimeout(200);
  await shot('2-level');
  // Really run and jump to the first checkpoint.
  await page.keyboard.down('ArrowRight');
  const t0 = Date.now();
  while (!(await page.locator('#prompt').isVisible()) && Date.now() - t0 < 20000) {
    await page.keyboard.down(' '); await page.waitForTimeout(260); await page.keyboard.up(' '); await page.waitForTimeout(240);
  }
  await page.keyboard.up('ArrowRight');
  await shot('3-question');
  await answerCurrent(page, '#panel');
  await shot('4-cheer');
  await page.locator('#panel .primary').click();
  const n = await page.evaluate(() => QP.activeGame.config.questions.length);
  for (let i = 1; i < n; i++) {
    await page.getByRole('button', { name: 'Skip the running' }).click();
    if (i === 5) await shot('5-nps');
    await answerCurrent(page, '#panel');
    await page.locator('#panel .primary').click();
  }
  await page.getByRole('button', { name: 'Skip the running' }).click();
  await page.waitForTimeout(1200);
  await shot('6-end');
};

const browser = await chromium.launch();
for (const [vpName, viewport] of Object.entries(viewports)) {
  if (onlyVp && onlyVp !== vpName) continue;
  for (const theme of ['light', 'dark']) {
    if (onlyTheme && onlyTheme !== theme) continue;
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${base}/games/${type}.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const shot = async name => {
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(outDir, `${vpName}-${theme}-${name}.png`), fullPage: true });
    };
    await flows[type](page, shot);
    console.log(`${vpName}/${theme}: done${errors.length ? ' with errors: ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
}
await browser.close();
