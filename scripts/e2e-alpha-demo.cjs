// Demo E2E: render 1 overlay transparan → WebM → MOV ProRes 4444 + CSV.
// Browser Edge asli membuka build produksi (dist/) — jalur yang sama dipakai exe.
// Jalankan: npm run demo:alpha
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const OUT = 'C:/Users/yoyok/AppData/Local/Temp/opencode/demo';
const PORT = 4173;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FF = require('ffmpeg-static');

function waitPort(port, tries = 60) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = () => {
      const s = net.connect(port, '127.0.0.1', () => { s.end(); resolve(); });
      s.on('error', () => {
        if (++n > tries) reject(new Error('preview server tidak muncul'));
        else setTimeout(tick, 500);
      });
    };
    tick();
  });
}

function ff(args) {
  return new Promise((resolve, reject) => {
    execFile(FF, args, { timeout: 300000 }, (err, _o, stderr) => {
      if (err) reject(new Error('ffmpeg gagal: ' + String(stderr).slice(-1500)));
      else resolve(String(stderr));
    });
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  console.log('[1/7] Menyalakan preview server (build produksi)...');
  const srv = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: ROOT, stdio: 'ignore', windowsHide: true,
  });
  const killSrv = () => { try { srv.kill(); } catch { /* abaikan */ } };
  process.on('exit', killSrv);
  await waitPort(PORT);

  console.log('[2/7] Membuka Edge headless...');
  const browser = await chromium.launch({
    executablePath: EDGE,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ acceptDownloads: true });
  page.setDefaultTimeout(90000);
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.locator('.tpl-item', { hasText: 'Pop Elements Pack' }).first().waitFor();

  console.log('[3/7] Pilih template Pop Elements (auto-alpha)...');
  await page.locator('.tpl-item', { hasText: 'Pop Elements Pack' }).first().click();
  await page.getByText('ALPHA', { exact: false }).first().waitFor();
  console.log('      ✓ badge ALPHA muncul (bgMode transparan aktif)');

  console.log('[4/7] Set durasi 5 detik...');
  await page.locator('input[type="number"][min="5"][max="60"]').fill('5');

  console.log('[5/7] Export WebM Alpha (realtime ±5 detik)...');
  await page.getByRole('button', { name: /Export WebM Alpha/ }).click();
  await page.getByText('Export selesai').waitFor();

  console.log('[6/7] Download video + thumbnail + CSV...');
  async function dl(clickSel, fallback) {
    const [d] = await Promise.all([
      page.waitForEvent('download'),
      clickSel.click(),
    ]);
    const p = path.join(OUT, d.suggestedFilename() || fallback);
    await d.saveAs(p);
    return p;
  }
  const webm = await dl(page.locator('a[download]').first(), 'demo_alpha.webm');
  const thumb = await dl(page.getByRole('button', { name: /Download thumbnail/ }), 'demo_thumb.png');
  await page.getByRole('button', { name: /Meta/ }).click();
  const csv = await dl(page.getByRole('button', { name: /CSV Adobe/ }), 'demo_adobestock.csv');
  console.log('      ✓', webm);
  console.log('      ✓', thumb);
  console.log('      ✓', csv);

  console.log('[7/7] Convert ke MOV ProRes 4444 + verifikasi...');
  const mov = path.join(OUT, 'demo_alpha_prores4444.mov');
  await ff(['-y', '-i', webm, '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-an', mov]);
  const probeWebm = await ff(['-i', webm]).catch((e) => e.message);
  const probeMov = await ff(['-i', mov]).catch((e) => e.message);
  const stream = (s) => (s.match(/Stream #.*/g) || []).join('\n      ');
  console.log('      WebM :', stream(probeWebm));
  console.log('      MOV  :', stream(probeMov));
  console.log('      CSV  :', fs.readFileSync(csv, 'utf8').split('\n')[0]);
  console.log('      CSV  :', fs.readFileSync(csv, 'utf8').split('\n')[1].slice(0, 120) + '…');

  await browser.close();
  killSrv();
  console.log('\nDEMO SELESAI. File di:', OUT);
})().catch((e) => {
  console.error('\nDEMO GAGAL:', e.message);
  process.exit(1);
});
