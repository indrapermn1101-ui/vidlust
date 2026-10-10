import type { ProjectSettings } from '../types';
import { PALETTES } from './palettes';
import { TEMPLATES } from '../engines/templates';
import { generateMetadata, metadataToCSV } from './adobeStock';

export interface BatchOptions {
  count: number;
  varyTemplate: boolean;
  varyPalette: boolean;
  varySeed: boolean;
  templates?: string[];
}

function randPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateBatchJobs(base: ProjectSettings, opts: BatchOptions): ProjectSettings[] {
  const jobs: ProjectSettings[] = [];
  const pool = opts.templates?.length ? opts.templates : TEMPLATES.map((t) => t.id);
  for (let i = 0; i < opts.count; i++) {
    const job: ProjectSettings = { ...base };
    if (opts.varyTemplate) job.templateId = pool[i % pool.length];
    else if (opts.templates?.length) job.templateId = opts.templates[0];
    if (opts.varyPalette) {
      const p = PALETTES[(Math.floor(Math.random() * PALETTES.length) + i) % PALETTES.length];
      job.primary = p.primary;
      job.secondary = p.secondary;
      job.background = p.background;
      job.accent = p.accent;
    }
    if (opts.varySeed) job.seed = Math.floor(Math.random() * 999999);
    jobs.push(job);
  }
  return jobs;
}

export function jobsToCSV(jobs: ProjectSettings[], ext = 'mp4'): string {
  const header = 'Filename,Title,Description,Keywords,Category';
  const rows = jobs.map((j) => {
    const tplName = TEMPLATES.find((t) => t.id === j.templateId)?.name ?? j.templateId;
    const meta = generateMetadata(j, tplName);
    // pastikan seed masuk ke filename agar unik
    const fname = `${meta.filenameBase}_seed${j.seed}.${ext}`;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    return [esc(fname), esc(meta.title), esc(meta.description), esc(meta.keywords.join(', ')), esc(meta.category)].join(',');
  });
  return `${header}\n${rows.join('\n')}\n`;
}

// helper lama tetap tersedia
export { metadataToCSV };
export { randPick };
