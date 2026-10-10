import type { Keyframe, Layer, MotionScene } from './types';
import { uid } from './types';

const LS_SCENES = 'vidlust:scenes:v1';

export function defaultScene(): MotionScene {
  return {
    name: 'Scene Baru',
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 10,
    bgMode: 'solid',
    background: '#0f0f23',
    layers: [],
  };
}

export function normalizeScene(raw: Partial<MotionScene>): MotionScene {
  const d = defaultScene();
  return {
    ...d,
    ...raw,
    layers: Array.isArray(raw.layers)
      ? raw.layers.map((l) => {
          const base = {
            id: uid('layer'),
            name: 'Layer',
            kind: 'text',
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
          } as const;
          const nl = { ...base, ...(l as Partial<Layer>) };
          return {
            ...nl,
            id: nl.id ?? uid('layer'),
            keys: (Array.isArray(nl.keys) ? nl.keys : []).map((k: Keyframe) => ({
              id: k.id ?? uid('k'),
              t: Number(k.t) || 0,
              x: k.x ?? 0.5,
              y: k.y ?? 0.5,
              scale: k.scale ?? 1,
              rotation: k.rotation ?? 0,
              opacity: k.opacity ?? 1,
              color: k.color ?? '#ffffff',
              ease: k.ease ?? 'linear',
            })),
          } as MotionScene['layers'][number];
        })
      : [],
  } as MotionScene;
}

export interface SavedScene {
  name: string;
  updatedAt: number;
  scene: MotionScene;
}

export function listScenes(): SavedScene[] {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_SCENES) ?? '[]') as SavedScene[];
    return arr.map((s) => ({ ...s, scene: normalizeScene(s.scene) }));
  } catch {
    return [];
  }
}

export function saveScene(name: string, scene: MotionScene) {
  const clean: MotionScene = { ...normalizeScene(scene), name };
  // Batasi: dataURL gambar besar bisa melebihi kuota localStorage
  try {
    const all = listScenes().filter((s) => s.name !== name);
    all.unshift({ name, updatedAt: Date.now(), scene: clean });
    localStorage.setItem(LS_SCENES, JSON.stringify(all.slice(0, 30)));
  } catch {
    alert('Gagal menyimpan: scene terlalu besar (mungkin gambar beresolusi tinggi). Coba gambar yang lebih kecil.');
  }
}

export function deleteScene(name: string) {
  localStorage.setItem(LS_SCENES, JSON.stringify(listScenes().filter((s) => s.name !== name)));
}
