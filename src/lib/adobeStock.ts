import type { AdobePreset, ProjectSettings, ValidationResult } from '../types';

export const ADOBE_ALLOWED_RESOLUTIONS: [number, number][] = [
  [1920, 1080],
  [2048, 1080],
  [3840, 2160],
  [4096, 2160],
  [4096, 2304],
  [1080, 1920],
  [2160, 3840],
  [2160, 4096],
  [2304, 4096],
  [1080, 1080],
  [2160, 2160],
];

export const ADOBE_ALLOWED_FPS = [23.98, 24, 25, 29.97, 30, 50, 59.94, 60];

export const ADOBE_PRESETS: AdobePreset[] = [
  { label: 'HD Landscape 1920×1080', width: 1920, height: 1080, fps: 30, note: 'Paling aman & cepat render' },
  { label: 'Full HD Vertical 1080×1920', width: 1080, height: 1920, fps: 30, note: 'Untuk Reels / Shorts / TikTok stock' },
  { label: 'Square 1080×1080', width: 1080, height: 1080, fps: 30, note: 'Feed Instagram' },
  { label: '4K UHD 3840×2160', width: 3840, height: 2160, fps: 30, note: 'Harga jual lebih tinggi' },
  { label: '4K Vertical 2160×3840', width: 2160, height: 3840, fps: 30, note: 'Premium vertical' },
  { label: 'DCI 4K 4096×2160', width: 4096, height: 2160, fps: 24, note: 'Cinematic' },
  { label: 'Square 4K 2160×2160', width: 2160, height: 2160, fps: 30, note: 'Premium square' },
];

/** Tombol cepat resolusi sesuai permintaan umum. */
export const QUICK_RESOLUTIONS = [
  { label: 'FHD 1920×1080', width: 1920, height: 1080 },
  { label: 'Vertical 1080×1920', width: 1080, height: 1920 },
  { label: 'Square 1080×1080', width: 1080, height: 1080 },
  { label: '4K 3840×2160', width: 3840, height: 2160 },
];

/** FPS yang didukung render. */
export const QUICK_FPS = [24, 25, 30, 50, 60];

/** Durasi cepat (detik) — tetap dalam syarat Adobe 5–60. */
export const QUICK_DURATIONS = [5, 10, 12, 15, 30, 60];

export function validateForAdobe(s: ProjectSettings, estimatedMB?: number): ValidationResult {
  const checks: ValidationResult['checks'] = [];

  const resOk = ADOBE_ALLOWED_RESOLUTIONS.some(([w, h]) => w === s.width && h === s.height);
  checks.push({
    label: 'Resolusi',
    pass: resOk,
    detail: resOk
      ? `${s.width}×${s.height} didukung Adobe Stock`
      : `${s.width}×${s.height} TIDAK didukung. Pakai preset: 1920×1080, 3840×2160, 1080×1920, 1080×1080, dst.`,
  });

  const durOk = s.duration >= 5 && s.duration <= 60;
  checks.push({
    label: 'Durasi',
    pass: durOk,
    detail: durOk
      ? `${s.duration}s OK (syarat 5–60 detik)`
      : `${s.duration}s tidak valid. Adobe mewajibkan 5–60 detik.`,
  });

  const fpsOk = ADOBE_ALLOWED_FPS.includes(s.fps);
  checks.push({
    label: 'Frame rate',
    pass: fpsOk,
    detail: fpsOk
      ? `${s.fps} fps standar`
      : `${s.fps} fps tidak standar. Gunakan 24 / 25 / 30 / 60.`,
  });

  const isLoopHint = s.duration >= 10 && s.duration <= 30;
  checks.push({
    label: 'Loop seamless',
    pass: true,
    detail: isLoopHint
      ? 'Durasi ideal 10–30 detik untuk loop stock.'
      : 'Semua template loopable. Disarankan 10–30 detik agar laris.',
  });

  checks.push({
    label: 'Codec & format',
    pass: true,
    detail: s.bgMode === 'transparent'
      ? 'Mode ALPHA: di app desktop gunakan tombol "🎞 PNG seq → ProRes 4444" (alpha dijamin asli). WebM browser SERING mengopakkan alpha — selalu cek sebelum submit.'
      : 'Export MP4 (H.264 bila didukung browser) / WebM. Tanpa audio = lolos syarat audio.',
  });

  checks.push({
    label: 'Background',
    pass: true,
    detail: s.bgMode === 'transparent'
      ? 'Transparan (alpha) — cocok dijual sebagai overlay (confetti, doodle, partikel). Tambahkan keyword “transparent background, alpha channel”.'
      : 'Solid — cocok sebagai background penuh, langsung submit MP4.',
  });

  if (estimatedMB !== undefined) {
    checks.push({
      label: 'Ukuran file',
      pass: estimatedMB < 3900,
      detail: `Estimasi ${estimatedMB.toFixed(1)} MB (maks 3900 MB).`,
    });
  }

  checks.push({
    label: 'Lisensi komersial',
    pass: true,
    detail: 'Procedural 100% milikmu — tanpa model/property release. Jika pakai AI, centang “Created using generative AI”.',
  });

  return { ok: checks.every((c) => c.pass), checks };
}

const CATEGORY_MAP: Record<string, string> = {
  'geo-loop': 'Abstract',
  'particle-flow': 'Abstract',
  'gradient-waves': 'Backgrounds',
  'blob-character': 'Animals / Cute',
  'infographic-bars': 'Business',
  'neon-grid': 'Abstract',
  'confetti-burst': 'Holidays',
  'aurora': 'Nature',
  'doodle-lines': 'Education',
  'logo-reveal': 'Business',
  'lower-third': 'Business',
  'kinetic-text': 'Social Media',
  'motion-studio': 'Graphics',
  'flow-field': 'Abstract',
  'mesh-gradient': 'Backgrounds',
  'tech-hud': 'Technology',
  'donut-stats': 'Business',
  'pop-elements': 'Graphics',
  'light-dust': 'Overlays',
};

export function generateMetadata(s: ProjectSettings, templateName: string) {
  const alpha = s.bgMode === 'transparent';
  const orientation = s.width > s.height ? 'horizontal' : s.height > s.width ? 'vertical video' : 'square';
  const resLabel = s.width >= 3800 ? '4k' : 'hd';
  const baseTitle = s.text.trim() && s.showText
    ? `${templateName} — ${s.text.trim()}`
    : `Seamless looping ${templateName.toLowerCase()} motion background`;

  const title = `${baseTitle}${alpha ? ' with transparent background' : ''}, ${orientation} ${resLabel} animation (${s.duration}s loop)`.slice(0, 200);

  const description =
    `Seamless looping animated illustration${alpha ? ' overlay with transparent (alpha channel) background' : ' background'}, ${templateName.toLowerCase()}. ` +
    `Resolution ${s.width}x${s.height}, ${s.fps}fps, duration ${s.duration} seconds. ` +
    (alpha
      ? `Alpha channel transparency — perfect as overlay for videos, presentations, and social media. `
      : `Perfect for presentations, websites, social media, and commercial video projects. `) +
    `No watermark, royalty-free ready for Adobe Stock. Created procedurally, safe for commercial use.`;

  const core = [
    'loop', 'seamless', 'motion graphics', 'animated background', 'video',
    templateName.toLowerCase(), orientation, resLabel, 'royalty free',
    'abstract', 'illustration', 'stock footage', '4k animation',
  ];
  if (alpha) core.push('transparent background', 'alpha channel', 'overlay', 'isolated');
  if (s.height > s.width) core.push('vertical', 'reels', 'tiktok', 'shorts');
  if (s.text.trim() && s.showText) core.push(...s.text.toLowerCase().split(/\s+/).slice(0, 5));

  const extraByTemplate: Record<string, string[]> = {
    'geo-loop': ['geometric', 'shapes', 'corporate', 'tech', 'minimal', 'presentation'],
    'particle-flow': ['particles', 'bokeh', 'network', 'celebration', 'ai technology', 'glitter'],
    'gradient-waves': ['gradient', 'waves', 'calm', 'wellness', 'finance', 'minimal background'],
    'blob-character': ['cute character', 'cartoon', 'kids', 'playful', 'mascot', 'children'],
    'infographic-bars': ['business', 'chart', 'data', 'growth', 'finance', 'infographic'],
    'neon-grid': ['neon', 'retro', 'synthwave', 'cyberpunk', '80s', 'gaming'],
    'confetti-burst': ['confetti', 'celebration', 'birthday', 'party', 'success', 'festive'],
    'aurora': ['aurora', 'northern lights', 'night sky', 'nature', 'stars', 'travel'],
    'doodle-lines': ['doodle', 'hand drawn', 'education', 'sketch', 'whiteboard', 'explainer'],
    'logo-reveal': ['logo reveal', 'logo intro', 'branding', 'emblem', 'opener', 'corporate intro'],
    'lower-third': ['lower third', 'name tag', 'broadcast', 'news', 'interview', 'title card'],
    'kinetic-text': ['kinetic typography', 'text animation', 'lyrics', 'promo', 'words', 'social media'],
    'motion-studio': ['custom motion graphics', 'title', 'opener', 'broadcast', 'animated text', 'video overlay'],
    'flow-field': ['flow field', 'generative art', 'particle trails', 'algorithmic lines', 'wind flow', 'data flow'],
    'mesh-gradient': ['mesh gradient', 'liquid gradient', 'gradient blobs', 'soft background', 'modern', 'pastel'],
    'tech-hud': ['hud', 'dashboard interface', 'sci-fi', 'scanning', 'futuristic technology', 'data screen'],
    'donut-stats': ['donut chart', 'statistics', 'percentage', 'finance dashboard', 'business data', 'infographic'],
    'pop-elements': ['animated elements', 'arrow', 'checkmark', 'shapes pack', 'overlay elements', 'mograph'],
    'light-dust': ['light dust', 'dust particles', 'light overlay', 'atmosphere', 'bokeh overlay', 'cinematic'],
  };
  const keywords = Array.from(new Set([...core, ...(extraByTemplate[s.templateId] ?? [])])).slice(0, 49);

  return {
    title,
    description,
    keywords,
    category: CATEGORY_MAP[s.templateId] ?? 'Abstract',
    filenameBase: `vidlust_${s.templateId}_${s.width}x${s.height}_${s.duration}s${alpha ? '_alpha' : ''}`,
  };
}

export function metadataToCSV(meta: ReturnType<typeof generateMetadata>, ext = 'mp4') {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = 'Filename,Title,Description,Keywords,Category';
  const row = [
    esc(`${meta.filenameBase}.${ext}`),
    esc(meta.title),
    esc(meta.description),
    esc(meta.keywords.join(', ')),
    esc(meta.category),
  ].join(',');
  return `${header}\n${row}\n`;
}
