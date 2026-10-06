import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
mkdirSync(process.env.OUT || 'frames', { recursive: true });
const [from, to] = process.argv.slice(2).map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:1920,height:1080} });
p.on('pageerror', e => console.log('PAGEERR', e.message));
await p.goto('http://localhost:8123/' + (process.env.PAGE || 'index.html'));
await p.waitForFunction(() => window.__ready, null, {timeout:120000});
const N = Math.round(await p.evaluate(()=>window.TOTAL*window.FPS));
const end = Math.min(to, N);
const t0 = Date.now();
for (let f = from; f < end; f++) {
  await p.evaluate(f => window.renderFrame(f), f);
  await p.screenshot({ path: `${process.env.OUT || 'frames'}/f${String(f).padStart(5,'0')}.jpg`, type:'jpeg', quality: 94 });
  if (f % 50 === 0) console.log(`frame ${f}/${end} ${((Date.now()-t0)/1000/(f-from+1)).toFixed(2)}s/f`);
}
console.log('DONE', from, end);
await b.close();
