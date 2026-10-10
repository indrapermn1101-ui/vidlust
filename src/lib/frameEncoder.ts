import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

/** True bila browser mendukung render offline (Chrome/Edge modern). */
export function supportsOfflineEncode(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

/** H.264 wajib dimensi genap — jepit bila custom ganjil. */
export function snapEven(n: number): number {
  const r = Math.round(n);
  return r % 2 === 0 ? r : r - 1;
}

function avcCodec(width: number, height: number): string {
  // High profile; level 5.1 untuk >1080p, 4.0 untuk sisanya
  return width * height > 1920 * 1080 ? 'avc1.640033' : 'avc1.640028';
}

export interface FrameEncodeRequest {
  width: number;
  height: number;
  fps: number;
  duration: number;
  bitrate: number;
  /** Gambar satu frame pada detik t. Harus deterministik (murni fungsi t). */
  draw: (ctx: CanvasRenderingContext2D, timeSec: number) => void;
}

export interface FrameEncodeResult {
  blob: Blob;
  thumb: string;
  width: number;
  height: number;
  frames: number;
}

/**
 * Render frame-by-frame OFFLINE: tiap frame digambar di t = i/fps,
 * di-encode H.264 (WebCodecs) dan di-mux jadi MP4 langsung di browser.
 * Frame-exact, biasanya lebih cepat dari durasi video. Solid saja (tanpa alpha).
 */
export async function encodeFramesMP4(
  req: FrameEncodeRequest,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<FrameEncodeResult> {
  if (!supportsOfflineEncode()) {
    throw new Error('Browser tidak mendukung WebCodecs — pakai Chrome/Edge terbaru atau gunakan mode Realtime.');
  }
  const width = snapEven(req.width);
  const height = snapEven(req.height);
  const totalFrames = Math.max(1, Math.round(req.duration * req.fps));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encodeError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encodeError = e instanceof Error ? e : new Error(String(e)); },
  });

  const baseConfig = {
    codec: avcCodec(width, height),
    width,
    height,
    bitrate: req.bitrate,
    framerate: req.fps,
  };
  const support = await VideoEncoder.isConfigSupported(baseConfig).catch(() => null);
  if (support?.supported) {
    encoder.configure(baseConfig);
  } else {
    const fallback = { ...baseConfig, codec: 'avc1.420028' };
    const s2 = await VideoEncoder.isConfigSupported(fallback).catch(() => null);
    if (!s2?.supported) throw new Error('Encoder H.264 tidak didukung browser ini — gunakan mode Realtime.');
    encoder.configure(fallback);
  }

  const frameDurationUs = 1_000_000 / req.fps;
  const keyEvery = Math.max(1, Math.round(req.fps * 2));

  for (let i = 0; i < totalFrames; i++) {
    if (signal?.aborted) throw new Error(' dibatalkan');
    if (encodeError) throw encodeError;
    req.draw(ctx, i / req.fps);
    const frame = new VideoFrame(canvas, {
      timestamp: Math.round(i * frameDurationUs),
      duration: Math.round(frameDurationUs),
    });
    encoder.encode(frame, { keyFrame: i % keyEvery === 0 });
    frame.close();
    if (encoder.encodeQueueSize >= 8 || i % 5 === 0) {
      onProgress(i + 1, totalFrames);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  onProgress(totalFrames, totalFrames);
  await encoder.flush();
  if (encodeError) throw encodeError;
  muxer.finalize();
  encoder.close();

  const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
  return { blob, thumb: canvas.toDataURL('image/jpeg', 0.85), width, height, frames: totalFrames };
}
