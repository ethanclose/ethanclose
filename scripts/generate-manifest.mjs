// Scans assets/images/<album>/* and writes assets/images/manifest.json.
// Browsers cannot list directories on a static host, so the Photos page reads this file.
// Run:  node scripts/generate-manifest.mjs
import { readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = join(root, 'assets', 'images');
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

const entries = await readdir(imagesDir, { withFileTypes: true });
const albums = [];

for (const entry of entries) {
  if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
  const files = (await readdir(join(imagesDir, entry.name)))
    .filter((name) => IMAGE_EXT.test(name))
    .sort(collator.compare);
  if (files.length === 0) continue;
  albums.push({
    title: entry.name,
    images: files.map((name) => `assets/images/${entry.name}/${name}`),
  });
}

albums.sort((a, b) => collator.compare(a.title, b.title));

await writeFile(join(imagesDir, 'manifest.json'), JSON.stringify({ albums }, null, 2) + '\n');
console.log(`manifest.json: ${albums.length} album(s), ${albums.reduce((n, a) => n + a.images.length, 0)} image(s)`);
