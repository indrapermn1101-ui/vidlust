// Provider GRATIS via Pollinations (gen.pollinations.ai).
// - Daftar gratis di enter.pollinations.ai → dapat kunci + Pollen gratis untuk testing.
// - Tanpa kartu kredit. Pollen terbatas → untuk volume besar tetap pakai prosedural.
// - Video: GET https://gen.pollinations.ai/video/{prompt}?model=..&duration=.. → MP4 langsung.

export const POLLI_MODELS = [
  { id: 'wan', label: 'WAN (cepat & hemat)', hint: '2–15 dtk', maxDur: 15 },
  { id: 'seedance-2.0', label: 'Seedance 2.0 (sinematik)', hint: '4–15 dtk', maxDur: 15 },
  { id: 'veo', label: 'Veo (premium)', hint: '4/6/8 dtk', maxDur: 8 },
];

export const POLLI_DURATIONS = [2, 4, 5, 6, 8, 10, 15];

const LS_KEY = 'vidlust:pollinations_key';

export function getPolliKey(): string {
  try { return localStorage.getItem(LS_KEY) ?? ''; } catch { return ''; }
}
export function setPolliKey(t: string) {
  try {
    if (t) localStorage.setItem(LS_KEY, t);
    else localStorage.removeItem(LS_KEY);
  } catch { /* abaikan */ }
}

export interface PolliOptions {
  model: string;
  duration: number;
  aspectRatio: '16:9' | '9:16';
  seed: number;
  key: string;
}

export function buildPolliUrl(prompt: string, o: PolliOptions): string {
  const p = new URLSearchParams({
    model: o.model,
    duration: String(Math.max(1, Math.min(120, Math.round(o.duration)))),
    aspectRatio: o.aspectRatio,
    seed: String(o.seed),
    audio: 'false',
  });
  if (o.key.trim()) p.set('key', o.key.trim());
  return `https://gen.pollinations.ai/video/${encodeURIComponent(prompt.slice(0, 500))}?${p.toString()}`;
}

export function polliProblem(key: string): string | null {
  if (!key.trim()) {
    return 'Kunci masih kosong — daftar gratis di enter.pollinations.ai lalu tempel kuncinya. (Tanpa kartu kredit.)';
  }
  return null;
}

/** Generate video gratis. Melempar pesan Indonesia bila gagal. */
export async function generateFreeVideo(
  prompt: string,
  o: PolliOptions,
  onTick?: (elapsedSec: number) => void,
  timeoutMs = 15 * 60 * 1000,
): Promise<{ blob: Blob; url: string }> {
  const problem = polliProblem(o.key);
  if (problem) throw new Error(problem);
  if (!prompt.trim()) throw new Error('Isi prompt dulu.');
  const url = buildPolliUrl(prompt.trim(), o);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = Date.now();
  const tick = setInterval(() => onTick?.(Math.round((Date.now() - t0) / 1000)), 1000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      if (res.status === 401) throw new Error('Kunci ditolak (401): salah atau kedaluwarsa. Ambil ulang di enter.pollinations.ai.');
      if (res.status === 402 || res.status === 429) throw new Error('Pollen habis / limit tercapai. Tunggu atau kerjakan quest di enter.pollinations.ai untuk tambah Pollen gratis.');
      throw new Error(`Pollinations ${res.status}: ${txt.slice(0, 200)}`);
    }
    const blob = await res.blob();
    if (!blob.type.includes('video') && blob.size < 2000) {
      throw new Error('Respons bukan video: ' + (await blob.text()).slice(0, 200));
    }
    return { blob, url: URL.createObjectURL(blob) };
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Timeout (>15 mnt). Coba prompt lebih pendek / durasi lebih kecil.');
    throw e;
  } finally {
    clearTimeout(timer);
    clearInterval(tick);
  }
}
