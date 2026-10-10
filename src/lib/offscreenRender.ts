import { drawFrame } from '../engines/render';
import { bitrateFor, pickSupportedMime } from './exporter';
import type { ProjectSettings } from '../types';

export interface RenderResult {
  blob: Blob;
  ext: string;
  thumb: string;
  job: ProjectSettings;
  filename: string;
}

/**
 * Render satu job di canvas tersembunyi (offscreen) secara realtime.
 * Tidak mengganggu preview utama.
 */
export async function renderJobOffscreen(
  job: ProjectSettings,
  onProgress: (elapsed: number) => void,
  signal?: AbortSignal,
): Promise<RenderResult> {
  const canvas = document.createElement('canvas');
  canvas.width = job.width;
  canvas.height = job.height;
  // harus menempel ke DOM agar captureStream stabil di sebagian browser
  canvas.style.position = 'fixed';
  canvas.style.left = '-10000px';
  canvas.style.top = '0';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);

  try {
    const ctx = canvas.getContext('2d')!;
    const alpha = job.bgMode === 'transparent';
    const picked = pickSupportedMime(alpha);
    const stream = canvas.captureStream(job.fps);
    const rec = new MediaRecorder(stream, {
      mimeType: picked.mime || undefined,
      videoBitsPerSecond: bitrateFor(job),
    });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    const stopped = new Promise<void>((res) => { rec.onstop = () => res(); });
    rec.start(250);

    const start = performance.now();
    const totalFrames = Math.round(job.duration * job.fps);

    await new Promise<void>((resolve, reject) => {
      let frame = 0;
      const step = () => {
        if (signal?.aborted) {
          reject(new Error(' dibatalkan'));
          return;
        }
        const el = (performance.now() - start) / 1000;
        const t = Math.min(el, job.duration);
        drawFrame(ctx, job, t);
        frame++;
        onProgress(t);
        if (el >= job.duration) resolve();
        else {
          // jaga sinkron dengan fps target
          const nextAt = start + ((frame + 1) / job.fps) * 1000;
          const wait = Math.max(0, nextAt - performance.now());
          setTimeout(() => requestAnimationFrame(step), wait);
        }
      };
      requestAnimationFrame(step);
      // cegah unused var warning
      void totalFrames;
    });

    // beri jeda kecil agar frame terakhir masuk
    await new Promise((r) => setTimeout(r, 300));
    rec.stop();
    await stopped;

    const type = picked.mime.split(';')[0] || 'video/webm';
    const blob = new Blob(chunks, { type });
    const thumb = alpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85);
    const alphaTag = alpha ? '_alpha' : '';
    const filename = `vidlust_${job.templateId}_${job.width}x${job.height}_${job.duration}s_seed${job.seed}${alphaTag}.${picked.ext}`;
    return { blob, ext: picked.ext, thumb, job, filename };
  } finally {
    canvas.remove();
  }
}
