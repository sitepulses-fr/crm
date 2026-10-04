const { chromium } = require('playwright');
const [w, nw, from, to] = process.argv.slice(2).map(Number);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('http://localhost:8790/scene.html');
  await p.waitForFunction(() => window.sceneReady, null, { timeout: 60000 });
  const FPS = 30;
  for (let f = from + w; f < to; f += nw) {
    await p.evaluate(t => window.renderAt(t), f / FPS);
    await p.screenshot({ path: `frames/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 93 });
    if (f % 60 === w) console.log('frame', f, new Date().toISOString());
  }
  await b.close();
  console.log('done worker', w);
})();
