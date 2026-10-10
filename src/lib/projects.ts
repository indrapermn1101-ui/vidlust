import type { ProjectSettings } from '../types';

const LS_PROJECTS = 'vidlust:projects:v1';
const LS_LAST = 'vidlust:last:v1';

export interface SavedProject {
  name: string;
  updatedAt: number;
  settings: ProjectSettings;
}

export function normalizeSettings(raw: Partial<ProjectSettings>): ProjectSettings {
  return {
    templateId: 'geo-loop',
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 12,
    primary: '#7c3aed',
    secondary: '#06b6d4',
    background: '#0f0f23',
    accent: '#f472b6',
    speed: 1,
    density: 1,
    text: 'SALE',
    showText: false,
    seed: 42,
    loop: true,
    bgMode: 'solid',
    ...raw,
  };
}

export function saveLast(settings: ProjectSettings) {
  try { localStorage.setItem(LS_LAST, JSON.stringify(settings)); } catch { /* ignore */ }
}

export function loadLast(): ProjectSettings | null {
  try {
    const raw = localStorage.getItem(LS_LAST);
    return raw ? normalizeSettings(JSON.parse(raw) as Partial<ProjectSettings>) : null;
  } catch { return null; }
}

export function listProjects(): SavedProject[] {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_PROJECTS) ?? '[]') as SavedProject[];
    return arr.map((p) => ({ ...p, settings: normalizeSettings(p.settings) }));
  } catch { return []; }
}

export function saveProject(name: string, settings: ProjectSettings) {
  const all = listProjects().filter((p) => p.name !== name);
  all.unshift({ name, updatedAt: Date.now(), settings });
  localStorage.setItem(LS_PROJECTS, JSON.stringify(all.slice(0, 50)));
}

export function deleteProject(name: string) {
  localStorage.setItem(LS_PROJECTS, JSON.stringify(listProjects().filter((p) => p.name !== name)));
}
