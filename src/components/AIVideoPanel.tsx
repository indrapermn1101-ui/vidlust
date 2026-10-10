import { useState } from 'react';
import {
  POLLI_DURATIONS, POLLI_MODELS, buildPolliUrl, generateFreeVideo,
  getPolliKey, setPolliKey,
} from '../lib/pollinations';

// Panel AI Video — 100% GRATIS. Tidak ada jalur berbayar di aplikasi ini.
export default function AIVideoPanel({ idea }: { idea: string }) {
  const [prompt, setPrompt] = useState(idea);
  const [polliKey, setPolliKeyState] = useState(getPolliKey());
  const [polliModel, setPolliModel] = useState(POLLI_MODELS[0].id);
  const [polliDur, setPolliDur] = useState(5);
  const [polliAr, setPolliAr] = useState<'16:9' | '9:16'>('16:9');
  const [polliSeed, setPolliSeed] = useState(() => Math.floor(Math.random() * 999999));
  const [showToken, setShowToken] = useState(false);
  const [freeBusy, setFreeBusy] = useState(false);
  const [freeElapsed, setFreeElapsed] = useState(0);
  const [freeUrl, setFreeUrl] = useState('');
  const [freeSize, setFreeSize] = useState(0);
  const [freeStatus, setFreeStatus] = useState('');
  const [freeOk, setFreeOk] = useState(true);

  async function generateFree() {
    if (freeBusy) return;
    setFreeBusy(true);
    setFreeElapsed(0);
    setFreeUrl('');
    setFreeOk(true);
    setFreeStatus('Mengirim ke Pollinations…');
    try {
      setPolliKey(polliKey.trim());
      const { blob, url } = await generateFreeVideo(
        prompt,
        { model: polliModel, duration: polliDur, aspectRatio: polliAr, seed: polliSeed, key: polliKey },
        (s) => { setFreeElapsed(s); setFreeStatus(`⏳ Merender gratis… ${s}s (antrean bisa 1–10 menit, jangan tutup)`); },
      );
      setFreeUrl(url);
      setFreeSize(blob.size);
      setFreeStatus(`Selesai ✅ (${(blob.size / 1024 / 1024).toFixed(1)} MB). Download lalu cek lisensi & syarat Adobe.`);
    } catch (e) {
      setFreeOk(false);
      setFreeStatus((e as Error).message);
    } finally {
      setFreeBusy(false);
    }
  }

  return (
    <div>
      <h3>🎁 AI Text-to-Video — 100% Gratis</h3>
      <p className="hint">
        Tanpa kartu kredit: daftar gratis di enter.pollinations.ai untuk kunci + Pollen gratis.
        Untuk produksi tanpa batas & tanpa antre, pakai template prosedural / Motion Studio (gratis selamanya).
      </p>
      <label className="lbl">Kunci gratis Pollinations</label>
      <div className="row">
        <input type={showToken ? 'text' : 'password'} placeholder="Tempel kunci dari enter.pollinations.ai" value={polliKey} onChange={(e) => setPolliKeyState(e.target.value)} />
        <button className="ghost" style={{ flex: '0 0 auto' }} onClick={() => setShowToken(!showToken)}>{showToken ? '🙈' : '👁'}</button>
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <a href="https://enter.pollinations.ai/keys" target="_blank" rel="noreferrer" style={{ flex: 1 }}><button className="ghost" style={{ width: '100%' }}>🎁 Ambil kunci gratis</button></a>
        <button className="ghost" onClick={() => { setPolliKey(''); setPolliKeyState(''); }}>Hapus</button>
      </div>
      <div className="grid2">
        <div><label className="lbl">Model (semua gratis)</label>
          <select value={polliModel} onChange={(e) => setPolliModel(e.target.value)}>
            {POLLI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label} · {m.hint}</option>)}
          </select>
        </div>
        <div><label className="lbl">Durasi</label>
          <select value={polliDur} onChange={(e) => setPolliDur(Number(e.target.value))}>
            {POLLI_DURATIONS.map((d) => <option key={d} value={d}>{d} detik</option>)}
          </select>
        </div>
        <div><label className="lbl">Orientasi</label>
          <select value={polliAr} onChange={(e) => setPolliAr(e.target.value as '16:9' | '9:16')}>
            <option value="16:9">Landscape 16:9</option>
            <option value="9:16">Vertical 9:16</option>
          </select>
        </div>
        <div><label className="lbl">Seed ({polliSeed})</label>
          <div className="row"><input type="number" value={polliSeed} onChange={(e) => setPolliSeed(Number(e.target.value) || 0)} />
          <button className="ghost" style={{ flex: '0 0 auto' }} onClick={() => setPolliSeed(Math.floor(Math.random() * 999999))}>🎲</button></div>
        </div>
      </div>
      <label className="lbl">Prompt</label>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ minHeight: 80 }} />
      <button className="primary" style={{ width: '100%', marginTop: 10 }} disabled={freeBusy} onClick={generateFree}>
        {freeBusy ? `⏳ Merender… ${freeElapsed}s` : '🎁 Generate gratis'}
      </button>
      {freeStatus && <div className={'check ' + (freeOk ? 'pass' : 'fail')} style={{ marginTop: 8 }}><div><b>{freeStatus}</b></div></div>}
      {freeUrl && (
        <div style={{ marginTop: 10 }}>
          <video src={freeUrl} controls loop muted playsInline style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)' }} />
          <div className="row" style={{ marginTop: 8 }}>
            <a href={freeUrl} download="vidlust_ai_gratis.mp4"><button className="primary">💾 Download MP4</button></a>
            <button className="ghost" onClick={() => navigator.clipboard.writeText(buildPolliUrl(prompt, { model: polliModel, duration: polliDur, aspectRatio: polliAr, seed: polliSeed, key: '' }))}>🔗 Salin URL</button>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            ⚠️ Sebelum dijual di Adobe: pastikan footage lolos syarat teknis (5–60 dtk, min 1080p)
            dan lisensi model mengizinkan penggunaan komersial. Bila ragu, pakai prosedural.
          </p>
        </div>
      )}
    </div>
  );
}
