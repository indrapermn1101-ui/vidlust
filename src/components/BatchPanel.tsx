import { useMemo, useRef, useState } from 'react';
import type { ProjectSettings } from '../types';
import { TEMPLATES } from '../engines/templates';
import { generateBatchJobs, jobsToCSV } from '../lib/batch';
import { renderJobOffscreen, type RenderResult } from '../lib/offscreenRender';
import { renderJobOffline, supportsOfflineEncode } from '../lib/offlineRender';
import { isNative, nativeSaveBlob } from '../lib/native';
import { downloadBlob, downloadText } from '../lib/exporter';

export default function BatchPanel({ base }: { base: ProjectSettings }) {
  const [count, setCount] = useState(4);
  const [varyTemplate, setVaryTemplate] = useState(true);
  const [varyPalette, setVaryPalette] = useState(true);
  const [varySeed, setVarySeed] = useState(true);
  const [selected, setSelected] = useState<string[]>(TEMPLATES.map((t) => t.id));
  const [running, setRunning] = useState(false);
  const [jobIdx, setJobIdx] = useState(0);
  const [jobProg, setJobProg] = useState(0);
  const [results, setResults] = useState<RenderResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const jobs = useMemo(
    () => generateBatchJobs(base, { count, varyTemplate, varyPalette, varySeed, templates: selected }),
    [base, count, varyTemplate, varyPalette, varySeed, selected]
  );

  const toggleTpl = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  async function run() {
    if (running || jobs.length === 0) return;
    if (selected.length === 0) { alert('Pilih minimal 1 template'); return; }
    setRunning(true);
    setResults([]);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const out: RenderResult[] = [];
    try {
      for (let i = 0; i < jobs.length; i++) {
        setJobIdx(i);
        setJobProg(0);
        // Solid + WebCodecs → offline frame-by-frame (jauh lebih cepat dari realtime).
        // Transparan → offscreen realtime agar alpha terjaga.
        const job = jobs[i];
        if (job.bgMode !== 'transparent' && supportsOfflineEncode()) {
          const r = await renderJobOffline(job, (done, total) => setJobProg(done / total), ctrl.signal);
          out.push(r);
        } else {
          const r = await renderJobOffscreen(job, (el) => setJobProg(el / job.duration), ctrl.signal);
          out.push(r);
        }
        setResults([...out]);
      }
    } catch (e) {
      if ((e as Error).message !== ' dibatalkan') alert('Batch berhenti: ' + (e as Error).message);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  return (
    <div>
      <h3>Batch render — isi portofolio sekaligus</h3>
      <p className="hint">
        Generate <b>{jobs.length} varian</b> otomatis (beda template / palet / seed).
        Job solid dirender <b>offline frame-by-frame</b> (MP4, lebih cepat dari durasi & frame-exact);
        job transparan via realtime WebM agar alpha terjaga. Hasil + CSV gabungan siap upload massal.
      </p>
      <div className="grid2">
        <div><label className="lbl">Jumlah varian (1–12)</label>
          <input type="number" min={1} max={12} value={count} onChange={(e) => setCount(Math.min(12, Math.max(1, Number(e.target.value))))} />
        </div>
        <div><label className="lbl">Durasi ikut setting utama ({base.duration}s)</label>
          <div className="kbd" style={{ paddingTop: 10 }}>Resolusi {base.width}×{base.height} · {base.fps}fps · {base.bgMode === 'transparent' ? 'ALPHA (WebM)' : 'Solid'}</div>
        </div>
      </div>
      <label style={{ fontSize: 13, display: 'flex', gap: 8, marginTop: 8 }}><input type="checkbox" checked={varyTemplate} onChange={(e) => setVaryTemplate(e.target.checked)} /> Variasikan template</label>
      <label style={{ fontSize: 13, display: 'flex', gap: 8 }}><input type="checkbox" checked={varyPalette} onChange={(e) => setVaryPalette(e.target.checked)} /> Variasikan palet warna (12 palet kurasi)</label>
      <label style={{ fontSize: 13, display: 'flex', gap: 8 }}><input type="checkbox" checked={varySeed} onChange={(e) => setVarySeed(e.target.checked)} /> Variasikan seed (komposisi acak)</label>

      <label className="lbl">Template pool</label>
      <div className="chips">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => toggleTpl(t.id)}
            className={selected.includes(t.id) ? '' : 'ghost'}
            style={{ fontSize: 12, padding: '5px 10px', opacity: selected.includes(t.id) ? 1 : 0.5 }}
          >{selected.includes(t.id) ? '✓ ' : ''}{t.name}</button>
        ))}
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        {!running
          ? <button className="primary" onClick={run}>▶ Render {jobs.length} video</button>
          : <button onClick={() => abortRef.current?.abort()}>⏹ Batalkan</button>}
        <button className="ghost" onClick={() => downloadText(jobsToCSV(jobs), 'vidlust_batch_adobestock.csv', 'text/csv')}>⬇ CSV saja</button>
      </div>

      {running && (
        <div style={{ marginTop: 8 }}>
          <div className="kbd">Job {jobIdx + 1}/{jobs.length} · {jobs[jobIdx]?.templateId} · {Math.round(jobProg * (jobs[jobIdx]?.duration ?? 0))}s</div>
          <div className="progress"><div style={{ width: `${(((jobIdx + jobProg) / jobs.length) * 100).toFixed(1)}%` }} /></div>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="row">
            <button onClick={() => downloadText(jobsToCSV(results.map((r) => r.job), results[0]?.ext ?? 'mp4'), 'vidlust_batch_adobestock.csv', 'text/csv')}>⬇ CSV gabungan ({results.length})</button>
            <button className="ghost" onClick={() => results.forEach((r) => downloadBlob(r.blob, r.filename))}>⬇ Download semua ({results.length})</button>
          </div>
          {isNative() && (
            <div className="row" style={{ marginTop: 6 }}>
              <button
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setSavedTo(null);
                  try {
                    let last = '';
                    for (const r of results) last = await nativeSaveBlob(r.filename, r.blob);
                    setSavedTo(last);
                  } catch (e) {
                    alert('Simpan batch gagal: ' + (e as Error).message);
                  } finally {
                    setSaving(false);
                  }
                }}
              >{saving ? '⏳ Menyimpan…' : `🖥 Simpan ${results.length} file ke folder`}</button>
            </div>
          )}
          {savedTo && <div className="kbd mono">✅ tersimpan di folder — terakhir: {savedTo}</div>}
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {results.map((r, i) => (
              <div key={i} className="check pass">
                <img src={r.thumb} alt="" style={{ width: 96, borderRadius: 8, border: '1px solid var(--border)' }} />
                <div style={{ flex: 1 }}>✅ <b>{r.filename}</b>
                  <span>{(r.blob.size / 1024 / 1024).toFixed(1)} MB · {r.job.templateId}</span>
                  <div><a href={URL.createObjectURL(r.blob)} download={r.filename}><button style={{ fontSize: 12, marginTop: 4 }}>💾 Download</button></a></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
