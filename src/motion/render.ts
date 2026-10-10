import type { Keyframe, Layer, MotionScene, Transform } from './types';
import { easeFns, lerpColor } from './ease';

function sortedKeys(layer: Layer): Keyframe[] {
  return [...layer.keys].sort((a, b) => a.t - b.t);
}

/** Interpolasi seluruh properti animatable pada detik t. */
export function evalLayer(layer: Layer, t: number): Transform {
  const keys = sortedKeys(layer);
  const fallback: Transform = { x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1, color: '#ffffff' };
  if (keys.length === 0) return fallback;
  if (t <= keys[0].t || keys.length === 1) {
    const k = keys[0];
    return { x: k.x, y: k.y, scale: k.scale, rotation: k.rotation, opacity: k.opacity, color: k.color };
  }
  const last = keys[keys.length - 1];
  if (t >= last.t) {
    return { x: last.x, y: last.y, scale: last.scale, rotation: last.rotation, opacity: last.opacity, color: last.color };
  }
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= t) i++;
  const k0 = keys[i];
  const k1 = keys[i + 1];
  const span = Math.max(1e-6, k1.t - k0.t);
  const u = easeFns[k0.ease]((t - k0.t) / span);
  const L = (a: number, b: number) => a + (b - a) * u;
  return {
    x: L(k0.x, k1.x),
    y: L(k0.y, k1.y),
    scale: L(k0.scale, k1.scale),
    rotation: L(k0.rotation, k1.rotation),
    opacity: L(k0.opacity, k1.opacity),
    color: lerpColor(k0.color, k1.color, u),
  };
}

// Cache elemen image per URL agar preview tidak flicker
const imgCache = new Map<string, HTMLImageElement>();
export function getImage(url: string): HTMLImageElement | null {
  if (!url) return null;
  let img = imgCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    imgCache.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}
export function preloadImage(url: string) {
  getImage(url);
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function hashN(seed: string, i: number): number {
  let h = 2166136261;
  const s = `${seed}:${i}`;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function drawParticles(
  ctx: CanvasRenderingContext2D, layer: Layer, p: Transform,
  min: number, duration: number, t: number,
) {
  const n = Math.max(1, Math.round(layer.count));
  for (let i = 0; i < n; i++) {
    const r1 = hashN(layer.id + 'a', i);
    const r2 = hashN(layer.id + 'b', i);
    const r3 = hashN(layer.id + 'c', i);
    const age = (((t / duration) + r1) % 1 + 1) % 1; // 0..1, loop mengikuti durasi scene
    const ang = r2 * Math.PI * 2 + age * (1 + r3 * 2);
    const dist = age * layer.spread * min;
    const size = (2 + r3 * 7) * (min / 900) * (1 - age * 0.7);
    ctx.save();
    ctx.globalAlpha = p.opacity * (1 - age);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(Math.cos(ang) * dist, Math.sin(ang) * dist, Math.max(0.5, size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Gambar seluruh scene pada detik t. Deterministik → aman untuk export frame-by-frame. */
export function drawScene(ctx: CanvasRenderingContext2D, scene: MotionScene, t: number) {
  const w = scene.width;
  const h = scene.height;
  const min = Math.min(w, h);
  ctx.clearRect(0, 0, w, h);
  if (scene.bgMode !== 'transparent') {
    ctx.fillStyle = scene.background;
    ctx.fillRect(0, 0, w, h);
  }
  for (const layer of scene.layers) {
    if (!layer.visible) continue;
    const p = evalLayer(layer, t);
    if (p.opacity <= 0.003 || p.scale <= 0.001) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
    ctx.translate(p.x * w, p.y * h);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.scale(p.scale, p.scale);
    ctx.fillStyle = p.color;
    switch (layer.kind) {
      case 'text': {
        ctx.font = `${layer.fontWeight} ${Math.max(4, layer.fontSize * min)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = (layer.text || 'Teks').split('\n').slice(0, 5);
        const lh = Math.max(4, layer.fontSize * min) * 1.2;
        lines.forEach((ln, i) => ctx.fillText(ln, 0, (i - (lines.length - 1) / 2) * lh));
        break;
      }
      case 'rect': {
        const bw = Math.max(2, layer.w * min);
        const bh = Math.max(2, layer.h * min);
        rr(ctx, -bw / 2, -bh / 2, bw, bh, layer.corner * min);
        ctx.fill();
        break;
      }
      case 'ellipse': {
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1, (layer.w * min) / 2), Math.max(1, (layer.h * min) / 2), 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'star': {
        const R = Math.max(2, (layer.w * min) / 2);
        const inner = R * 0.45;
        const pts = Math.max(3, Math.round(layer.points));
        ctx.beginPath();
        for (let k = 0; k < pts * 2; k++) {
          const rad = k % 2 === 0 ? R : inner;
          const a = (k / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
          const px = Math.cos(a) * rad;
          const py = Math.sin(a) * rad;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'image': {
        const img = getImage(layer.imageURL);
        if (img) {
          const dw = Math.max(2, layer.w * min);
          const dh = dw * (img.naturalHeight / Math.max(1, img.naturalWidth));
          ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        }
        break;
      }
      case 'particles': {
        drawParticles(ctx, layer, p, min, Math.max(0.5, scene.duration), t);
        break;
      }
    }
    ctx.restore();
  }
}
