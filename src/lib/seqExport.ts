// Export PNG sequence → ProRes 4444 via ffmpeg desktop.
// Satu-satunya jalur yang MENJAMIN alpha asli (MediaRecorder VP9 browser
// seringkali mengopakkan alpha → yuv420p). Hanya tersedia di app desktop.
import { nativeSeqAbort, nativeSeqBegin, nativeSeqFinish, nativeSeqFrame } from './native';

export interface SeqSpec {
  width: number;
  height: number;
  fps: number;
  duration: number;
  /** Gambar 1 frame pada detik t. Harus deterministik (murni fungsi t). */
  draw: (ctx: CanvasRenderingContext2D, timeSec: number) => void;
}

function toBlobPNG(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob PNG gagal'))), 'image/png');
  });
}

/**
 * Render tiap frame ke PNG → kirim ke main process → ffmpeg merakit
 * MOV ProRes 4444 (yuva). Mengembalikan path file hasil.
 */
export async function exportPNGSequenceToProRes(
  spec: SeqSpec,
  outName: string,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const total = Math.max(1, Math.round(spec.duration * spec.fps));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(spec.width);
  canvas.height = Math.round(spec.height);
  const ctx = canvas.getContext('2d')!; // alpha default true → transparansi terjaga

  const jobId = await nativeSeqBegin();
  try {
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new Error(' dibatalkan');
      spec.draw(ctx, i / spec.fps);
      const blob = await toBlobPNG(canvas);
      await nativeSeqFrame(jobId, i, await blob.arrayBuffer());
      onProgress(i + 1, total);
      // napas UI tiap beberapa frame
      if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    onProgress(total, total);
    return await nativeSeqFinish(jobId, spec.fps, outName);
  } catch (e) {
    try { await nativeSeqAbort(jobId); } catch { /* abaikan */ }
    throw e;
  }
}
