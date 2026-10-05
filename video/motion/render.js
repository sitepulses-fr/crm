const { chromium } = require('playwright');
const fs = require('fs');
const [w, nw, total] = process.argv.slice(2).map(Number);
(async () => {
  const have = new Set(fs.readdirSync(__dirname + '/frames'));
  const todo = [];
  for (let f = 0; f < total; f++) if (!have.has(`f${String(f).padStart(5, '0')}.jpg`)) todo.push(f);
  const mine = todo.filter((_, i) => i % nw === w);
  console.log('worker', w, 'frames', mine.length);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 4 / 3 });
  await p.goto('http://localhost:8791/motion/index.html?n=5');
  await p.waitForFunction(() => window.sceneReady, null, { timeout: 180000 });
  for (const f of mine) {
    await p.evaluate(t => window.renderAt(t), f / 30);
    const out = `${__dirname}/frames/f${String(f).padStart(5, '0')}.jpg`;
    await p.screenshot({ path: out + '.tmp', type: 'jpeg', quality: 95, timeout: 0 });
    fs.renameSync(out + '.tmp', out);
  }
  await b.close();
  console.log('done', w);
})();
