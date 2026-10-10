import { useEffect, useMemo, useRef, useState } from 'react';
import type { Keyframe, Layer, LayerKind, MotionScene } from '../motion/types';
import { EASES, uid } from '../motion/types';
import { drawScene, evalLayer, preloadImage } from '../motion/render';
import { ENTRANCES, makeLayer, starterScenes } from '../motion/presets';
import { defaultScene, deleteScene, listScenes, normalizeScene, saveScene } from '../motion/storage';
import { AI_PROVIDERS, AI_STYLES, composeOfflineScene, generateSceneFromIdea, get9rEndpoint, get9rKey, get9rModel, getAiProvider, set9rEndpoint, set9rKey, set9rModel, setAiProvider, testAiConnection, type AiProviderId, type AiSceneStyle } from '../lib/aiScene';
import { renderSceneOffline } from '../motion/export';
import { supportsOfflineEncode } from '../lib/frameEncoder';
import { ADOBE_PRESETS, QUICK_RESOLUTIONS, generateMetadata, metadataToCSV, validateForAdobe } from '../lib/adobeStock';
import { captureThumbnail, captureThumbnailPNG, downloadBlob, downloadText, recordCanvas } from '../lib/exporter';
import { isNative } from '../lib/native';
import NativeActions from './NativeActions';
import type { ProjectSettings } from '../types';

const KIND_ADD: LayerKind[] = ['text', 'rect', 'ellipse', 'star', 'image', 'particles'];

function fmt(t: number) {
  return `${t.toFixed(2)}s`;
}

/** Ubah scene menjadi pengaturan semu agar bisa memakai validasi/metadata/export yang sudah ada. */
function toShim(scene: MotionScene): ProjectSettings {
  return {
    templateId: 'motion-studio',
    width: scene.width,
    height: scene.height,
    fps: scene.fps,
    duration: scene.duration,
    primary: '#7c3aed',
    secondary: '#06b6d4',
    background: scene.background,
    accent: '#f472b6',
    speed: 1,
    density: 1,
    text: scene.name,
    showText: false,
    seed: 1,
    loop: true,
    bgMode: scene.bgMode,
  };
}

export default function MotionStudio() {
  const [scene, setScene] = useState<MotionScene>(() => defaultScene());
  const [selId, setSelId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [playT, setPlayT] = useState(0);
  const [entranceDur, setEntranceDur] = useState(1);
  const [saveName, setSaveName] = useState('');
  const [saved, setSaved] = useState(() => listScenes());
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<{ url: string; name: string; sizeMB: number; engine: string; blob: Blob } | null>(null);
  const [thumb, setThumb] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiIdea, setAiIdea] = useState('');
  const [aiStyle, setAiStyle] = useState<AiSceneStyle>('auto');
  const [aiDur, setAiDur] = useState(10);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [aiOk, setAiOk] = useState(true);
  const [aiProvider, setAiProviderState] = useState<AiProviderId>(() => getAiProvider());
  const [r9Endpoint, setR9Endpoint] = useState(() => get9rEndpoint());
  const [r9Key, setR9Key] = useState(() => get9rKey());
  const [r9Model, setR9Model] = useState(() => get9rModel());
  const [showR9Key, setShowR9Key] = useState(false);
  const [connBusy, setConnBusy] = useState(false);
  const [connStatus, setConnStatus] = useState('');
  const [connOk, setConnOk] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  const sel: Layer | null = scene.layers.find((l) => l.id === selId) ?? null;
  const keys = useMemo(() => (sel ? [...sel.keys].sort((a, b) => a.t - b.t) : []), [sel]);
  // Keyframe aktif = key terakhir pada/sebelum playhead. Slider mengedit key ini LANGSUNG (live).
  const activeKey: Keyframe | null = useMemo(() => {
    if (keys.length === 0) return null;
    let k = keys[0];
    for (const kk of keys) if (kk.t <= playT + 1e-6) k = kk;
    return k;
  }, [keys, playT]);

  const shim = useMemo(() => toShim(scene), [scene]);
  const validation = useMemo(() => validateForAdobe(shim), [shim]);
  const meta = useMemo(() => generateMetadata(shim, 'Motion Studio'), [shim]);
  const offlineOK = useMemo(() => supportsOfflineEncode(), []);
  const useOffline = scene.bgMode !== 'transparent' && offlineOK;

  // loop preview
  useEffect(() => {
    let raf = 0;
    const loop = (ts: number) => {
      const canvas = canvasRef.current;
      const sc = sceneRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (playing) {
            if (lastTsRef.current == null) lastTsRef.current = ts;
            const dt = (ts - lastTsRef.current) / 1000;
            lastTsRef.current = ts;
            timeRef.current = (timeRef.current + dt) % Math.max(0.5, sc.duration);
            setPlayT(timeRef.current);
          } else {
            lastTsRef.current = ts;
          }
          drawScene(ctx, sc, timeRef.current);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, scene.width, scene.height]);

  const seek = (t: number) => {
    timeRef.current = Math.min(Math.max(0, t), scene.duration);
    setPlayT(timeRef.current);
  };

  const patchScene = (fn: (s: MotionScene) => MotionScene) => setScene((prev) => fn(structuredClone(prev)));

  const patchSel = (fn: (l: Layer) => void) => {
    if (!selId) return;
    patchScene((s) => {
      const l = s.layers.find((x) => x.id === selId);
      if (l) fn(l);
      return s;
    });
  };

  const patchActiveKey = (patch: Partial<Keyframe>) => {
    if (!selId || !activeKey) return;
    const kid = activeKey.id;
    patchSel((l) => {
      const k = l.keys.find((x) => x.id === kid);
      if (k) Object.assign(k, patch);
    });
  };

  function addLayer(kind: LayerKind) {
    const l = makeLayer(kind, scene.layers.length + 1);
    if (kind === 'image') l.text = '';
    patchScene((s) => {
      s.layers.push(l);
      return s;
    });
    setSelId(l.id);
    seek(Math.min(timeRef.current, scene.duration));
  }

  function addKeyAtPlayhead() {
    if (!sel) return;
    const v = evalLayer(sel, timeRef.current);
    patchSel((l) => {
      l.keys.push({ id: uid('k'), t: Math.round(timeRef.current * 100) / 100, ...v, ease: l.ease });
    });
  }

  function applyEntrance(id: string) {
    const p = ENTRANCES.find((e) => e.id === id);
    if (!p || !sel) return;
    const v = evalLayer(sel, timeRef.current);
    const ks = p.make(v, timeRef.current, entranceDur);
    patchSel((l) => {
      l.keys.push(...ks);
    });
  }

  function loadStarter(id: string) {
    const s = starterScenes().find((x) => x.id === id);
    if (!s) return;
    applyGeneratedScene(normalizeScene(s.make()));
  }

  function applyGeneratedScene(sc: MotionScene) {
    setScene(sc);
    setSelId(sc.layers[0]?.id ?? null);
    seek(0);
  }

  async function handleAiGenerate() {
    if (aiBusy) return;
    if (!aiIdea.trim()) {
      setAiOk(false);
      setAiStatus('Tulis ide scene dulu (bahasa Indonesia).');
      return;
    }
    // simpan pengaturan provider agar dipakai generate + generate berikutnya
    setAiProvider(aiProvider);
    set9rEndpoint(r9Endpoint);
    set9rKey(r9Key);
    set9rModel(r9Model);
    setAiBusy(true);
    setAiOk(true);
    setAiStatus('AI sedang merancang layer + keyframe… (bisa 10–60 detik)');
    try {
      const r = await generateSceneFromIdea(aiIdea, { style: aiStyle, duration: aiDur });
      applyGeneratedScene(r.scene);
      setAiStatus(`Scene "${r.scene.name}" jadi — ${r.scene.layers.length} layer, langsung bisa diedit di bawah.${r.warnings.length ? ' ' + r.warnings.join(' ') : ''}`);
    } catch (e) {
      setAiOk(false);
      setAiStatus((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  async function handleTestConnection() {
    if (connBusy) return;
    setAiProvider(aiProvider);
    set9rEndpoint(r9Endpoint);
    set9rKey(r9Key);
    set9rModel(r9Model);
    setConnBusy(true);
    setConnOk(true);
    setConnStatus('Menghubungi…');
    try {
      setConnStatus(await testAiConnection(aiProvider));
    } catch (e) {
      setConnOk(false);
      setConnStatus((e as Error).message);
    } finally {
      setConnBusy(false);
    }
  }

  function handleAiOffline() {
    const r = composeOfflineScene(aiIdea.trim() || 'kreasi baru', { style: aiStyle, duration: aiDur });
    applyGeneratedScene(r.scene);
    setAiOk(true);
    setAiStatus(`Mode offline: preset "${r.scene.name}" dimuat + teks & warna disesuaikan. ${r.warnings.join(' ')}`);
  }

  function onImageFile(f: File | undefined) {
    if (!f || !selId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // downscale agar localStorage tidak jebol
        const max = 1280;
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * sc));
        c.height = Math.max(1, Math.round(img.height * sc));
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        const url = c.toDataURL('image/png');
        preloadImage(url);
        patchScene((s) => {
          const l = s.layers.find((x) => x.id === selId);
          if (l) l.imageURL = url;
          return s;
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(f);
  }

  async function handleExportOffline() {
    if (exporting) return;
    setExporting('offline');
    setProgress(0);
    setLastFile(null);
    try {
      const r = await renderSceneOffline(sceneRef.current, (d, t) => setProgress(d / t));
      setLastFile({ url: URL.createObjectURL(r.blob), name: r.filename, sizeMB: r.blob.size / 1024 / 1024, engine: `offline frame-exact (${r.frames} frame)`, blob: r.blob });
      setThumb(r.thumb);
    } catch (e) {
      alert('Export gagal: ' + (e as Error).message);
    } finally {
      setExporting(null);
    }
  }

  async function handleExportRealtime() {
    const canvas = canvasRef.current;
    if (!canvas || exporting) return;
    setExporting('realtime');
    setProgress(0);
    setLastFile(null);
    try {
      timeRef.current = 0;
      setPlaying(true);
      const sc = sceneRef.current;
      const { blob, ext } = await recordCanvas(canvas, toShim(sc), (el) => setProgress(el / sc.duration));
      const safe = (sc.name || 'scene').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'scene';
      const name = `vidlust_studio_${safe}_${sc.width}x${sc.height}_${sc.duration}s.${ext}`;
      setLastFile({ url: URL.createObjectURL(blob), name, sizeMB: blob.size / 1024 / 1024, engine: 'realtime', blob });
      setThumb(sc.bgMode === 'transparent' ? captureThumbnailPNG(canvas) : captureThumbnail(canvas));
    } catch (e) {
      alert('Export gagal: ' + (e as Error).message);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div style={{ padding: '16px 22px 40px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Bar scene */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 160px' }}><label className="lbl">Nama scene</label><input type="text" value={scene.name} onChange={(e) => patchScene((s) => { s.name = e.target.value; return s; })} /></div>
          <div style={{ flex: '1 1 120px' }}><label className="lbl">Resolusi cepat</label>
            <select value={`${scene.width}x${scene.height}`} onChange={(e) => { const r = QUICK_RESOLUTIONS.find((x) => `${x.width}x${x.height}` === e.target.value) ?? ADOBE_PRESETS[0]; patchScene((s) => { s.width = r.width; s.height = r.height; return s; }); }}>
              {QUICK_RESOLUTIONS.map((r) => <option key={r.label} value={`${r.width}x${r.height}`}>{r.label}</option>)}
              {![...QUICK_RESOLUTIONS].some((r) => r.width === scene.width && r.height === scene.height) && <option value={`${scene.width}x${scene.height}`}>Custom {scene.width}×{scene.height}</option>}
            </select>
          </div>
          <div><label className="lbl">W×H</label><div className="row"><input type="number" style={{ width: 90 }} value={scene.width} onChange={(e) => patchScene((s) => { s.width = Math.min(4096, Math.max(320, Number(e.target.value) || 320)); return s; })} /><input type="number" style={{ width: 90 }} value={scene.height} onChange={(e) => patchScene((s) => { s.height = Math.min(4096, Math.max(320, Number(e.target.value) || 320)); return s; })} /></div></div>
          <div><label className="lbl">FPS</label>
            <select value={scene.fps} onChange={(e) => patchScene((s) => { s.fps = Number(e.target.value); return s; })}>
              {[24, 25, 30, 50, 60].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div><label className="lbl">Durasi (dtk)</label><input type="number" style={{ width: 80 }} min={1} max={60} value={scene.duration} onChange={(e) => patchScene((s) => { s.duration = Math.min(60, Math.max(1, Number(e.target.value) || 5)); return s; })} /></div>
          <div><label className="lbl">Background</label>
            <div className="row">
              <button className={scene.bgMode === 'solid' ? '' : 'ghost'} onClick={() => patchScene((s) => { s.bgMode = 'solid'; return s; })}>⬛</button>
              <button className={scene.bgMode === 'transparent' ? '' : 'ghost'} onClick={() => patchScene((s) => { s.bgMode = 'transparent'; return s; })}>◻α</button>
              <input type="color" style={{ width: 52 }} disabled={scene.bgMode === 'transparent'} value={scene.background} onChange={(e) => patchScene((s) => { s.background = e.target.value; return s; })} />
            </div>
          </div>
        </div>
        <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Nama simpanan…" value={saveName} onChange={(e) => setSaveName(e.target.value)} style={{ flex: '1 1 140px' }} />
          <button style={{ flex: '0 0 auto' }} onClick={() => { const n = saveName.trim() || scene.name; saveScene(n, scene); setSaved(listScenes()); setSaveName(''); }}>💾 Simpan</button>
          <select value="" onChange={(e) => { if (!e.target.value) return; const f = saved.find((x) => x.name === e.target.value); if (f) { setScene(normalizeScene(f.scene)); setSelId(f.scene.layers[0]?.id ?? null); seek(0); } e.target.value = ''; }} style={{ flex: '1 1 140px' }}>
            <option value="">📂 Buka simpanan ({saved.length})…</option>
            {saved.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
          {saveName === '' && null}
          <button className="ghost" style={{ flex: '0 0 auto' }} onClick={() => { if (saveName.trim()) { deleteScene(saveName.trim()); setSaved(listScenes()); } else alert('Isi nama simpanan yang mau dihapus dulu.'); }}>🗑 Hapus simpanan</button>
        </div>
      </div>

      {scene.layers.length === 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h2>Mulai dari preset studio</h2>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {starterScenes().map((s) => (
              <button key={s.id} onClick={() => loadStarter(s.id)} style={{ textAlign: 'left' }}>🎬 {s.label}<br /><span className="hint">{s.hint}</span></button>
            ))}
            <button className="ghost" onClick={() => addLayer('text')}>＋ Mulai kosong (tambah layer sendiri)</button>
          </div>
        </div>
      )}

      {/* AI Scene: ide → layer + keyframe siap edit */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>✨ Generate scene dari ide (AI)</h2>
          <button className="ghost" style={{ flex: '0 0 auto' }} onClick={() => setAiOpen(!aiOpen)}>{aiOpen ? '▾ Tutup' : '▸ Buka'}</button>
        </div>
        {aiOpen && (
          <div style={{ marginTop: 10 }}>
            <p className="hint">Tulis ide bahasa Indonesia → AI merancang layer + keyframe → hasilnya langsung bisa diedit, disimpan & di-export seperti scene biasa.</p>
            <label className="lbl">Provider AI</label>
            <select value={aiProvider} onChange={(e) => { const p = e.target.value as AiProviderId; setAiProviderState(p); setAiProvider(p); setConnStatus(''); }}>
              {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label} — {p.hint}</option>)}
            </select>
            {aiProvider === 'pollinations' && (
              <p className="hint" style={{ marginTop: 6 }}>Gratis via Pollinations — pakai kunci yang sama seperti tab 🎁 AI Video (daftar di enter.pollinations.ai).</p>
            )}
            {aiProvider === 'router9' && (
              <div style={{ marginTop: 8 }}>
                <p className="hint">Gratis via 9Router di laptopmu: install (`npm install -g 9router` → jalankan `9router`), hubungkan provider gratis (mis. Kiro / OpenCode Free) di dashboard, lalu salin API key + nama model ke bawah.</p>
                <label className="lbl">Endpoint 9Router</label>
                <input type="text" value={r9Endpoint} onChange={(e) => setR9Endpoint(e.target.value)} placeholder="http://localhost:20128/v1" />
                <label className="lbl" style={{ marginTop: 6 }}>API key 9Router</label>
                <div className="row">
                  <input type={showR9Key ? 'text' : 'password'} value={r9Key} onChange={(e) => setR9Key(e.target.value)} placeholder="Salin dari dashboard 9Router" />
                  <button className="ghost" style={{ flex: '0 0 auto' }} onClick={() => setShowR9Key(!showR9Key)}>{showR9Key ? '🙈' : '👁'}</button>
                </div>
                <label className="lbl" style={{ marginTop: 6 }}>Model (sesuai provider yang terhubung)</label>
                <input type="text" value={r9Model} onChange={(e) => setR9Model(e.target.value)} placeholder="kr/claude-haiku-4.5" />
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="ghost" disabled={connBusy} onClick={handleTestConnection}>{connBusy ? '⏳ Mengetes…' : '🔌 Test koneksi'}</button>
                </div>
                {connStatus && <div className={'check ' + (connOk ? 'pass' : 'fail')} style={{ marginTop: 8 }}><div><b>{connStatus}</b></div></div>}
              </div>
            )}
            <label className="lbl">Ide scene</label>
            <textarea value={aiIdea} onChange={(e) => setAiIdea(e.target.value)} placeholder="cth: kopi hangat di pagi hari untuk intro cafe" style={{ minHeight: 60 }} />
            <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 150px' }}><label className="lbl">Gaya</label>
                <select value={aiStyle} onChange={(e) => setAiStyle(e.target.value as AiSceneStyle)}>
                  {AI_STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div><label className="lbl">Durasi (dtk)</label><input type="number" style={{ width: 80 }} min={5} max={30} value={aiDur} onChange={(e) => setAiDur(Math.min(30, Math.max(5, Number(e.target.value) || 10)))} /></div>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="primary" style={{ flex: 1 }} disabled={aiBusy} onClick={handleAiGenerate}>{aiBusy ? '⏳ AI merancang…' : '✨ Generate dengan AI'}</button>
              <button className="ghost" disabled={aiBusy} onClick={handleAiOffline}>🎲 Offline (tanpa AI)</button>
            </div>
            {aiStatus && <div className={'check ' + (aiOk ? 'pass' : 'fail')} style={{ marginTop: 8 }}><div><b>{aiStatus}</b></div></div>}
          </div>
        )}
      </div>

      <div className="studio-grid">
        {/* Layer */}
        <div className="card">
          <h2>Layer ({scene.layers.length})</h2>
          <div className="chips" style={{ marginBottom: 8 }}>
            {KIND_ADD.map((k) => <button key={k} className="ghost" style={{ fontSize: 11, padding: '5px 9px' }} onClick={() => addLayer(k)}>＋ {k}</button>)}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {[...scene.layers].reverse().map((l) => (
              <div key={l.id} className={'layer-row' + (l.id === selId ? ' active' : '')} onClick={() => setSelId(l.id)}>
                <button className="ghost" style={{ padding: '2px 7px' }} onClick={(e) => { e.stopPropagation(); patchScene((s) => { const x = s.layers.find((y) => y.id === l.id); if (x) x.visible = !x.visible; return s; }); }}>{l.visible ? '👁' : '🚫'}</button>
                <span style={{ flex: 1, fontSize: 13, opacity: l.visible ? 1 : 0.5 }}><b>{l.name}</b> <span className="kbd">· {l.kind} · {l.keys.length} key</span></span>
                <button className="ghost" title="Naik" style={{ padding: '2px 7px' }} onClick={(e) => { e.stopPropagation(); patchScene((s) => { const i = s.layers.findIndex((y) => y.id === l.id); if (i < s.layers.length - 1) [s.layers[i], s.layers[i + 1]] = [s.layers[i + 1], s.layers[i]]; return s; }); }}>▲</button>
                <button className="ghost" title="Turun" style={{ padding: '2px 7px' }} onClick={(e) => { e.stopPropagation(); patchScene((s) => { const i = s.layers.findIndex((y) => y.id === l.id); if (i > 0) [s.layers[i], s.layers[i - 1]] = [s.layers[i - 1], s.layers[i]]; return s; }); }}>▼</button>
                <button className="ghost" title="Duplikat" style={{ padding: '2px 7px' }} onClick={(e) => { e.stopPropagation(); patchScene((s) => { const i = s.layers.findIndex((y) => y.id === l.id); const c = structuredClone(s.layers[i]); c.id = uid('layer'); c.name += ' copy'; s.layers.splice(i + 1, 0, c); return s; }); }}>⧉</button>
                <button className="ghost" title="Hapus" style={{ padding: '2px 7px' }} onClick={(e) => { e.stopPropagation(); patchScene((s) => { s.layers = s.layers.filter((y) => y.id !== l.id); return s; }); if (selId === l.id) setSelId(null); }}>✕</button>
              </div>
            ))}
            {scene.layers.length === 0 && <p className="hint">Belum ada layer.</p>}
          </div>
          <p className="hint" style={{ marginTop: 8 }}>Urutan atas = tampil paling depan. Klik layer untuk mengedit.</p>
        </div>

        {/* Preview + timeline */}
        <div>
          <div className="card">
            <div className={scene.bgMode === 'transparent' ? 'checker-frame' : ''}>
              <canvas ref={canvasRef} width={scene.width} height={scene.height} className="preview" />
            </div>
            <div className="preview-bar">
              <button onClick={() => setPlaying(!playing)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
              <button className="ghost" onClick={() => seek(0)}>⏮ Awal</button>
              <span className="kbd mono">{fmt(playT)} / {fmt(scene.duration)} · {scene.fps}fps</span>
            </div>
            <input type="range" min={0} max={scene.duration} step={1 / scene.fps} value={playT} onChange={(e) => { setPlaying(false); seek(Number(e.target.value)); }} />
            <div className="tl-markers">
              {keys.map((k) => (
                <button key={k.id} className={'tl-key' + (activeKey?.id === k.id ? ' active' : '')} style={{ left: `${(k.t / scene.duration) * 100}%` }} title={`${fmt(k.t)} — klik untuk lompat`} onClick={() => seek(k.t)}>◆</button>
              ))}
            </div>
            <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              {useOffline
                ? <><button className="primary" disabled={!!exporting} onClick={handleExportOffline}>{exporting === 'offline' ? `Render… ${Math.round(progress * 100)}%` : '⬇ Export MP4 · frame-exact'}</button>
                  <button className="ghost" disabled={!!exporting} onClick={handleExportRealtime}>⏺ Realtime</button></>
                : <button className="primary" disabled={!!exporting} onClick={handleExportRealtime}>{exporting === 'realtime' ? `Merekam… ${Math.round(progress * scene.duration)}s` : scene.bgMode === 'transparent' ? '⬇ Export WebM Alpha' : '⬇ Export (realtime)'}</button>}
            </div>
            {lastFile && (
              <div className="check pass"><div>✅ <b>{lastFile.name} ({lastFile.sizeMB.toFixed(1)} MB)</b>
                <span>{lastFile.engine.startsWith('offline') ? `Frame-exact ${lastFile.engine} — MP4 H.264 siap Adobe.` : lastFile.name.endsWith('.mp4') ? 'MP4 realtime — siap Adobe.' : 'WebM alpha — convert ke MOV ProRes 4444 sebelum submit.'}</span>
                <div className="row" style={{ marginTop: 8 }}>
                  <a href={lastFile.url} download={lastFile.name}><button className="primary">💾 Download</button></a>
                  <button onClick={() => downloadBlob(lastFile.blob, lastFile.name)}>↻ Unduh ulang</button>
                </div>
              </div></div>
            )}
            {isNative() && lastFile && <div style={{ marginTop: 8 }}><NativeActions
              blob={lastFile.blob}
              filename={lastFile.name}
              alpha={scene.bgMode === 'transparent'}
              seq={{ width: scene.width, height: scene.height, fps: scene.fps, duration: scene.duration, draw: (ctx, t) => drawScene(ctx, scene, t), outName: `${lastFile.name.replace(/\.[a-z0-9]+$/i, '')}_prores4444.mov` }}
            /></div>}
            {thumb && <div style={{ marginTop: 8 }}><img src={thumb} alt="" style={{ width: 200, borderRadius: 10, border: '1px solid var(--border)' }} /></div>}
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h2>Kepatuhan Adobe Stock</h2>
            {validation.checks.map((c) => (
              <div key={c.label} className={'check ' + (c.pass ? 'pass' : 'fail')}><div>{c.pass ? '✅' : '❌'} <b>{c.label}</b><span>{c.detail}</span></div></div>
            ))}
            <label className="lbl">Judul auto</label>
            <textarea value={meta.title} readOnly />
            <div className="chips">{meta.keywords.slice(0, 20).map((k) => <span key={k} className="chip">{k}</span>)}<span className="chip">+{Math.max(0, meta.keywords.length - 20)} lagi</span></div>
            <div className="row" style={{ marginTop: 8 }}>
              <button onClick={() => downloadText(metadataToCSV(meta, lastFile?.name.endsWith('.webm') ? 'webm' : 'mp4'), 'vidlust_studio_adobestock.csv', 'text/csv')}>⬇ CSV Adobe</button>
              <button className="ghost" onClick={() => navigator.clipboard.writeText(`${meta.title}\n\n${meta.description}\n\n${meta.keywords.join(', ')}`)}>📋 Salin</button>
            </div>
          </div>
        </div>

        {/* Inspector */}
        <div className="card">
          <h2>Inspector {sel ? `— ${sel.name}` : ''}</h2>
          {!sel && <p className="hint">Pilih layer di kiri (atau tambah layer baru).</p>}
          {sel && (
            <>
              <label className="lbl">Nama layer</label>
              <input type="text" value={sel.name} onChange={(e) => patchSel((l) => { l.name = e.target.value; })} />
              {sel.kind === 'text' && (<><label className="lbl">Isi teks (multi-baris ok)</label><textarea value={sel.text} onChange={(e) => patchSel((l) => { l.text = e.target.value; })} />
                <label className="lbl">Ukuran font: {(sel.fontSize * 100).toFixed(1)}% min-dimensi</label><input type="range" min={0.02} max={0.4} step={0.005} value={sel.fontSize} onChange={(e) => patchSel((l) => { l.fontSize = Number(e.target.value); })} />
                <label className="lbl">Ketebalan</label><select value={sel.fontWeight} onChange={(e) => patchSel((l) => { l.fontWeight = Number(e.target.value); })}>{[400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}</select></>)}
              {(sel.kind === 'rect' || sel.kind === 'ellipse') && (<>
                <label className="lbl">Lebar: {(sel.w * 100).toFixed(0)}%</label><input type="range" min={0.02} max={1} step={0.01} value={sel.w} onChange={(e) => patchSel((l) => { l.w = Number(e.target.value); })} />
                <label className="lbl">Tinggi: {(sel.h * 100).toFixed(0)}%</label><input type="range" min={0.02} max={1} step={0.01} value={sel.h} onChange={(e) => patchSel((l) => { l.h = Number(e.target.value); })} />
                {sel.kind === 'rect' && (<><label className="lbl">Sudut membulat</label><input type="range" min={0} max={0.5} step={0.01} value={sel.corner} onChange={(e) => patchSel((l) => { l.corner = Number(e.target.value); })} /></>)}
              </>)}
              {sel.kind === 'star' && (<>
                <label className="lbl">Ukuran: {(sel.w * 100).toFixed(0)}%</label><input type="range" min={0.05} max={0.8} step={0.01} value={sel.w} onChange={(e) => patchSel((l) => { l.w = Number(e.target.value); })} />
                <label className="lbl">Jumlah titik: {sel.points}</label><input type="range" min={3} max={12} step={1} value={sel.points} onChange={(e) => patchSel((l) => { l.points = Number(e.target.value); })} />
              </>)}
              {sel.kind === 'image' && (<>
                <label className="lbl">File gambar (PNG/JPG transparan didukung)</label>
                <input type="file" accept="image/*" onChange={(e) => onImageFile(e.target.files?.[0])} />
                <label className="lbl">Lebar: {(sel.w * 100).toFixed(0)}%</label><input type="range" min={0.05} max={1} step={0.01} value={sel.w} onChange={(e) => patchSel((l) => { l.w = Number(e.target.value); })} />
                {!sel.imageURL && <p className="hint">Belum ada gambar — upload dulu.</p>}
              </>)}
              {sel.kind === 'particles' && (<>
                <label className="lbl">Jumlah: {sel.count}</label><input type="range" min={5} max={300} step={5} value={sel.count} onChange={(e) => patchSel((l) => { l.count = Number(e.target.value); })} />
                <label className="lbl">Sebaran: {(sel.spread * 100).toFixed(0)}%</label><input type="range" min={0.05} max={0.8} step={0.01} value={sel.spread} onChange={(e) => patchSel((l) => { l.spread = Number(e.target.value); })} />
              </>)}

              <h3 style={{ marginTop: 14 }}>Transform — mengedit keyframe aktif {activeKey ? `(◆ ${fmt(activeKey.t)})` : '(belum ada key)'}</h3>
              {!activeKey && <div className="row"><button className="primary" onClick={addKeyAtPlayhead}>＋ Keyframe pertama di {fmt(playT)}</button></div>}
              {activeKey && (
                <>
                  <label className="lbl">Posisi X: {(activeKey.x * 100).toFixed(0)}%</label>
                  <input type="range" min={-0.2} max={1.2} step={0.005} value={activeKey.x} onChange={(e) => patchActiveKey({ x: Number(e.target.value) })} />
                  <label className="lbl">Posisi Y: {(activeKey.y * 100).toFixed(0)}%</label>
                  <input type="range" min={-0.2} max={1.2} step={0.005} value={activeKey.y} onChange={(e) => patchActiveKey({ y: Number(e.target.value) })} />
                  <label className="lbl">Skala: {activeKey.scale.toFixed(2)}x</label>
                  <input type="range" min={0} max={3} step={0.01} value={activeKey.scale} onChange={(e) => patchActiveKey({ scale: Number(e.target.value) })} />
                  <label className="lbl">Rotasi: {Math.round(activeKey.rotation)}°</label>
                  <input type="range" min={-180} max={180} step={1} value={activeKey.rotation} onChange={(e) => patchActiveKey({ rotation: Number(e.target.value) })} />
                  <label className="lbl">Opacity: {Math.round(activeKey.opacity * 100)}%</label>
                  <input type="range" min={0} max={1} step={0.01} value={activeKey.opacity} onChange={(e) => patchActiveKey({ opacity: Number(e.target.value) })} />
                  <div className="grid2">
                    <div><label className="lbl">Warna</label><input type="color" value={/^#[0-9a-f]{6}$/i.test(activeKey.color) ? activeKey.color : '#7c3aed'} onChange={(e) => patchActiveKey({ color: e.target.value })} /></div>
                    <div><label className="lbl">Easing ke key berikut</label><select value={activeKey.ease} onChange={(e) => patchActiveKey({ ease: e.target.value as Keyframe['ease'] })}>{EASES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></div>
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <button onClick={addKeyAtPlayhead}>＋ Key di {fmt(playT)}</button>
                    <button className="ghost" onClick={() => patchSel((l) => { l.keys = l.keys.filter((k) => k.id !== activeKey.id); })}>🗑 Hapus key</button>
                  </div>
                </>
              )}

              <h3 style={{ marginTop: 14 }}>Preset animasi (terapkan di playhead)</h3>
              <div className="row">
                <label className="lbl" style={{ flex: '0 0 auto', margin: 0 }}>Durasi</label>
                <input type="number" style={{ width: 70 }} min={0.2} max={5} step={0.1} value={entranceDur} onChange={(e) => setEntranceDur(Number(e.target.value))} />
              </div>
              <div className="chips">
                {ENTRANCES.map((p) => <button key={p.id} className="ghost" title={p.hint} style={{ fontSize: 12 }} onClick={() => applyEntrance(p.id)}>✨ {p.label}</button>)}
              </div>

              <h3 style={{ marginTop: 14 }}>Keyframe ({keys.length})</h3>
              <div style={{ display: 'grid', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                {keys.map((k) => (
                  <div key={k.id} className={'layer-row' + (activeKey?.id === k.id ? ' active' : '')} onClick={() => seek(k.t)}>
                    <span className="kbd mono">◆ {fmt(k.t)}</span>
                    <span className="kbd">{k.ease}</span>
                    <span style={{ width: 14, height: 14, borderRadius: 99, background: k.color, border: '1px solid rgba(255,255,255,0.4)' }} />
                  </div>
                ))}
              </div>
              <p className="hint" style={{ marginTop: 8 }}>Slider transform selalu mengedit keyframe aktif (◆). Klik key untuk melompat & mengaktifkannya.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
