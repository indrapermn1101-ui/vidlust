export interface Palette {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  accent: string;
}

export const PALETTES: Palette[] = [
  { name: 'Violet Ocean', primary: '#7c3aed', secondary: '#06b6d4', background: '#0f0f23', accent: '#f472b6' },
  { name: 'Sunset Warm', primary: '#f97316', secondary: '#ef4444', background: '#1c0a0a', accent: '#fbbf24' },
  { name: 'Forest Fresh', primary: '#22c55e', secondary: '#06b6d4', background: '#04120c', accent: '#a3e635' },
  { name: 'Gold Luxury', primary: '#f59e0b', secondary: '#b45309', background: '#0c0a09', accent: '#fde68a' },
  { name: 'Pastel Cute', primary: '#f9a8d4', secondary: '#93c5fd', background: '#fdf4ff', accent: '#f472b6' },
  { name: 'Mono Corporate', primary: '#3b82f6', secondary: '#6366f1', background: '#0b1020', accent: '#e0e7ff' },
  { name: 'Neon Night', primary: '#e879f9', secondary: '#22d3ee', background: '#050310', accent: '#f0abfc' },
  { name: 'Coffee Cozy', primary: '#b45309', secondary: '#78350f', background: '#1c1008', accent: '#fdba74' },
  { name: 'Wellness Calm', primary: '#5eead4', secondary: '#93c5fd', background: '#04211f', accent: '#fef3c7' },
  { name: 'Fintech Deep', primary: '#38bdf8', secondary: '#818cf8', background: '#020617', accent: '#4ade80' },
  { name: 'Kids Playful', primary: '#fb7185', secondary: '#fbbf24', background: '#fff7ed', accent: '#34d399' },
  { name: 'Ramadan Gold', primary: '#d4af37', secondary: '#0f766e', background: '#07110f', accent: '#fef9c3' },
];
