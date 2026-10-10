// Model data Motion Studio: scene = komposisi layer + keyframe, independen dari template.
export type LayerKind = 'text' | 'rect' | 'ellipse' | 'star' | 'image' | 'particles';

export type EaseId = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'backOut' | 'bounceOut';

export const EASES: { id: EaseId; label: string }[] = [
  { id: 'linear', label: 'Linear' },
  { id: 'easeIn', label: 'Ease In' },
  { id: 'easeOut', label: 'Ease Out' },
  { id: 'easeInOut', label: 'Ease In-Out' },
  { id: 'backOut', label: 'Pop (Back)' },
  { id: 'bounceOut', label: 'Bounce' },
];

export interface Keyframe {
  id: string;
  t: number; // detik
  x: number; // 0..1 dari lebar canvas
  y: number; // 0..1 dari tinggi canvas
  scale: number;
  rotation: number; // derajat
  opacity: number; // 0..1
  color: string; // hex
  ease: EaseId; // easing segmen DARI key ini ke key berikutnya
}

export type Transform = Pick<Keyframe, 'x' | 'y' | 'scale' | 'rotation' | 'opacity' | 'color'>;

export interface Layer {
  id: string;
  name: string;
  kind: LayerKind;
  visible: boolean;
  text: string;
  fontSize: number; // fraksi min(w,h), mis 0.12
  fontWeight: number;
  w: number; // fraksi min(w,h): lebar rect/ellipse/image, radius star
  h: number; // fraksi min(w,h): tinggi rect/ellipse
  corner: number; // radius sudut rect, fraksi
  points: number; // star
  count: number; // particles: jumlah
  spread: number; // particles: radius sebar, fraksi min(w,h)
  imageURL: string; // image: dataURL
  ease: EaseId; // default untuk key baru
  keys: Keyframe[];
}

export interface MotionScene {
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number; // detik
  bgMode: 'solid' | 'transparent';
  background: string;
  layers: Layer[]; // urutan bawah → atas
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
