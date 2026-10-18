// Screenshots the detective game (intro / question / clue / case-closed) at 390px and 1280px
// in light and dark mode, then pixel-compares a candidate against the reference.
// Usage: node tests/detective-visual.mjs [candidateUrl]
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const referenceUrl = pathToFileURL(path.join(root, 'reference/detective-survey.html')).href;
const candidateUrl = process.argv[2] || 'http://localhost:8080/games/detective.html';
const outDir = path.join(root, 'tests/screens/detective');

const viewports = { mobile: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } };
const themes = ['light', 'dark'];

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(['16px "Alfa Slab One"', '16px "Courier Prime"', 'italic 16px "Courier Prime"', 'bold 16px "Courier Prime"']
      .map(f => document.fonts.load(f)));
  });
  await page.waitForTimeout(150);
}

async function shoot(page, file) {
  // The app's "Back to QuestPulse" link is a deliberate addition; everything else must match the reference.
  await page.addStyleTag({ content: '.qp-back{display:none !important}' });
  await settle(page);
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
}

const btn = (page, name) => page.getByRole('button', { name, exact: true });

async function capture(url, label) {
  const browser = await chromium.launch();
  const files = [];
  for (const [vpName, viewport] of Object.entries(viewports)) {
    for (const theme of themes) {
      const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: theme });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      const dir = path.join(outDir, label);
      fs.mkdirSync(dir, { recursive: true });
      const f = name => { const p = path.join(dir, `${vpName}-${theme}-${name}.png`); files.push(p); return p; };

      await shoot(page, f('1-intro'));
      await btn(page, 'Open the case').click();
      await shoot(page, f('2-question'));
      await btn(page, '4').click();
      await btn(page, 'Log answer').click();
      await shoot(page, f('3-clue'));
      await btn(page, 'Next witness').click();
      await btn(page, 'Most days').click();
      await btn(page, 'Log answer').click();
      await btn(page, 'Next witness').click();
      await btn(page, 'Sometimes').click();
      await btn(page, 'Log answer').click();
      await btn(page, 'Next witness').click();
      await btn(page, 'Communication').click();
      await btn(page, 'Log answer').click();
      await btn(page, 'Next witness').click();
      await btn(page, 'Skip this one').click();
      await btn(page, 'Next witness').click();
      await btn(page, '8').click();
      await btn(page, 'Log answer').click();
      await btn(page, 'Solve the case').click();
      await shoot(page, f('4-closed'));
      if (errors.length) console.log(`  ${label} ${vpName}/${theme} page errors:`, errors);
      await ctx.close();
    }
  }
  await browser.close();
  return files;
}

function compare(a, b, diffPath) {
  const imgA = PNG.sync.read(fs.readFileSync(a));
  const imgB = PNG.sync.read(fs.readFileSync(b));
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    return { diff: Infinity, note: `size ${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}` };
  }
  const diff = new PNG({ width: imgA.width, height: imgA.height });
  const n = pixelmatch(imgA.data, imgB.data, diff.data, imgA.width, imgA.height, { threshold: 0 });
  if (n) fs.writeFileSync(diffPath, PNG.sync.write(diff));
  return { diff: n };
}

const ref = await capture(referenceUrl, 'reference');
const cand = await capture(candidateUrl, 'candidate');
fs.mkdirSync(path.join(outDir, 'diff'), { recursive: true });
let failures = 0;
ref.forEach((r, i) => {
  const name = path.basename(r);
  const { diff, note } = compare(r, cand[i], path.join(outDir, 'diff', name));
  if (diff) failures++;
  console.log(`${diff ? 'DIFF' : 'same'}  ${name}${diff ? `  (${note || diff + ' px'})` : ''}`);
});
console.log(failures ? `\n${failures} of ${ref.length} screenshots differ` : `\nAll ${ref.length} screenshots are pixel-identical`);
process.exit(failures ? 1 : 0);
