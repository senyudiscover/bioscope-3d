// Shared deterministic contract for the Brain Workbench runtime assets.
// Values mirror lib/brain-atlas.ts BRAIN_ASSET (keep both in sync).
// Pipeline (frozen BIO-015 CC BY-SA policy): binary assets live machine-locally
// under local-public/ and never enter git; vite publicDir copies local-public
// verbatim into dist-local. These guards make a missing/corrupt asset fail
// loudly instead of silently serving the SPA HTML fallback (HTTP 200 text/html)
// which GLTFLoader then mis-parses as JSON.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import path from 'node:path';

export const BRAIN_GLB = {
  relativePath: 'local-public/models/brain/brain.glb',
  byteLength: 4_650_816,
  sha256: '76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453',
  magic: 'glTF',
};

export const DRACO_FILES = ['draco_decoder.wasm', 'draco_wasm_wrapper.js'];

export async function glbFileContract(filePath) {
  const info = await stat(filePath);
  if (info.size !== BRAIN_GLB.byteLength) {
    throw new Error(
      `Brain GLB size mismatch: ${filePath} is ${info.size} bytes, expected ${BRAIN_GLB.byteLength}`,
    );
  }
  const handle = await open(filePath, 'r');
  let head;
  try {
    const buffer = Buffer.alloc(4);
    await handle.read(buffer, 0, 4, 0);
    head = buffer.toString('ascii');
  } finally {
    await handle.close();
  }
  if (head !== BRAIN_GLB.magic) {
    throw new Error(
      `Brain GLB magic mismatch: ${filePath} starts with "${head}" (expected "${BRAIN_GLB.magic}") — an HTML/JSON fallback must not masquerade as the asset`,
    );
  }
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  const actual = hash.digest('hex');
  if (actual !== BRAIN_GLB.sha256) {
    throw new Error(
      `Brain GLB sha256 mismatch: ${filePath} is ${actual}, expected ${BRAIN_GLB.sha256}`,
    );
  }
  return { size: info.size, magic: head, sha256: actual };
}

export function resolveProjectRoot(importMetaUrl) {
  return path.resolve(path.dirname(importMetaUrl), '..');
}
