// Vidlust — Electron main process (CommonJS agar simpel & stabil).
// Tugasnya: window native + jembatan ffmpeg (konversi WebM→MP4/ProRes/GIF, simpan batch ke folder).
// Seluruh render animasi tetap di renderer (React/Canvas) — 100% kode dipakai ulang.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

function ffmpegBin() {
  let p = null;
  try {
    p = require('ffmpeg-static');
  } catch {
    p = null;
  }
  if (!p) {
    // fallback: cari di resources (hasil extraResources)
    const fb = path.join(process.resourcesPath || '', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    if (fs.existsSync(fb)) return fb;
    return null;
  }
  // Binary di dalam app.asar tidak bisa di-spawn → pakai hasil asarUnpack
  if (app.isPackaged && typeof p === 'string' && p.includes('app.asar')) {
    return p.replace('app.asar', 'app.asar.unpacked');
  }
  return p;
}

let outputDir = '';
function defaultOutDir() {
  try {
    return path.join(app.getPath('videos'), 'Vidlust');
  } catch {
    return path.join(os.homedir(), 'Vidlust');
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 950,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  if (!app.isPackaged) {
    // mode dev: muat dari vite (npm run electron:dev)
    win.loadURL(process.env.VITE_DEV_URL || 'http://127.0.0.1:5173/');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  outputDir = defaultOutDir();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Sinyal hidup dari renderer (bukti JS jalan di app packaged) + log error fatal
const READY_LOG = path.join(os.tmpdir(), 'vidlust-ready.log');
ipcMain.on('vidlust:ready', () => {
  try {
    fs.appendFileSync(READY_LOG, new Date().toISOString() + ' renderer-ready\n');
  } catch { /* abaikan */ }
});
process.on('uncaughtException', (e) => {
  try {
    fs.appendFileSync(path.join(os.tmpdir(), 'vidlust-error.log'), new Date().toISOString() + ' ' + (e && e.stack || e) + '\n');
  } catch { /* abaikan */ }
});

function runFfmpeg(args, timeoutMs = 10 * 60 * 1000) {
  const bin = ffmpegBin();
  if (!bin || !fs.existsSync(bin)) {
    return Promise.reject(new Error('ffmpeg tidak ditemukan. Jalankan ulang via npm (ffmpeg-static) atau install ulang aplikasi.'));
  }
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { windowsHide: true });
    let stderr = '';
    const timer = setTimeout(() => {
      try { p.kill(); } catch { /* abaikan */ }
      reject(new Error('ffmpeg timeout (>10 mnt)'));
    }, timeoutMs);
    p.stderr.on('data', (d) => { stderr += d.toString(); });
    p.on('error', (e) => { clearTimeout(timer); reject(e); });
    p.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error('ffmpeg exit ' + code + ': ' + stderr.slice(-2000)));
    });
  });
}

async function ensureOutDir() {
  await fs.promises.mkdir(outputDir, { recursive: true });
  return outputDir;
}

ipcMain.handle('vidlust:get-info', () => ({
  isNative: true,
  platform: process.platform,
  outputDir,
  ffmpeg: !!ffmpegBin(),
  version: app.getVersion(),
}));

ipcMain.handle('vidlust:choose-dir', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  if (!r.canceled && r.filePaths[0]) outputDir = r.filePaths[0];
  return outputDir;
});

ipcMain.handle('vidlust:open-dir', async (_e, dir) => {
  await shell.openPath(dir || outputDir);
  return true;
});

ipcMain.handle('vidlust:save-buffer', async (_e, { name, buffer }) => {
  await ensureOutDir();
  const full = path.join(outputDir, path.basename(name));
  await fs.promises.writeFile(full, Buffer.from(buffer));
  return full;
});

// WebM (termasuk alpha VP9) → MP4 H.264 yuv420p, siap upload Adobe Stock
ipcMain.handle('vidlust:convert-mp4', async (_e, { name, buffer }) => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidlust-'));
  try {
    const src = path.join(tmp, 'in' + path.extname(name || '.webm'));
    const base = path.parse(path.basename(name || 'video')).name;
    await ensureOutDir();
    const dst = path.join(outputDir, base + '_h264.mp4');
    await fs.promises.writeFile(src, Buffer.from(buffer));
    await runFfmpeg(['-y', '-i', src, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', '-an', dst]);
    return dst;
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

// WebM alpha → MOV ProRes 4444 (yuva) — format overlay siap Adobe Stock
ipcMain.handle('vidlust:convert-prores', async (_e, { name, buffer }) => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidlust-'));
  try {
    const src = path.join(tmp, 'in' + path.extname(name || '.webm'));
    const base = path.parse(path.basename(name || 'video')).name;
    await ensureOutDir();
    const dst = path.join(outputDir, base + '_prores4444.mov');
    await fs.promises.writeFile(src, Buffer.from(buffer));
    await runFfmpeg(['-y', '-i', src, '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-an', dst]);
    return dst;
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

// ---- PNG sequence → ProRes 4444 (alpha asli, dari renderer frame-by-frame) ----
const seqJobs = new Map(); // jobId -> tmpdir

function fpsToRate(fps) {
  if (fps === 23.98) return '24000/1001';
  if (fps === 29.97) return '30000/1001';
  if (fps === 59.94) return '60000/1001';
  return String(fps);
}

ipcMain.handle('vidlust:seq-begin', async () => {
  const jobId = 'seq_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidlust-seq-'));
  seqJobs.set(jobId, tmp);
  return jobId;
});

ipcMain.handle('vidlust:seq-frame', async (_e, { jobId, index, buffer }) => {
  const tmp = seqJobs.get(jobId);
  if (!tmp) throw new Error('seq job tidak dikenal (mungkin dibatalkan)');
  const name = 'frame_' + String(index).padStart(4, '0') + '.png';
  await fs.promises.writeFile(path.join(tmp, name), Buffer.from(buffer));
  return true;
});

ipcMain.handle('vidlust:seq-finish', async (_e, { jobId, fps, outName }) => {
  const tmp = seqJobs.get(jobId);
  if (!tmp) throw new Error('seq job tidak dikenal (mungkin dibatalkan)');
  try {
    await ensureOutDir();
    const safe = path.basename(outName || 'overlay.mov').replace(/\.[a-z0-9]+$/i, '') + '.mov';
    const dst = path.join(outputDir, safe);
    await runFfmpeg([
      '-y',
      '-framerate', fpsToRate(Number(fps) || 30),
      '-i', path.join(tmp, 'frame_%04d.png'),
      '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le',
      '-an', dst,
    ]);
    return dst;
  } finally {
    seqJobs.delete(jobId);
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

ipcMain.handle('vidlust:seq-abort', async (_e, { jobId }) => {
  const tmp = seqJobs.get(jobId);
  seqJobs.delete(jobId);
  if (tmp) await fs.promises.rm(tmp, { recursive: true, force: true });
  return true;
});

// Video → GIF preview kecil untuk portofolio
ipcMain.handle('vidlust:make-gif', async (_e, { name, buffer }) => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidlust-'));
  try {
    const src = path.join(tmp, 'in' + path.extname(name || '.mp4'));
    const base = path.parse(path.basename(name || 'video')).name;
    await ensureOutDir();
    const dst = path.join(outputDir, base + '_preview.gif');
    await fs.promises.writeFile(src, Buffer.from(buffer));
    await runFfmpeg(['-y', '-i', src, '-vf', 'fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse', dst]);
    return dst;
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});
