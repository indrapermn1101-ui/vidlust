import type { Keyframe, Layer, LayerKind, MotionScene, Transform } from './types';
import { uid } from './types';

export function defaultTransform(): Transform {
  return { x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1, color: '#7c3aed' };
}

const KIND_LABEL: Record<LayerKind, string> = {
  text: 'Teks', rect: 'Kotak', ellipse: 'Elips', star: 'Bintang', image: 'Gambar', particles: 'Partikel',
};

export function makeLayer(kind: LayerKind, n: number): Layer {
  const base: Layer = {
    id: uid('layer'),
    name: `${KIND_LABEL[kind]} ${n}`,
    kind,
    visible: true,
    text: kind === 'text' ? 'JUDUL KEREN' : '',
    fontSize: 0.11,
    fontWeight: 800,
    w: kind === 'star' ? 0.22 : 0.4,
    h: kind === 'rect' || kind === 'ellipse' ? 0.22 : 0.4,
    corner: 0.06,
    points: 5,
    count: 60,
    spread: 0.3,
    imageURL: '',
    ease: 'easeOut',
    keys: [],
  };
  const w = defaultTransform();
  base.keys = [
    { id: uid('k'), t: 0, ...w, opacity: 0, ease: 'easeOut' as const },
    { id: uid('k'), t: 1, ...w, opacity: 1, ease: 'easeOut' as const },
  ];
  return base;
}

export interface EntrancePreset {
  id: string;
  label: string;
  hint: string;
  make: (w: Transform, at: number, dur: number) => Keyframe[];
}

// NB: ease diisi pemanggil per segmen; helper ini hanya merakit nilai.
function keys2(w: Transform, at: number, dur: number, from: Partial<Transform>, ease: Keyframe['ease']): Keyframe[] {
  return [
    { id: uid('k'), t: Math.max(0, at), ...w, ...from, ease },
    { id: uid('k'), t: Math.max(0.05, at + dur), ...w, ease: 'linear' as Keyframe['ease'] },
  ];
}

export const ENTRANCES: EntrancePreset[] = [
  { id: 'fade', label: 'Fade In', hint: 'Muncul halus', make: (w, at, dur) => keys2(w, at, dur, { opacity: 0 }, 'easeInOut') },
  { id: 'slide-left', label: 'Geser Kiri', hint: 'Masuk dari kiri', make: (w, at, dur) => keys2(w, at, dur, { x: w.x - 0.6, opacity: 0 }, 'easeOut') },
  { id: 'slide-up', label: 'Geser Atas', hint: 'Masuk dari bawah', make: (w, at, dur) => keys2(w, at, dur, { y: w.y + 0.5, opacity: 0 }, 'easeOut') },
  { id: 'pop', label: 'Pop', hint: 'Membesar memantul', make: (w, at, dur) => keys2(w, at, dur, { scale: 0, opacity: 0 }, 'backOut') },
  { id: 'spin', label: 'Spin In', hint: 'Berputar masuk', make: (w, at, dur) => keys2(w, at, dur, { scale: 0, rotation: w.rotation - 180, opacity: 0 }, 'easeOut') },
  { id: 'fade-out', label: 'Fade Out', hint: 'Untuk akhir scene', make: (w, at, dur) => [{ id: uid('k'), t: Math.max(0, at), ...w, ease: 'easeInOut' }, { id: uid('k'), t: Math.max(0.05, at + dur), ...w, opacity: 0, ease: 'linear' }] },
];

function layer(partial: Partial<Layer> & { kind: LayerKind; name: string }): Layer {
  return {
    id: uid('layer'),
    visible: true,
    text: '',
    fontSize: 0.11,
    fontWeight: 800,
    w: 0.4,
    h: 0.22,
    corner: 0.06,
    points: 5,
    count: 60,
    spread: 0.3,
    imageURL: '',
    ease: 'easeOut',
    keys: [],
    ...partial,
  };
}

function kf(t: number, w: Transform, patch: Partial<Transform & { ease: Keyframe['ease'] }> = {}): Keyframe {
  const { ease, ...rest } = patch as { ease?: Keyframe['ease'] } & Partial<Transform>;
  return { id: uid('k'), t, ...w, ...rest, ease: ease ?? 'easeOut' };
}

export function starterScenes(): { id: string; label: string; hint: string; make: () => MotionScene }[] {
  const base = {
    width: 1920, height: 1080, fps: 30, duration: 10,
    bgMode: 'solid' as const, background: '#0f0f23',
  };
  return [
    {
      id: 'kinetic-title', label: 'Judul Kinetik', hint: 'Teks pop + partikel',
      make: () => ({
        ...base,
        name: 'Judul Kinetik',
        layers: [
          layer({
            name: 'Judul', kind: 'text', text: 'JUDUL KEREN', fontSize: 0.13, fontWeight: 900,
            keys: [
              kf(0.4, { ...defaultTransform(), color: '#ffffff', scale: 0, opacity: 0 }, { ease: 'backOut' }),
              kf(1.4, { ...defaultTransform(), color: '#ffffff' }),
              kf(8.2, { ...defaultTransform(), color: '#ffffff' }),
              kf(9.2, { ...defaultTransform(), color: '#ffffff', y: 0.32, opacity: 0 }, { ease: 'easeInOut' }),
            ],
          }),
          layer({
            name: 'Subjudul', kind: 'text', text: 'SUBJUDUL VIDEO', fontSize: 0.045, fontWeight: 600,
            keys: [
              kf(1.0, { x: 0.5, y: 0.66, scale: 1, rotation: 0, opacity: 0, color: '#06b6d4' }, { ease: 'easeOut' }),
              kf(2.0, { x: 0.5, y: 0.62, scale: 1, rotation: 0, opacity: 1, color: '#06b6d4' }),
              kf(8.4, { x: 0.5, y: 0.62, scale: 1, rotation: 0, opacity: 1, color: '#06b6d4' }),
              kf(9.4, { x: 0.5, y: 0.62, scale: 1, rotation: 0, opacity: 0, color: '#06b6d4' }),
            ],
          }),
          layer({
            name: 'Sparkle', kind: 'particles',
            keys: [
              kf(0, { x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 0.9, color: '#f472b6' }),
              kf(10, { x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 0.9, color: '#7c3aed' }),
            ],
            count: 70, spread: 0.35,
          }),
        ],
      }),
    },
    {
      id: 'lower-third-pro', label: 'Lower Third Pro', hint: 'Name tag broadcast',
      make: () => ({
        ...base,
        name: 'Lower Third Pro',
        layers: [
          layer({
            name: 'Bar', kind: 'rect', w: 0.42, h: 0.13, corner: 0.03,
            keys: [
              kf(0.3, { x: -0.3, y: 0.76, scale: 1, rotation: 0, opacity: 1, color: '#12122e' }, { ease: 'easeOut' }),
              kf(1.3, { x: 0.28, y: 0.76, scale: 1, rotation: 0, opacity: 1, color: '#12122e' }),
              kf(8.0, { x: 0.28, y: 0.76, scale: 1, rotation: 0, opacity: 1, color: '#12122e' }),
              kf(9.0, { x: -0.3, y: 0.76, scale: 1, rotation: 0, opacity: 1, color: '#12122e' }, { ease: 'easeInOut' }),
            ],
          }),
          layer({
            name: 'Aksen', kind: 'rect', w: 0.018, h: 0.13, corner: 0.009,
            keys: [
              kf(0.5, { x: -0.3, y: 0.76, scale: 1, rotation: 0, opacity: 1, color: '#f472b6' }, { ease: 'easeOut' }),
              kf(1.5, { x: 0.085, y: 0.76, scale: 1, rotation: 0, opacity: 1, color: '#f472b6' }),
              kf(8.0, { x: 0.085, y: 0.76, scale: 1, rotation: 0, opacity: 1, color: '#f472b6' }),
              kf(9.0, { x: -0.3, y: 0.76, scale: 1, rotation: 0, opacity: 1, color: '#f472b6' }, { ease: 'easeInOut' }),
            ],
          }),
          layer({
            name: 'Nama', kind: 'text', text: 'NAMA ANDA', fontSize: 0.05, fontWeight: 800,
            keys: [
              kf(0.8, { x: 0.28, y: 0.745, scale: 1, rotation: 0, opacity: 0, color: '#ffffff' }, { ease: 'easeOut' }),
              kf(1.8, { x: 0.28, y: 0.745, scale: 1, rotation: 0, opacity: 1, color: '#ffffff' }),
              kf(8.0, { x: 0.28, y: 0.745, scale: 1, rotation: 0, opacity: 1, color: '#ffffff' }),
              kf(8.8, { x: 0.28, y: 0.745, scale: 1, rotation: 0, opacity: 0, color: '#ffffff' }),
            ],
          }),
          layer({
            name: 'Jabatan', kind: 'text', text: 'Jabatan / Perusahaan', fontSize: 0.03, fontWeight: 500,
            keys: [
              kf(1.0, { x: 0.28, y: 0.79, scale: 1, rotation: 0, opacity: 0, color: '#06b6d4' }, { ease: 'easeOut' }),
              kf(2.0, { x: 0.28, y: 0.79, scale: 1, rotation: 0, opacity: 1, color: '#06b6d4' }),
              kf(8.0, { x: 0.28, y: 0.79, scale: 1, rotation: 0, opacity: 1, color: '#06b6d4' }),
              kf(8.8, { x: 0.28, y: 0.79, scale: 1, rotation: 0, opacity: 0, color: '#06b6d4' }),
            ],
          }),
        ],
      }),
    },
    {
      id: 'logo-bumper', label: 'Logo Bumper', hint: 'Emblem + ring untuk intro',
      make: () => ({
        ...base,
        name: 'Logo Bumper',
        layers: [
          layer({
            name: 'Ring', kind: 'ellipse', w: 0.34, h: 0.34,
            keys: [
              kf(0.2, { x: 0.5, y: 0.5, scale: 0, rotation: -90, opacity: 0, color: '#f472b6' }, { ease: 'backOut' }),
              kf(1.4, { x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 0.9, color: '#f472b6' }),
              kf(8.6, { x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 0.9, color: '#f472b6' }),
              kf(9.6, { x: 0.5, y: 0.5, scale: 1.4, rotation: 0, opacity: 0, color: '#f472b6' }),
            ],
          }),
          layer({
            name: 'Huruf', kind: 'text', text: 'V', fontSize: 0.16, fontWeight: 900,
            keys: [
              kf(0.5, { x: 0.5, y: 0.5, scale: 0, rotation: 0, opacity: 0, color: '#ffffff' }, { ease: 'backOut' }),
              kf(1.6, { x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1, color: '#ffffff' }),
              kf(8.6, { x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1, color: '#ffffff' }),
              kf(9.6, { x: 0.5, y: 0.5, scale: 0.6, rotation: 0, opacity: 0, color: '#ffffff' }),
            ],
          }),
        ],
      }),
    },
  ];
}
