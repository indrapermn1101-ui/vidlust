import { useEffect, useState } from 'react';
import {
  nativeChooseDir, nativeConvertMp4, nativeConvertProRes, nativeInfo,
  nativeMakeGif, nativeOpenDir, nativeSaveBlob, type NativeInfo,
} from '../lib/native';
import { exportPNGSequenceToProRes, type SeqSpec } from '../lib/seqExport';

/**
 * Panel aksi native — hanya dirender bila window.vidlustNative ada.
 * Web/localhost tidak terpengaruh sama sekali.
 */
export default function NativeActions({ blob, filename, alpha, seq }: { blob: Blob; filename: string; alpha: boolean; seq?: (SeqSpec & { outName: string }) | null }) {
  const [info, setInfo] = useState<NativeInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function refresh() {
    try { setInfo(await nativeInfo()); } catch { /* abaikan */ }
  }
  useEffect(() => { void refresh(); }, []);

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(label);
    setDone(null);
    try {
      const p = await fn();
      setDone(p);
      await refresh();
    } catch (e) {
      alert(label + ' gagal: ' + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="check pass" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div>🖥 <b>Aksi Desktop (ffmpeg lokal)</b>
        <span>Folder: {info?.outputDir ?? '…'} {info && !info.ffmpeg && '· ⚠️ ffmpeg tidak terdeteksi'}</span>
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button disabled={!!busy} onClick={() => run('Simpan ke folder', () => nativeSaveBlob(filename, blob))}>💾 Simpan file</button>
        {seq && (
          <button
            disabled={!!busy}
            title="Render ulang frame-by-frame ke PNG lalu rakit ProRes — alpha dijamin asli (WebM browser sering mengopakkan alpha)"
            onClick={() => run('PNG seq → ProRes', async () => {
              setBusy('Render PNG…');
              return exportPNGSequenceToProRes(seq, seq.outName, (d, t) => setBusy(`PNG ${d}/${t}`));
            })}
          >🎞 PNG seq → ProRes 4444{alpha ? ' (alpha asli)' : ''}</button>
        )}
        {(blob.type.includes('webm') || filename.endsWith('.webm')) && (
          <button disabled={!!busy} onClick={() => run('Convert MP4', () => nativeConvertMp4(filename, blob))}>🎞 → MP4 H.264</button>
        )}
        {alpha && (
          <button disabled={!!busy} onClick={() => run('Convert ProRes', () => nativeConvertProRes(filename, blob))}>✨ → MOV ProRes 4444</button>
        )}
        <button disabled={!!busy} onClick={() => run('Buat GIF', () => nativeMakeGif(filename, blob))}>🖼 GIF preview</button>
      </div>
      <div className="row">
        <button className="ghost" disabled={!!busy} onClick={() => run('Ganti folder', async () => nativeChooseDir())}>📁 Ganti folder</button>
        <button className="ghost" disabled={!!busy} onClick={() => { void nativeOpenDir(); }}>📂 Buka folder</button>
      </div>
      {busy && <div className="kbd">⏳ {busy}… (ffmpeg bekerja, tunggu sampai selesai)</div>}
      {done && <div className="kbd mono">✅ {done}</div>}
    </div>
  );
}
