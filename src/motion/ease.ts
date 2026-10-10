import type { EaseId } from './types';

export const easeFns: Record<EaseId, (x: number) => number> = {
  linear: (x) => x,
  easeIn: (x) => x * x * x,
  easeOut: (x) => 1 - Math.pow(1 - x, 3),
  easeInOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  backOut: (x) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  },
  bounceOut: (x) => {
    if (x < 1 / 2.75) return 7.5625 * x * x;
    if (x < 2 / 2.75) return 7.5625 * (x -= 1.5 / 2.75) * x + 0.75;
    if (x < 2.5 / 2.75) return 7.5625 * (x -= 2.25 / 2.75) * x + 0.9375;
    return 7.5625 * (x -= 2.625 / 2.75) * x + 0.984375;
  },
};

export function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const n = c.length === 3 ? c.split('').map((ch) => ch + ch).join('') : c;
  const v = parseInt(n, 16);
  if (Number.isNaN(v)) return [255, 255, 255];
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function lerpColor(a: string, b: string, u: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const m = ca.map((v, i) => Math.round(v + (cb[i] - v) * u));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}
