export type ChangeType = 'feat' | 'fix' | 'improve' | 'remove';

export interface ChangelogChange {
  type: ChangeType;
  text: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: ChangelogChange[];
}

/**
 * Parses a CHANGELOG.md string where each version section looks like:
 *
 *   ## [1.0.0] - 2025-03-29
 *
 *   - feat: Some new feature
 *   - fix: Some bug fix
 *   - improve: Some improvement
 *   - remove: Something removed
 */
export function parseChangelog(raw: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];

  // Split on "## " headings (keep content after each heading)
  const sections = raw.split(/^## /m).slice(1); // first slice removes the preamble

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const header = lines[0]; // e.g. "[1.0.0] - 2025-03-29"

    const versionMatch = header.match(/\[(.+?)\]/);
    const dateMatch = header.match(/(\d{4}-\d{2}-\d{2})/);
    if (!versionMatch) continue;

    const version = versionMatch[1];
    const date = dateMatch?.[1] ?? '';
    const changes: ChangelogChange[] = [];

    for (const line of lines.slice(1)) {
      const m = line.match(/^-\s*(feat|fix|improve|remove):\s*(.+)/);
      if (m) {
        changes.push({ type: m[1] as ChangeType, text: m[2].trim() });
      }
    }

    entries.push({ version, date, changes });
  }

  return entries;
}
