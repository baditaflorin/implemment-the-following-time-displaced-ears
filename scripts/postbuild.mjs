#!/usr/bin/env node
// Post-build: copy index.html to 404.html for SPA fallback, write .nojekyll,
// and verify the build produced a usable index.html.

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docs = join(__dirname, '..', 'docs');

const indexPath = join(docs, 'index.html');
if (!existsSync(indexPath)) {
  console.error(`[postbuild] FATAL: ${indexPath} missing — Vite build did not produce index.html`);
  process.exit(1);
}
const stat = statSync(indexPath);
if (stat.size < 200) {
  console.error(`[postbuild] FATAL: ${indexPath} suspiciously small (${stat.size} bytes)`);
  process.exit(1);
}

const indexHtml = readFileSync(indexPath, 'utf8');
writeFileSync(join(docs, '404.html'), indexHtml);

writeFileSync(join(docs, '.nojekyll'), '');

console.log(
  `[postbuild] ok — docs/index.html (${stat.size} bytes), 404.html and .nojekyll written`,
);
