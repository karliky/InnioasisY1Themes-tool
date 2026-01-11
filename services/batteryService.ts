// Provides URLs for battery icons (charging and non-charging) from TheMatrix theme assets
// Levels expected: 0..3 (maps to 001..004)

const files: Record<string, string> = import.meta.glob(
  '/themes/TheMatrix/*.{png,PNG}',
  { eager: true, query: '?url', import: 'default' }
) as any;

const resolvePath = (fileName: string): string | undefined => {
  const raw = `/themes/TheMatrix/${fileName}`;
  const encoded = `/themes/TheMatrix/${encodeURI(fileName)}`;
  return files[raw] || files[encoded];
};

export const getBatteryIconUrl = (level: number, charging: boolean): string | undefined => {
  const lev = Math.max(0, Math.min(3, Math.floor(level)));
  const suffix = String(lev + 1).padStart(3, '0');
  const base = charging ? 'batterycharge' : 'battery';
  return resolvePath(`${base}.${suffix}.png`);
};

export type BatteryState = {
  level: number; // 0..3
  charging: boolean;
};
