// Generator scene Motion Studio dari ide bahasa alami.
// - Jalur AI: Pollinations text API (OpenAI-compatible, kunci gratis yang sama
//   seperti tab AI Video). LLM hanya menghasilkan DATA JSON, bukan kode.
// - Jalur offline: remix preset starter berdasar kata kunci (tanpa internet/API).
// Output SELALU MotionScene tervalidasi → langsung bisa diedit & di-export.
import { starterScenes } from '../motion/presets';
import { normalizeScene } from '../motion/storage';
import { uid, type EaseId, type Keyframe, type Layer, type LayerKind, type MotionScene } from '../motion/types';
import { getPolliKey } from './pollinations';

export const AI_SCENE_ENDPOINT = 'https://text.pollinations.ai/openai';
export const AI_SCENE_MODEL = 'openai';
const AI_TIMEOUT_MS = 120000;
const MAX_LAYERS = 6;
const MAX_KEYS = 6;

export type AiSceneStyle = 'auto' | 'corporate' | 'neon' | 'pastel' | 'broadcast';

export const AI_STYLES: { id: AiSceneStyle; label: string }[] = [
  { id: 'auto', label: 'Otomatis (AI pilih)' },
  { id: 'corporate', label: 'Corporate minimal' },
  { id: 'neon', label: 'Neon synthwave' },
  { id: 'pastel', label: 'Pastel cute' },
  { id: 'broadcast', label: 'Broadcast / lower third' },
];

// ---------- Provider LLM (Pollinations cloud / 9Router lokal) ----------

export type AiProviderId = 'pollinations' | 'router9';

export const AI_PROVIDERS: { id: AiProviderId; label: string; hint: string }[] = [
  { id: 'pollinations', label: 'Pollinations (cloud, gratis)', hint: 'Kunci dari enter.pollinations.ai' },
  { id: 'router9', label: '9Router lokal (gratis)', hint: 'Butuh install 9Router + provider gratis' },
];

const LS_AI_PROVIDER = 'vidlust:ai_provider';
const LS_9R_ENDPOINT = 'vidlust:9router_endpoint';
const LS_9R_KEY = 'vidlust:9router_key';
const LS_9R_MODEL = 'vidlust:9router_model';

export const DEFAULT_9R_ENDPOINT = 'http://localhost:20128/v1';
export const DEFAULT_9R_MODEL = 'kr/claude-haiku-4.5';
const POLLI_MODELS_URL = 'https://text.pollinations.ai/models';

function lsGet(k: string): string {
  try { return localStorage.getItem(k) ?? ''; } catch { return ''; }
}

function lsSet(k: string, v: string) {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch { /* abaikan */ }
}

export function getAiProvider(): AiProviderId {
  return lsGet(LS_AI_PROVIDER) === 'router9' ? 'router9' : 'pollinations';
}

export function setAiProvider(p: AiProviderId) {
  lsSet(LS_AI_PROVIDER, p === 'router9' ? 'router9' : '');
}

export function get9rEndpoint(): string {
  return lsGet(LS_9R_ENDPOINT) || DEFAULT_9R_ENDPOINT;
}

export function set9rEndpoint(v: string) {
  lsSet(LS_9R_ENDPOINT, v.trim());
}

export function get9rKey(): string {
  return lsGet(LS_9R_KEY);
}

export function set9rKey(v: string) {
  lsSet(LS_9R_KEY, v.trim());
}

export function get9rModel(): string {
  return lsGet(LS_9R_MODEL) || DEFAULT_9R_MODEL;
}

export function set9rModel(v: string) {
  lsSet(LS_9R_MODEL, v.trim());
}

/** Gabung base URL + path tanpa garis miring ganda. */
export function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

export interface AiSceneOptions {
  style?: AiSceneStyle;
  duration?: number; // detik, dijepit 5..30
}

export interface AiSceneResult {
  scene: MotionScene;
  warnings: string[];
  offline: boolean;
}

const KINDS: LayerKind[] = ['text', 'rect', 'ellipse', 'star', 'particles'];
const EASE_IDS: EaseId[] = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'backOut', 'bounceOut'];
const WEIGHTS = [400, 500, 600, 700, 800, 900];

function num(v: unknown, min: number, max: number, def: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : def;
  return Math.min(max, Math.max(min, n));
}

function str(v: unknown, def: string, maxLen: number): string {
  return (typeof v === 'string' && v.trim() ? v.trim() : def).slice(0, maxLen);
}

function hex(v: unknown, def: string): string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim() : def;
}

function snapWeight(v: unknown): number {
  const n = num(v, 100, 900, 800);
  return WEIGHTS.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
}

const STYLE_HINT: Record<AiSceneStyle, string> = {
  auto: 'choose a cohesive palette that fits the idea',
  corporate: 'minimal corporate style: deep navy background, white + sky-blue accents',
  neon: 'neon synthwave style: very dark background, hot-pink + cyan accents',
  pastel: 'cute pastel style: soft light background, dark readable text, pink + mint accents',
  broadcast: 'broadcast lower-third style: dark background, bottom bar + strong accent, name + role texts',
};

// Contoh mini (few-shot) agar LLM paham kontrak JSON. Durasi contoh = 10 dtk.
const EXAMPLE_JSON = `{
  "name": "Kopi Pagi",
  "bgMode": "solid",
  "background": "#1a0f0a",
  "layers": [
    {"id":"l1","name":"Judul","kind":"text","visible":true,"text":"KOPI PAGI","fontSize":0.13,"fontWeight":900,
     "keys":[
       {"id":"k1","t":0.4,"x":0.5,"y":0.44,"scale":0,"rotation":0,"opacity":0,"color":"#ffffff","ease":"backOut"},
       {"id":"k2","t":1.4,"x":0.5,"y":0.44,"scale":1,"rotation":0,"opacity":1,"color":"#ffffff","ease":"easeOut"},
       {"id":"k3","t":8.2,"x":0.5,"y":0.44,"scale":1,"rotation":0,"opacity":1,"color":"#ffffff","ease":"easeInOut"},
       {"id":"k4","t":9.2,"x":0.5,"y":0.3,"scale":1,"rotation":0,"opacity":0,"color":"#ffffff","ease":"linear"}]},
    {"id":"l2","name":"Percikan","kind":"particles","visible":true,"count":60,"spread":0.25,
     "keys":[
       {"id":"k5","t":0,"x":0.5,"y":0.55,"scale":1,"rotation":0,"opacity":0.8,"color":"#f59e0b","ease":"linear"},
       {"id":"k6","t":10,"x":0.5,"y":0.55,"scale":1,"rotation":0,"opacity":0.8,"color":"#ef4444","ease":"linear"}]}
  ]
}`;

export function buildScenePrompt(idea: string, duration: number, style: AiSceneStyle): { system: string; user: string } {
  const system = [
    'You design editable motion-graphics scenes for a canvas animation studio.',
    'OUTPUT CONTRACT: respond with ONLY one valid JSON object, no markdown fences, no prose.',
    `Scene object: {"name": short title, "bgMode": "solid"|"transparent", "background": hex, "layers": [...]}, duration is fixed at ${duration} seconds (do not include duration/width/height/fps fields).`,
    `Layers are ordered bottom to top. Max ${MAX_LAYERS} layers. Allowed kinds: text, rect, ellipse, star, particles. NEVER use kind "image".`,
    'Text layers: short Indonesian text (titles UPPERCASE), fontSize 0.03..0.16 (fraction of canvas), fontWeight one of 400/500/600/700/800/900.',
    'Shape layers: rect needs w,h,corner; ellipse needs w,h; star needs w + points 3..12; particles needs count 10..150 + spread 0.05..0.8. All sizes are fractions of canvas min-dimension.',
    `Each layer: 2..${MAX_KEYS} keyframes sorted by t (seconds, 0..${duration}). Keyframe: {"id","t","x":0..1,"y":0..1,"scale":0..2,"rotation":degrees,"opacity":0..1,"color":hex,"ease":one of linear|easeIn|easeOut|easeInOut|backOut|bounceOut}.`,
    'Every layer must ENTER (start invisible or off-screen, become visible) and EXIT (fade/slide out before the end) so the timeline feels complete.',
    `Use ONE cohesive palette of 3-4 hex colors + background. Style direction: ${STYLE_HINT[style]}.`,
    'No lorem ipsum, no watermarks, no placeholder text like "sign here".',
    'Example for a 10s scene (follow this shape exactly):',
    EXAMPLE_JSON,
  ].join('\n');
  const user = `Ide (bahasa Indonesia): "${idea}"\nBuat scene ${duration} detik dari ide di atas. HANYA JSON, tanpa penjelasan.`;
  return { system, user };
}

/** Ambil objek JSON pertama dari teks (tahan terhadap fence markdown & prosa). */
export function extractSceneJson(text: string): unknown {
  const noFence = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const start = noFence.indexOf('{');
  const end = noFence.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI tidak mengembalikan JSON scene yang valid.');
  try {
    return JSON.parse(noFence.slice(start, end + 1));
  } catch {
    throw new Error('AI mengembalikan JSON rusak. Coba lagi atau pakai mode offline.');
  }
}

function sanitizeKeys(raw: unknown, li: number, duration: number, warnings: string[]): Keyframe[] {
  const arr = Array.isArray(raw) ? raw : [];
  const keys: Keyframe[] = [];
  for (let j = 0; j < Math.min(arr.length, MAX_KEYS); j++) {
    const k = arr[j] as Record<string, unknown> | null;
    if (!k || typeof k !== 'object') continue;
    keys.push({
      id: uid('k'),
      t: Math.round(num(k.t, 0, duration, (duration / Math.max(1, Math.min(arr.length, MAX_KEYS) - 1)) * j) * 100) / 100,
      x: num(k.x, 0, 1, 0.5),
      y: num(k.y, 0, 1, 0.5),
      scale: num(k.scale, 0, 3, 1),
      rotation: num(k.rotation, -720, 720, 0),
      opacity: num(k.opacity, 0, 1, 1),
      color: hex(k.color, '#ffffff'),
      ease: (EASE_IDS as string[]).includes(String(k.ease)) ? (k.ease as EaseId) : 'easeOut',
    });
  }
  if (arr.length > MAX_KEYS) warnings.push(`Keyframe layer #${li + 1} dibatasi ${MAX_KEYS}.`);
  keys.sort((a, b) => a.t - b.t);
  if (keys.length === 0) {
    warnings.push(`Layer #${li + 1} tanpa keyframe valid — diberi fade standar.`);
    keys.push(
      { id: uid('k'), t: 0, x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 0, color: '#ffffff', ease: 'easeOut' },
      { id: uid('k'), t: Math.min(1, duration), x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1, color: '#ffffff', ease: 'linear' },
    );
  } else if (keys.length === 1) {
    const only = keys[0];
    keys.push({ ...only, id: uid('k'), t: duration });
    warnings.push(`Layer #${li + 1} hanya 1 keyframe — ditahan sampai akhir.`);
  }
  return keys;
}

function sanitizeLayer(raw: unknown, li: number, duration: number, warnings: string[]): Layer | null {
  if (!raw || typeof raw !== 'object') {
    warnings.push(`Layer #${li + 1} dilewati (format rusak).`);
    return null;
  }
  const o = raw as Record<string, unknown>;
  const name = str(o.name, `Layer ${li + 1}`, 40);
  let kind = str(o.kind, 'text', 12) as string;
  if (kind === 'image') {
    warnings.push(`Layer "${name}": gambar tidak didukung AI — diganti kotak.`);
    kind = 'rect';
  }
  if (!(KINDS as string[]).includes(kind)) {
    warnings.push(`Layer "${name}": jenis "${kind}" tak dikenal — diganti teks.`);
    kind = 'text';
  }
  const k = kind as LayerKind;
  return {
    id: uid('layer'),
    name,
    kind: k,
    visible: o.visible !== false,
    text: k === 'text' ? str(o.text, 'JUDUL', 60) : '',
    fontSize: num(o.fontSize, 0.02, 0.2, 0.11),
    fontWeight: snapWeight(o.fontWeight),
    w: num(o.w, 0.02, 1, k === 'star' ? 0.22 : 0.4),
    h: num(o.h, 0.02, 1, 0.22),
    corner: num(o.corner, 0, 0.5, 0.06),
    points: Math.round(num(o.points, 3, 12, 5)),
    count: Math.round(num(o.count, 10, 150, 60)),
    spread: num(o.spread, 0.05, 0.8, 0.3),
    imageURL: '',
    ease: (EASE_IDS as string[]).includes(String(o.ease)) ? (o.ease as EaseId) : 'easeOut',
    keys: sanitizeKeys(o.keys, li, duration, warnings),
  };
}

/** Validasi + perbaiki output mentah AI menjadi MotionScene siap edit. Melempar Error bila fatal. */
export function sanitizeAiScene(raw: unknown, duration: number): { scene: MotionScene; warnings: string[] } {
  if (!raw || typeof raw !== 'object') throw new Error('AI tidak mengembalikan JSON scene yang valid.');
  const o = raw as Record<string, unknown>;
  const warnings: string[] = [];
  const layersRaw = Array.isArray(o.layers) ? o.layers : [];
  if (layersRaw.length === 0) throw new Error('AI mengembalikan scene tanpa layer. Coba ubah kata ide lalu generate lagi.');
  if (layersRaw.length > MAX_LAYERS) warnings.push(`Layer dibatasi ${MAX_LAYERS} (AI memberi ${layersRaw.length}).`);
  const layers = layersRaw
    .slice(0, MAX_LAYERS)
    .map((lr, i) => sanitizeLayer(lr, i, duration, warnings))
    .filter((l): l is Layer => l !== null);
  if (layers.length === 0) throw new Error('Semua layer AI rusak. Coba lagi atau pakai mode offline.');
  const bgMode = o.bgMode === 'transparent' ? 'transparent' : 'solid';
  const scene = normalizeScene({
    name: str(o.name, 'AI Scene', 60),
    width: 1920,
    height: 1080,
    fps: 30,
    duration,
    bgMode,
    background: bgMode === 'transparent' ? '#000000' : hex(o.background, '#0f0f23'),
    layers,
  });
  return { scene, warnings };
}

export interface ChatTarget {
  url: string; // endpoint chat-completions penuh
  key: string;
  model: string;
  provider: AiProviderId;
}

/** Susun target chat dari provider aktif. Melempar Error berbahasa Indonesia bila belum siap. */
export function resolveTarget(provider: AiProviderId): ChatTarget {
  if (provider === 'router9') {
    const endpoint = get9rEndpoint().trim() || DEFAULT_9R_ENDPOINT;
    const key = get9rKey().trim();
    if (!key) throw new Error('API key 9Router masih kosong — salin dari dashboard 9Router (http://localhost:20128).');
    const model = get9rModel().trim() || DEFAULT_9R_MODEL;
    return { url: joinUrl(endpoint, 'chat/completions'), key, model, provider };
  }
  const key = getPolliKey().trim();
  if (!key) throw new Error('Kunci Pollinations masih kosong — daftar gratis di enter.pollinations.ai lalu tempel di tab 🎁 AI Video. (Tanpa kartu kredit.)');
  return { url: AI_SCENE_ENDPOINT, key, model: AI_SCENE_MODEL, provider };
}

function httpError(status: number, provider: AiProviderId): Error {
  if (status === 401) {
    return provider === 'router9'
      ? new Error('Kunci 9Router ditolak (401): salah atau kedaluwarsa. Salin ulang API key dari dashboard 9Router.')
      : new Error('Kunci ditolak (401): salah atau kedaluwarsa. Ambil ulang di enter.pollinations.ai.');
  }
  if (status === 402 || status === 429) {
    return provider === 'router9'
      ? new Error('9Router menolak (limit/kuota habis). Cek provider di dashboard 9Router atau ganti provider.')
      : new Error('Pollen habis / limit tercapai. Tunggu atau kerjakan quest di enter.pollinations.ai untuk tambah Pollen gratis.');
  }
  if (status === 404) {
    return provider === 'router9'
      ? new Error('Endpoint 9Router tidak ketemu (404). Pastikan alamat endpoint benar, cth http://localhost:20128/v1.')
      : new Error('Endpoint AI tidak ketemu (404). Coba lagi nanti.');
  }
  return new Error(`AI menolak permintaan (${status}). Coba lagi atau pakai mode offline.`);
}

function netError(provider: AiProviderId): Error {
  return provider === 'router9'
    ? new Error('Tidak bisa menghubungi 9Router. Pastikan 9Router ter-install & berjalan (dashboard http://localhost:20128). Bila browser memblokir, jalankan versi desktop (.exe).')
    : new Error('Tidak bisa menghubungi AI (jaringan / offline?). Cek internet atau pakai mode offline.');
}

async function callChatCompletions(t: ChatTarget, system: string, user: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(t.url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t.key}` },
      body: JSON.stringify({
        model: t.model,
        temperature: 0.4,
        max_tokens: 2500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw httpError(res.status, t.provider);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) throw new Error('AI mengembalikan respons kosong. Coba lagi.');
    return content;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('AI timeout (>2 menit). Coba ide lebih pendek atau pakai mode offline.');
    if (e instanceof TypeError) throw netError(t.provider);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Generate scene dari ide via provider aktif. 1x percobaan + 1x perbaikan otomatis bila JSON rusak. */
export async function generateSceneFromIdea(idea: string, opts: AiSceneOptions = {}): Promise<AiSceneResult> {
  const clean = idea.trim().slice(0, 300);
  if (!clean) throw new Error('Tulis ide dulu.');
  const target = resolveTarget(getAiProvider());
  const duration = Math.min(30, Math.max(5, Math.round(opts.duration ?? 10)));
  const style = opts.style ?? 'auto';
  const { system, user } = buildScenePrompt(clean, duration, style);
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ask = attempt === 0 ? user : `${user}\n\nPERBAIKAN: respons sebelumnya tidak valid (${lastErr?.message ?? 'format salah'}). Kirim ulang HANYA JSON yang valid.`;
    try {
      const content = await callChatCompletions(target, system, ask);
      const { scene, warnings } = sanitizeAiScene(extractSceneJson(content), duration);
      return { scene, warnings, offline: false };
    } catch (e) {
      lastErr = e as Error;
    }
  }
  throw new Error(`${lastErr?.message ?? 'Gagal generate.'} Bila terus gagal, pakai mode offline (tanpa AI).`);
}

/** Test koneksi provider: mengembalikan ringkasan OK atau melempar Error Indonesia. */
export async function testAiConnection(provider: AiProviderId): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    if (provider === 'pollinations') {
      const res = await fetch(POLLI_MODELS_URL, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`Pollinations ${res.status}: tidak bisa dihubungi.`);
      return 'Pollinations OK — server teks merespons.';
    }
    const endpoint = get9rEndpoint().trim() || DEFAULT_9R_ENDPOINT;
    const key = get9rKey().trim();
    if (!key) throw new Error('Isi dulu API key 9Router (salin dari dashboard http://localhost:20128).');
    const res = await fetch(joinUrl(endpoint, 'models'), {
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.status === 401) throw new Error('Kunci 9Router ditolak (401). Salin ulang API key dari dashboard.');
    if (res.status === 404) throw new Error('Endpoint tidak ketemu (404). Cek alamat endpoint 9Router.');
    if (!res.ok) throw new Error(`9Router ${res.status}: tidak bisa dihubungi.`);
    const data = (await res.json().catch(() => null)) as { data?: unknown[] } | null;
    const n = Array.isArray(data?.data) ? data.data.length : 0;
    return n > 0 ? `9Router OK — ${n} model tersedia.` : '9Router OK — terhubung.';
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Test timeout (>15 detik). Pastikan 9Router berjalan.');
    if (e instanceof TypeError) throw netError(provider);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Fallback offline: remix preset starter ----------

interface OfflinePalette { bg: string; c1: string; c2: string }

const OFFLINE_PALETTES: OfflinePalette[] = [
  { bg: '#0f0f23', c1: '#ffffff', c2: '#06b6d4' },
  { bg: '#0b1e3a', c1: '#ffffff', c2: '#38bdf8' },
  { bg: '#160a1f', c1: '#f472b6', c2: '#06b6d4' },
  { bg: '#fdf6ec', c1: '#1f2937', c2: '#ec4899' },
  { bg: '#1a0f0a', c1: '#fbbf24', c2: '#ef4444' },
];

function pickStarterId(idea: string, style: AiSceneStyle): string {
  const s = idea.toLowerCase();
  if (style === 'broadcast' || /nama|lower|third|jabatan|perusahaan|profil|host|mc\b/.test(s)) return 'lower-third-pro';
  if (/logo|brand|intro|bumper|emblem|huruf|inisial/.test(s)) return 'logo-bumper';
  return 'kinetic-title';
}

/** Susun scene deterministik dari preset (tanpa AI/API). Selalu berhasil. */
export function composeOfflineScene(idea: string, opts: AiSceneOptions = {}): AiSceneResult {
  const clean = idea.trim().slice(0, 300) || 'kreasi baru';
  const duration = Math.min(30, Math.max(5, Math.round(opts.duration ?? 10)));
  const style = opts.style ?? 'auto';
  const starter = starterScenes().find((x) => x.id === pickStarterId(clean, style)) ?? starterScenes()[0];
  const scene = normalizeScene(starter.make());
  // skala timeline preset (10 dtk) ke durasi pilihan
  const f = duration / 10;
  for (const l of scene.layers) {
    for (const k of l.keys) k.t = Math.round(Math.min(duration, k.t * f) * 100) / 100;
  }
  // palet deterministik dari hash ide
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  const pal = OFFLINE_PALETTES[(hash + OFFLINE_PALETTES.length + style.length) % OFFLINE_PALETTES.length];
  scene.background = pal.bg;
  scene.layers.forEach((l, i) => {
    for (const k of l.keys) k.color = i % 2 === 0 ? pal.c1 : pal.c2;
  });
  // ganti teks preset dengan kata dari ide
  const words = clean.split(/\s+/).filter(Boolean);
  const title = words.slice(0, 3).join(' ').toUpperCase().slice(0, 24) || 'JUDUL';
  const rest = words.slice(3).join(' ').slice(0, 60);
  const texts = scene.layers.filter((l) => l.kind === 'text');
  if (texts.length > 0) {
    const first = texts[0];
    first.text = first.text.length <= 1 ? title.charAt(0) || 'V' : title;
    first.name = 'Judul (AI-offline)';
  }
  if (texts.length > 1 && rest) {
    texts[1].text = rest;
    texts[1].name = 'Subjudul (AI-offline)';
  }
  scene.name = clean.slice(0, 40);
  scene.duration = duration;
  return {
    scene,
    warnings: ['Dibuat offline dari preset (tanpa AI) — silakan edit layer & keyframe-nya.'],
    offline: true,
  };
}
