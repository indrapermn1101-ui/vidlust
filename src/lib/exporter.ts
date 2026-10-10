import type { ProjectSettings } from '../types';

const MP4_CANDIDATES = [
  { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
  { mime: 'video/mp4', ext: 'mp4' },
];

const WEBM_CANDIDATES = [
  { mime: 'video/webm;codecs=vp9', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' },
];

/**
 * H.264/MP4 TIDAK mendukung alpha channel.
 * Mode transparan selalu diutamakan ke WebM (VP9/VP8 mendukung alpha).
 */
export function pickSupportedMime(preferAlpha = false): { mime: string; ext: string } {
  const ordered = preferAlpha
    ? [...WEBM_CANDIDATES, ...MP4_CANDIDATES]
    : [...MP4_CANDIDATES, ...WEBM_CANDIDATES];
  for (const c of ordered) {
    try {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) return c;
    } catch { /* ignore */ }
  }
  return { mime: '', ext: 'webm' };
}

export function bitrateFor(s: ProjectSettings): number {
  const px = s.width * s.height;
  // ~0.12 bit per pixel per frame, clamped
  const br = Math.round(px * s.fps * 0.12);
  return Math.min(80_000_000, Math.max(4_000_000, br));
}

export async function recordCanvas(
  canvas: HTMLCanvasElement,
  s: ProjectSettings,
  onProgress: (elapsed: number) => void,
): Promise<{ blob: Blob; ext: string; mime: string }> {
  const alpha = s.bgMode === 'transparent';
  const picked = pickSupportedMime(alpha);
  const stream = canvas.captureStream(s.fps);
  const rec = new MediaRecorder(stream, {
    mimeType: picked.mime || undefined,
    videoBitsPerSecond: bitrateFor(s),
  });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const done = new Promise<void>((resolve) => { rec.onstop = () => resolve(); });
  rec.start(250);

  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const el = (performance.now() - start) / 1000;
      onProgress(Math.min(el, s.duration));
      if (el >= s.duration) resolve();
      else requestAnimationFrame(tick);
    };
    tick();
  });

  rec.stop();
  await done;
  const type = picked.mime.split(';')[0] || 'video/webm';
  return { blob: new Blob(chunks, { type }), ext: picked.ext, mime: type };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(text: string, filename: string, mime = 'text/plain') {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export function captureThumbnail(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** Thumbnail PNG agar alpha terlihat (JPEG tidak menyimpan transparansi). */
export function captureThumbnailPNG(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}
