import { drawScene } from './render';
import { encodeFramesMP4 } from '../lib/frameEncoder';
import type { MotionScene } from './types';

export interface SceneOfflineResult {
  blob: Blob;
  ext: 'mp4';
  thumb: string;
  filename: string;
  frames: number;
  width: number;
  height: number;
}

function bitrateForScene(s: MotionScene): number {
  const br = Math.round(s.width * s.height * s.fps * 0.12);
  return Math.min(80_000_000, Math.max(4_000_000, br));
}

/** Export scene studio → MP4 H.264 frame-by-frame (solid saja). */
export async function renderSceneOffline(
  scene: MotionScene,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<SceneOfflineResult> {
  const r = await encodeFramesMP4(
    {
      width: scene.width,
      height: scene.height,
      fps: scene.fps,
      duration: scene.duration,
      bitrate: bitrateForScene(scene),
      draw: (ctx, t) => drawScene(ctx, scene, t),
    },
    onProgress,
    signal,
  );
  const safe = (scene.name || 'scene').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'scene';
  const filename = `vidlust_studio_${safe}_${r.width}x${r.height}_${scene.duration}s_${scene.fps}fps.mp4`;
  return { blob: r.blob, ext: 'mp4', thumb: r.thumb, filename, frames: r.frames, width: r.width, height: r.height };
}
