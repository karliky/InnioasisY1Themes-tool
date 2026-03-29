/**
 * bump-version.mjs
 *
 * Usage:
 *   node scripts/bump-version.mjs [patch|minor|major]
 *
 * What it does:
 *   1. Reads the current version from package.json
 *   2. Bumps it (patch by default)
 *   3. Reads recent git commits since the last version tag (or last 20 commits)
 *   4. Groups them into change types and generates a new changelog entry
 *   5. Prepends the entry to src/changelog.ts
 *   6. Updates the version in package.json
 *
 * After running, review src/changelog.ts, then commit and tag:
 *   git add package.json src/changelog.ts
 *   git commit -m "chore: release vX.Y.Z"
 *   git tag vX.Y.Z
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── helpers ──────────────────────────────────────────────────────────────────

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function classifyCommit(msg) {
  const m = msg.toLowerCase();
  if (m.startsWith('feat') || m.includes('add ') || m.includes('new ')) return 'feat';
  if (m.startsWith('fix') || m.includes('fix ') || m.includes('bug')) return 'fix';
  if (m.startsWith('remove') || m.startsWith('revert') || m.includes('remov')) return 'remove';
  return 'improve';
}

function cleanMessage(msg) {
  // Strip common prefixes: "feat:", "chore:", "fix:", "docs:" etc.
  return msg.replace(/^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert|remove)(\([^)]*\))?:\s*/i, '')
            .replace(/\.$/, '')
            .trim();
}

// ── main ─────────────────────────────────────────────────────────────────────

const bumpType = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error(`Invalid bump type: ${bumpType}. Use patch, minor or major.`);
  process.exit(1);
}

// Read current version
const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;
const newVersion = bumpVersion(currentVersion, bumpType);

console.log(`Bumping ${currentVersion} → ${newVersion} (${bumpType})`);

// Find commits since last tag (falls back to last 20 commits)
let commitLog;
try {
  const lastTag = execSync('git describe --tags --abbrev=0', { cwd: root }).toString().trim();
  console.log(`Using commits since tag: ${lastTag}`);
  commitLog = execSync(`git log ${lastTag}..HEAD --oneline`, { cwd: root }).toString().trim();
} catch {
  console.log('No existing tags found — using last 20 commits.');
  commitLog = execSync('git log --oneline -20', { cwd: root }).toString().trim();
}

const lines = commitLog.split('\n').filter(Boolean);
if (lines.length === 0) {
  console.log('No commits found. Nothing to add to changelog.');
  process.exit(0);
}

// Build changes array
const changes = lines.map((line) => {
  const msg = line.replace(/^[a-f0-9]+\s+/, ''); // strip hash
  return { type: classifyCommit(msg), text: cleanMessage(msg) };
});

const today = new Date().toISOString().slice(0, 10);

// Build the new Markdown section
const changeLines = changes
  .map((c) => `- ${c.type}: ${c.text}`)
  .join('\n');

const newSection = `## [${newVersion}] - ${today}\n\n${changeLines}\n`;

// Prepend to CHANGELOG.md after the header block (first "## " heading)
const changelogPath = resolve(root, 'CHANGELOG.md');
let changelog = readFileSync(changelogPath, 'utf-8');

const firstSection = changelog.indexOf('\n## ');
if (firstSection === -1) {
  // No existing sections — append after the header
  changelog = changelog.trimEnd() + '\n\n' + newSection;
} else {
  changelog = changelog.slice(0, firstSection + 1) + newSection + '\n' + changelog.slice(firstSection + 1);
}

writeFileSync(changelogPath, changelog, 'utf-8');

// Update package.json version
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

console.log(`\nDone! Review CHANGELOG.md, then:`);
console.log(`  git add package.json src/changelog.ts`);
console.log(`  git commit -m "chore: release v${newVersion}"`);
console.log(`  git tag v${newVersion}`);
