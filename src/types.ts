export interface ProjectSettings {
  templateId: string;
  width: number;
  height: number;
  fps: number;
  duration: number; // detik, 5-60
  primary: string;
  secondary: string;
  background: string;
  accent: string;
  speed: number; // 0.2 - 3
  density: number; // 0.3 - 2
  text: string;
  showText: boolean;
  seed: number;
  loop: boolean;
  bgMode: 'solid' | 'transparent'; // transparent = alpha channel (overlay stock)
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  category: string; // kategori Adobe Stock
  tags: string[];
  bestFor: string;
  loopable: boolean;
  overlay?: boolean; // true = dirancang sebagai overlay transparan (auto sarankan alpha)
}

export interface AdobePreset {
  label: string;
  width: number;
  height: number;
  fps: number;
  note: string;
}

export interface ValidationResult {
  ok: boolean;
  checks: { label: string; pass: boolean; detail: string }[];
}
