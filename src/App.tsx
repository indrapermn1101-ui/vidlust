import { useEffect, useMemo, useRef, useState } from 'react';
import { TEMPLATES } from './engines/templates';
import { drawFrame } from './engines/render';
import { ADOBE_PRESETS, QUICK_DURATIONS, QUICK_FPS, QUICK_RESOLUTIONS, generateMetadata, metadataToCSV, validateForAdobe } from './lib/adobeStock';
import { bitrateFor, captureThumbnail, captureThumbnailPNG, downloadBlob, downloadText, pickSupportedMime, recordCanvas } from './lib/exporter';
import { PALETTES } from './lib/palettes';
import { deleteProject, listProjects, loadLast, saveLast, saveProject, type SavedProject } from './lib/projects';
import BatchPanel from './components/BatchPanel';
import AIVideoPanel from './components/AIVideoPanel';
import NativeActions from './components/NativeActions';
import MotionStudio from './components/MotionStudio';
import { isNative } from './lib/native';
import { renderJobOffline, supportsOfflineEncode } from './lib/offlineRender';
import type { ProjectSettings } from './types';

const DEFAULTS: ProjectSettings = {
  templateId: 'geo-loop',
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 12,
  primary: '#7c3aed',
  secondary: '#06b6d4',
  background: '#0f0f23',
  accent: '#f472b6',
  speed: 1,
  density: 1,
  text: 'SALE',
  showText: false,
  seed: 42,
  loop: true,
  bgMode: 'solid',
};

function enhanceIdea(idea: string) {
  const clean = idea.trim() || 'abstrak elegan';
  const styles = ['minimal corporate', 'neon synthwave', 'cute pastel illustration'];
  const prompts = styles.map(
    (st) => `seamless looping motion graphics, ${clean}, ${st} style, smooth 30fps animation, no text, no watermark, centered composition, high detail, commercial stock footage`
  );
  const titles = styles.map(
    (st) => `Seamless ${clean} ${st} looping animation background`
  );
  const keywords = Array.from(new Set([
    ...clean.toLowerCase().split(/\s+/),
    'loop', 'seamless', 'motion graphics', 'animated background', 'stock footage',
    'abstract', '4k', 'royalty free', 'video', 'illustration', 'minimal', 'corporate',
    'presentation', 'social media', 'website background',
  ])).slice(0, 30);
  return { prompts, titles, keywords };
}

type Tab = 'setting' | 'batch' | 'ai' | 'aivideo' | 'meta';

export default function App() {
  const [mode, setMode] = useState<'gen' | 'studio'>('gen');
  const [s, setS] = useState<ProjectSettings>(() => loadLast() ?? DEFAULTS);
  const [playing, setPlaying] = useState(true);
  const [tab, setTab] = useState<Tab>('setting');
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [lastFile, setLastFile] = useState<{ url: string; name: string; sizeMB: number; ext: string; engine: 'offline' | 'realtime'; blob: Blob } | null>(null);
  const [aiIdea, setAiIdea] = useState('kopi hangat di pagi hari, cozy cafe');
  const [thumb, setThumb] = useState('');
  const [projName, setProjName] = useState('');
  const [projects, setProjects] = useState<SavedProject[]>(() => listProjects());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  const set = (p: Partial<ProjectSettings>) => setS((prev) => ({ ...prev, ...p }));
  const tpl = TEMPLATES.find((t) => t.id === s.templateId)!;
  const meta = useMemo(() => generateMetadata(s, tpl.name), [s, tpl.name]);
  const validation = useMemo(() => validateForAdobe(s), [s]);
  const mimeInfo = useMemo(() => pickSupportedMime(s.bgMode === 'transparent'), [s.bgMode]);
  const offlineOK = useMemo(() => supportsOfflineEncode(), []);
  const useOffline = s.bgMode !== 'transparent' && offlineOK;
  const estMB = useMemo(() => (bitrateFor(s) * s.duration) / 8 / 1024 / 1024, [s]);
  const isCustomRes = !ADOBE_PRESETS.some((p) => p.width === s.width && p.height === s.height);

  // autosave
  useEffect(() => { saveLast(s); }, [s]);

  // sinyal hidup untuk host native (diabaikan di web)
  useEffect(() => {
    try { window.vidlustNative?.ready(); } catch { /* abaikan */ }
  }, []);

  // render loop
  useEffect(() => {
    let raf = 0;
    const loop = (ts: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (playing) {
            if (lastTsRef.current == null) lastTsRef.current = ts;
            const dt = (ts - lastTsRef.current) / 1000;
            lastTsRef.current = ts;
            timeRef.current += dt;
          } else {
            lastTsRef.current = ts;
          }
          drawFrame(ctx, s, timeRef.current);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [s, playing]);

  useEffect(() => { timeRef.current = 0; }, [s.templateId, s.width, s.height]);

  const ai = useMemo(() => enhanceIdea(aiIdea), [aiIdea]);

  async function handleExport(forceRealtime = false) {
    const canvas = canvasRef.current;
    if (!canvas || exporting) return;
    setExporting(true);
    setProgress(0);
    setLastFile(null);
    try {
      // OFFLINE frame-by-frame bila memungkinkan (solid + WebCodecs):
      // lebih cepat & frame-exact. Transparan / tanpa WebCodecs → realtime.
      if (!forceRealtime && s.bgMode !== 'transparent' && offlineOK) {
        const r = await renderJobOffline(s, (done, total) => setProgress(done / total));
        const url = URL.createObjectURL(r.blob);
        setLastFile({ url, name: r.filename, sizeMB: r.blob.size / 1024 / 1024, ext: r.ext, engine: 'offline', blob: r.blob });
        setThumb(r.thumb);
        return;
      }
      setPlaying(true);
      const { blob, ext } = await recordCanvas(canvas, s, (el) => setProgress(el / s.duration));
      const name = `${meta.filenameBase}_seed${s.seed}.${ext}`;
      const url = URL.createObjectURL(blob);
      setLastFile({ url, name, sizeMB: blob.size / 1024 / 1024, ext, engine: 'realtime', blob });
      setThumb(s.bgMode === 'transparent' ? captureThumbnailPNG(canvas) : captureThumbnail(canvas));
    } catch (e) {
      alert('Export gagal: ' + (e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  function handleSaveProject() {
    const name = projName.trim() || `${tpl.name} ${s.width}x${s.height}`;
    saveProject(name, s);
    setProjects(listProjects());
    setProjName('');
  }

  return (
    <>
      <header className="top">
        <div className="brand">
          <div className="logo">V</div>
          <h1>Vidlust{isNative() && ' 🖥'}<small>Generator video ilustrasi · siap Adobe Stock{isNative() && ' · mode Desktop (ffmpeg lokal aktif)'}</small></h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className={mode === 'gen' ? '' : 'ghost'} style={{ fontSize: 13 }} onClick={() => setMode('gen')}>🎛 Generator</button>
          <button className={mode === 'studio' ? '' : 'ghost'} style={{ fontSize: 13 }} onClick={() => setMode('studio')}>🎬 Motion Studio</button>
          <span className="badge">● {validation.ok ? 'Siap submit' : 'Cek setting'}{s.bgMode === 'transparent' ? ' · ALPHA' : ''}</span>
          <span className="kbd mono">{s.width}×{s.height} · {s.fps}fps · {s.duration}s · ~{estMB.toFixed(1)}MB · {useOffline ? 'OFFLINE MP4' : mimeInfo.ext.toUpperCase()}</span>
        </div>
      </header>

      {mode === 'studio' ? (
        <>
          <MotionStudio />
          <footer>
            Vidlust Motion Studio · Layer + keyframe + easing + preset + partikel · Export MP4 frame-exact / WebM alpha · Metadata Adobe otomatis.
          </footer>
        </>
      ) : (
      <>
      <div className="layout">
        {/* KIRI */}
        <div className="card">
          <h2>1 · Pilih Template ({TEMPLATES.length})</h2>
          <div className="tpl">
            {TEMPLATES.map((t) => (
              <div
                key={t.id}
                className={'tpl-item' + (t.id === s.templateId ? ' active' : '')}
                onClick={() => {
                  // Template overlay → otomatis alihkan ke alpha (sekali jalan, tidak memaksa kembali)
                  const over = !!t.overlay && s.bgMode !== 'transparent';
                  set({ templateId: t.id, ...(over ? { bgMode: 'transparent' as const } : {}) });
                  if (over) setTab('setting');
                }}
              >
                <div><b style={{ fontSize: 14 }}>{t.name}</b> <span className="kbd">· {t.category}</span>{t.overlay && <span className="chip" style={{ marginLeft: 6 }}>◻ alpha-first</span>}</div>
                <div className="meta">{t.description}<br />🎯 {t.bestFor}</div>
              </div>
            ))}
          </div>
          <h2 style={{ marginTop: 14 }}>💾 Project tersimpan</h2>
          <div className="row">
            <input type="text" placeholder="Nama project…" value={projName} onChange={(e) => setProjName(e.target.value)} />
            <button style={{ flex: '0 0 auto' }} onClick={handleSaveProject}>Simpan</button>
          </div>
          {projects.length === 0 && <p className="hint">Belum ada project. Setting otomatis tersimpan di browser.</p>}
          {projects.map((p) => (
            <div key={p.name} className="check">
              <div style={{ flex: 1 }}><b>{p.name}</b><span>{p.settings.width}×{p.settings.height} · {p.settings.templateId} · {new Date(p.updatedAt).toLocaleDateString('id-ID')}</span></div>
              <button className="ghost" style={{ fontSize: 12 }} onClick={() => setS(p.settings)}>Buka</button>
              <button className="ghost" style={{ fontSize: 12 }} onClick={() => { deleteProject(p.name); setProjects(listProjects()); }}>✕</button>
            </div>
          ))}
        </div>

        {/* TENGAH */}
        <div>
          <div className="card preview-wrap">
            <h2>2 · Preview Live (ini yang direkam){s.bgMode === 'transparent' && ' · kotak-kotak = transparan'}</h2>
            <div className={s.bgMode === 'transparent' ? 'checker-frame' : ''}>
              <canvas ref={canvasRef} width={s.width} height={s.height} className="preview" />
            </div>
            <div className="preview-bar">
              <button onClick={() => setPlaying(!playing)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
              <button className="ghost" onClick={() => { timeRef.current = 0; }}>↺ Ulangi</button>
              <button className="ghost" onClick={() => set({ seed: Math.floor(Math.random() * 99999) })}>🎲 Acak varian</button>
              {useOffline ? (
                <>
                  <button onClick={() => handleExport(false)} disabled={exporting} className="primary">
                    {exporting ? `Render frame ${Math.round(progress * s.duration * s.fps)}/${Math.round(s.duration * s.fps)}…` : '⬇ Export MP4 · frame-exact'}
                  </button>
                  <button className="ghost" onClick={() => handleExport(true)} disabled={exporting}>⏺ Realtime</button>
                </>
              ) : (
                <button onClick={() => handleExport(true)} disabled={exporting} className="primary">
                  {exporting ? `Merekam… ${Math.round(progress * s.duration)}s / ${s.duration}s` : s.bgMode === 'transparent' ? '⬇ Export WebM Alpha' : '⬇ Export Video (realtime)'}
                </button>
              )}
            </div>
            {exporting && <div className="progress"><div style={{ width: `${progress * 100}%` }} /></div>}
            {lastFile && (
              <div className="check pass">
                <div>✅ <b>Export selesai: {lastFile.name} ({lastFile.sizeMB.toFixed(1)} MB)</b>
                  <span>{lastFile.engine === 'offline'
                    ? `Frame-by-frame offline, ${s.duration * s.fps} frame @ ${s.fps}fps — timing presisi, MP4 H.264 langsung bisa upload ke Adobe Stock.`
                    : lastFile.ext === 'mp4'
                    ? 'MP4 realtime — langsung bisa upload ke Adobe Stock.'
                    : s.bgMode === 'transparent'
                      ? 'WebM ALPHA — transparansi terjaga. Untuk Adobe Stock, convert ke MOV (ProRes 4444) via Shutter Encoder / ffmpeg sebelum upload.'
                      : 'WebM — convert ke MP4 via Handbrake / Adobe Media Encoder sebelum upload (pilih H.264).'}</span>
                  <div className="row" style={{ marginTop: 8 }}>
                    <a href={lastFile.url} download={lastFile.name}><button className="primary">💾 Download</button></a>
                    <button onClick={() => lastFile && downloadBlob(lastFile.blob, lastFile.name)}>↻ Unduh ulang</button>
                  </div>
                </div>
              </div>
            )}
            {isNative() && lastFile && (
              <div style={{ marginTop: 8 }}>
                <NativeActions
                  blob={lastFile.blob}
                  filename={lastFile.name}
                  alpha={s.bgMode === 'transparent'}
                  seq={{ width: s.width, height: s.height, fps: s.fps, duration: s.duration, draw: (ctx, t) => drawFrame(ctx, s, t), outName: `${meta.filenameBase}_seed${s.seed}_prores4444.mov` }}
                />
              </div>
            )}
            {thumb && (
              <div style={{ marginTop: 10 }}>
                <div className="kbd">Thumbnail otomatis:</div>
                <img src={thumb} alt="thumb" style={{ width: 220, borderRadius: 10, border: '1px solid var(--border)', marginTop: 6 }} />
                <div><button className="ghost" onClick={() => { const a = document.createElement('a'); a.href = thumb; a.download = meta.filenameBase + (s.bgMode === 'transparent' ? '_thumb.png' : '_thumb.jpg'); a.click(); }}>⬇ Download thumbnail</button></div>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h2>3 · Kepatuhan Adobe Stock (otomatis)</h2>
            {validation.checks.map((c) => (
              <div key={c.label} className={'check ' + (c.pass ? 'pass' : 'fail')}>
                <div>{c.pass ? '✅' : '❌'} <b>{c.label}</b><span>{c.detail}</span></div>
              </div>
            ))}
            <p className="hint">Syarat resmi: MP4/MOV/MPEG, 5–60 detik, 1920×1080 s/d 4096×2304 (landscape), 1080×1920 dst (vertical), 1080×1080 (square), fps standar, maks 3.9 GB.</p>
          </div>
        </div>

        {/* KANAN */}
        <div className="card">
          <div className="tabs" style={{ flexWrap: 'wrap' }}>
            <button className={tab === 'setting' ? 'active' : ''} onClick={() => setTab('setting')}>⚙ Setting</button>
            <button className={tab === 'batch' ? 'active' : ''} onClick={() => setTab('batch')}>📦 Batch</button>
            <button className={tab === 'ai' ? 'active' : ''} onClick={() => setTab('ai')}>✨ Ide AI</button>
            <button className={tab === 'aivideo' ? 'active' : ''} onClick={() => setTab('aivideo')}>🎁 AI Video Gratis</button>
            <button className={tab === 'meta' ? 'active' : ''} onClick={() => setTab('meta')}>📝 Meta</button>
          </div>

          {tab === 'setting' && (
            <>
              <h3>Resolusi</h3>
              <div className="seg-grid">
                {QUICK_RESOLUTIONS.map((r) => (
                  <button
                    key={r.label}
                    className={s.width === r.width && s.height === r.height ? 'active' : 'ghost'}
                    onClick={() => set({ width: r.width, height: r.height })}
                  >{r.label}</button>
                ))}
              </div>
              <label className="lbl">Preset Adobe Stock lainnya / custom</label>
              <select
                value={isCustomRes ? 'custom' : `${s.width}x${s.height}-${s.fps}`}
                onChange={(e) => {
                  if (e.target.value === 'custom') return;
                  const p = ADOBE_PRESETS.find((x) => `${x.width}x${x.height}-${x.fps}` === e.target.value);
                  if (p) set({ width: p.width, height: p.height, fps: p.fps });
                }}
              >
                {isCustomRes && <option value="custom">Custom {s.width}×{s.height} ⚠️ cek validasi</option>}
                {ADOBE_PRESETS.map((p) => (
                  <option key={p.label} value={`${p.width}x${p.height}-${p.fps}`}>{p.label} · {p.note}</option>
                ))}
              </select>
              <div className="grid2">
                <div><label className="lbl">Lebar custom</label><input type="number" min={320} max={4096} value={s.width} onChange={(e) => set({ width: Math.min(4096, Math.max(320, Number(e.target.value) || 320)) })} /></div>
                <div><label className="lbl">Tinggi custom</label><input type="number" min={320} max={4096} value={s.height} onChange={(e) => set({ height: Math.min(4096, Math.max(320, Number(e.target.value) || 320)) })} /></div>
              </div>

              <h3 style={{ marginTop: 14 }}>Frame rate</h3>
              <div className="seg-grid">
                {QUICK_FPS.map((f) => (
                  <button key={f} className={s.fps === f ? 'active' : 'ghost'} onClick={() => set({ fps: f })}>{f} fps</button>
                ))}
              </div>
              <label className="lbl">Atau standar lain (23.98 / 29.97 / 59.94 untuk broadcast)</label>
              <select value={String(s.fps)} onChange={(e) => set({ fps: Number(e.target.value) })}>
                {[23.98, 24, 25, 29.97, 30, 50, 59.94, 60].map((f) => <option key={f} value={f}>{f} fps</option>)}
              </select>

              <h3 style={{ marginTop: 14 }}>Durasi (syarat Adobe 5–60 detik)</h3>
              <div className="seg-grid">
                {QUICK_DURATIONS.map((d) => (
                  <button key={d} className={s.duration === d ? 'active' : 'ghost'} onClick={() => set({ duration: d })}>{d}s</button>
                ))}
              </div>
              <input type="range" min={5} max={60} step={1} value={s.duration} onChange={(e) => set({ duration: Number(e.target.value) })} />
              <div className="row" style={{ alignItems: 'center' }}>
                <input type="number" min={5} max={60} value={s.duration} onChange={(e) => set({ duration: Math.min(60, Math.max(5, Number(e.target.value) || 5)) })} />
                <span className="kbd">loop seamless di semua durasi</span>
              </div>

              <h3 style={{ marginTop: 14 }}>Background</h3>
              <div className="seg-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button className={s.bgMode === 'solid' ? 'active' : 'ghost'} onClick={() => set({ bgMode: 'solid' })}>⬛ Solid</button>
                <button className={s.bgMode === 'transparent' ? 'active' : 'ghost'} onClick={() => set({ bgMode: 'transparent' })}>◻ Transparan / Alpha</button>
              </div>
              <p className="hint" style={{ marginTop: 6 }}>
                {s.bgMode === 'transparent'
                  ? 'Mode ALPHA: background tidak dirender, cocok untuk overlay (confetti, doodle, partikel). Export otomatis WebM agar transparansi terjaga.'
                  : 'Mode solid: background penuh warna, cocok untuk submit MP4 langsung.'}
              </p>

              <h3 style={{ marginTop: 14 }}>Palet kurasi (1 klik)</h3>
              <div className="chips">
                {PALETTES.map((p) => (
                  <button
                    key={p.name}
                    title={p.name}
                    onClick={() => set({ primary: p.primary, secondary: p.secondary, background: p.background, accent: p.accent })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '5px 9px' }}
                  >
                    <span style={{ display: 'inline-flex' }}>
                      {[p.primary, p.secondary, p.background, p.accent].map((c) => (
                        <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c, border: '1px solid rgba(255,255,255,0.4)', marginLeft: -4 }} />
                      ))}
                    </span>
                    {p.name}
                  </button>
                ))}
              </div>

              <h3 style={{ marginTop: 14 }}>Warna & gaya</h3>
              <div className="grid4">
                <div><label className="lbl">Primer</label><input type="color" value={s.primary} onChange={(e) => set({ primary: e.target.value })} /></div>
                <div><label className="lbl">Sekunder</label><input type="color" value={s.secondary} onChange={(e) => set({ secondary: e.target.value })} /></div>
                <div><label className="lbl">Background{s.bgMode === 'transparent' ? ' (nonaktif — alpha)' : ''}</label><input type="color" value={s.background} disabled={s.bgMode === 'transparent'} style={s.bgMode === 'transparent' ? { opacity: 0.35 } : undefined} onChange={(e) => set({ background: e.target.value })} /></div>
                <div><label className="lbl">Aksen</label><input type="color" value={s.accent} onChange={(e) => set({ accent: e.target.value })} /></div>
              </div>
              <label className="lbl">Kecepatan animasi: {s.speed.toFixed(1)}x</label>
              <input type="range" min={0.2} max={3} step={0.1} value={s.speed} onChange={(e) => set({ speed: Number(e.target.value) })} />
              <label className="lbl">Kepadatan: {s.density.toFixed(1)}x</label>
              <input type="range" min={0.3} max={2} step={0.1} value={s.density} onChange={(e) => set({ density: Number(e.target.value) })} />

              <label className="lbl">Teks overlay (opsional)</label>
              <input type="text" placeholder="mis. SALE, 2026, THANK YOU" value={s.text} onChange={(e) => set({ text: e.target.value })} />
              <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <input type="checkbox" checked={s.showText} onChange={(e) => set({ showText: e.target.checked })} /> Tampilkan teks
              </label>
              <p className="hint">Tips laris: tanpa teks = lebih timeless. Durasi 10–15 detik paling laris untuk loop.</p>
            </>
          )}

          {tab === 'batch' && <BatchPanel base={s} />}

          {tab === 'ai' && (
            <>
              <h3>Asisten ide</h3>
              <p className="hint">Tulis ide bebas (Indonesia ok). Jadi prompt siap AI + judul + keywords.</p>
              <label className="lbl">Ide kamu</label>
              <textarea value={aiIdea} onChange={(e) => setAiIdea(e.target.value)} />
              <label className="lbl">Prompt siap tempel</label>
              {ai.prompts.map((p, i) => (
                <div key={i} className="check pass"><div><b>{ai.titles[i]}</b><span className="mono">{p}</span>
                  <div><button className="ghost" style={{ fontSize: 12 }} onClick={() => navigator.clipboard.writeText(p)}>📋 Salin prompt {i + 1}</button></div>
                </div></div>
              ))}
              <label className="lbl">Keywords saran</label>
              <div className="chips">{ai.keywords.map((k) => <span key={k} className="chip">{k}</span>)}</div>
              <div style={{ marginTop: 8 }} className="row">
                <button className="ghost" onClick={() => navigator.clipboard.writeText(ai.keywords.join(', '))}>📋 Salin keywords</button>
                <button onClick={() => setTab('aivideo')}>🎁 Generate gratis via AI →</button>
              </div>
            </>
          )}

          {tab === 'aivideo' && <AIVideoPanel idea={aiIdea} />}

          {tab === 'meta' && (
            <>
              <h3>Metadata Adobe Stock (auto)</h3>
              <label className="lbl">Judul ({meta.title.length}/200)</label>
              <textarea value={meta.title} readOnly />
              <label className="lbl">Deskripsi</label>
              <textarea value={meta.description} readOnly style={{ minHeight: 110 }} />
              <label className="lbl">Keywords ({meta.keywords.length})</label>
              <div className="chips">{meta.keywords.map((k) => <span key={k} className="chip">{k}</span>)}</div>
              <label className="lbl">Kategori</label>
              <input type="text" value={meta.category} readOnly />
              <div className="row" style={{ marginTop: 10 }}>
                <button onClick={() => downloadText(metadataToCSV(meta, s.bgMode === 'transparent' ? 'webm' : 'mp4'), meta.filenameBase + '_adobestock.csv', 'text/csv')}>⬇ CSV Adobe</button>
                <button className="ghost" onClick={() => navigator.clipboard.writeText(`${meta.title}\n\n${meta.description}\n\n${meta.keywords.join(', ')}`)}>📋 Salin semua</button>
              </div>
              <p className="hint">Upload video → tempel ini di Contributor Portal. Prosedural = tanpa release. Video AI = centang “Created using generative AI”.</p>
            </>
          )}
        </div>
      </div>

      <footer>
        Vidlust v0.6 · 18 template · Motion Studio · Render offline frame-by-frame (MP4 H.264) + realtime · Batch · AI video 100% gratis ·
        Tips: render HD untuk tes, 4K untuk upload final.
      </footer>
      </>
      )}
    </>
  );
}
