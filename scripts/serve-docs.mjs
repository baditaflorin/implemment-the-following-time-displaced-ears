#!/usr/bin/env node
// Tiny static server that serves docs/ exactly as GitHub Pages would —
// preserving the project base path so the same URLs work.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docs = resolve(__dirname, '..', 'docs');

const PORT = Number(process.env.PORT) || 4173;
const BASE_PATH = process.env.BASE_PATH || '/implemment-the-following-time-displaced-ears';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain',
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = (req.url || '/').split('?')[0];
    if (urlPath === BASE_PATH || urlPath === BASE_PATH + '/') urlPath = BASE_PATH + '/index.html';
    if (urlPath === '/' || urlPath === '') urlPath = BASE_PATH + '/index.html';
    if (urlPath.startsWith(BASE_PATH + '/')) urlPath = urlPath.slice(BASE_PATH.length);

    const filePath = join(docs, urlPath);
    if (!filePath.startsWith(docs)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }

    let body;
    try {
      const s = await stat(filePath);
      if (s.isDirectory()) {
        body = await readFile(join(filePath, 'index.html'));
      } else {
        body = await readFile(filePath);
      }
    } catch {
      body = await readFile(join(docs, '404.html'));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    const ct = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (err) {
    res.writeHead(500);
    res.end(`server error: ${err && err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`Pages preview at http://localhost:${PORT}${BASE_PATH}/`);
});
