import { drawFrame } from '../engines/render';
import { bitrateFor } from './exporter';
import { encodeFramesMP4, snapEven, supportsOfflineEncode } from './frameEncoder';
import type { ProjectSettings } from '../types';

export { supportsOfflineEncode, snapEven };

export interface OfflineResult {
  blob: Blob;
  ext: 'mp4';
  thumb: string;
  job: ProjectSettings;
  filename: string;
  frames: number;
}

/**
 * Render satu template prosedural secara OFFLINE frame-by-frame → MP4 H.264.
 * Solid background saja (H.264 tidak punya alpha channel).
 */
export async function renderJobOffline(
  job: ProjectSettings,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<OfflineResult> {
  const width = snapEven(job.width);
  const height = snapEven(job.height);
  const drawJob: ProjectSettings = { ...job, width, height };
  const r = await encodeFramesMP4(
    {
      width,
      height,
      fps: job.fps,
      duration: job.duration,
      bitrate: bitrateFor(job),
      draw: (ctx, t) => drawFrame(ctx, drawJob, t),
    },
    onProgress,
    signal,
  );
  const filename = `vidlust_${job.templateId}_${width}x${height}_${job.duration}s_${job.fps}fps_seed${job.seed}.mp4`;
  return { blob: r.blob, ext: 'mp4', thumb: r.thumb, job: drawJob, filename, frames: r.frames };
}
