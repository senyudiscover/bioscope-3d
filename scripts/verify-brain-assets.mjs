// Post-build deterministic regression contract for Brain Workbench assets.
// Run after `npm run local-build`:
//   node scripts/verify-brain-assets.mjs            (static checks only)
//   node scripts/verify-brain-assets.mjs --url http://127.0.0.1:3000
// Static checks guarantee dist-local holds a REAL GLB (magic "glTF", exact
// pinned size + sha256) plus the Draco decoder — never an HTML fallback.
// The optional --url probe additionally verifies HTTP 200 with real asset
// bytes, rejecting the classic "HTML 200 mistaken for asset 200" failure.
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRAIN_GLB,
  DRACO_FILES,
  glbFileContract,
  resolveProjectRoot,
} from './brain-asset-contract.mjs';

const projectRoot = resolveProjectRoot(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const urlFlagIndex = args.findIndex(
  (arg) => arg === '--url' || arg.startsWith('--url='),
);
const baseUrl =
  urlFlagIndex === -1
    ? null
    : args[urlFlagIndex].startsWith('--url=')
      ? args[urlFlagIndex].slice('--url='.length)
      : args[urlFlagIndex + 1];

function passed(message) {
  console.log(`  PASS  ${message}`);
}

async function assertFileNonEmpty(filePath, label) {
  const info = await stat(filePath);
  if (!info.isFile() || info.size === 0) {
    throw new Error(`${label} is missing or empty at ${filePath}`);
  }
  passed(`${label}: ${info.size} bytes`);
}

// --- Source (local-public, never in git by policy) ---
console.log('Source assets (local-public):');
await glbFileContract(
  path.join(projectRoot, BRAIN_GLB.relativePath),
).then((contract) =>
  passed(
    `${BRAIN_GLB.relativePath} — ${contract.size} bytes, magic "${contract.magic}", sha256 ${contract.sha256.slice(0, 12)}…`,
  ),
);
for (const filename of DRACO_FILES) {
  await assertFileNonEmpty(
    path.join(projectRoot, 'local-public', 'vendor', 'draco', filename),
    `local-public/vendor/draco/${filename}`,
  );
}

// --- Built output (dist-local) ---
console.log('Built output (dist-local):');
await glbFileContract(
  path.join(projectRoot, 'dist-local', 'models', 'brain', 'brain.glb'),
).then((contract) =>
  passed(
    `dist-local/models/brain/brain.glb — ${contract.size} bytes, magic "${contract.magic}" — real GLB, not HTML`,
  ),
);
for (const filename of DRACO_FILES) {
  await assertFileNonEmpty(
    path.join(projectRoot, 'dist-local', 'vendor', 'draco', filename),
    `dist-local/vendor/draco/${filename}`,
  );
}

// --- Optional HTTP probe (guards against SPA HTML fallback at runtime) ---
if (baseUrl) {
  console.log(`HTTP probe (${baseUrl}):`);
  const probeGlb = async () => {
    const response = await fetch(`${baseUrl}/models/brain/brain.glb`);
    const contentType = response.headers.get('content-type') ?? '';
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (response.status !== 200) {
      throw new Error(`GET /models/brain/brain.glb -> HTTP ${response.status}`);
    }
    if (/text\/html/i.test(contentType)) {
      throw new Error(
        'GET /models/brain/brain.glb returned Content-Type text/html — SPA fallback served instead of the asset',
      );
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const magic = buffer.subarray(0, 4).toString('ascii');
    if (magic !== BRAIN_GLB.magic || buffer.length !== BRAIN_GLB.byteLength) {
      throw new Error(
        `GET /models/brain/brain.glb returned ${buffer.length} bytes with magic "${magic}" — expected ${BRAIN_GLB.byteLength} bytes of "${BRAIN_GLB.magic}"`,
      );
    }
    passed(
      `/models/brain/brain.glb — HTTP 200, Content-Type "${contentType}", ${buffer.length} bytes, magic "${magic}"`,
    );
  };
  await probeGlb();
  for (const filename of DRACO_FILES) {
    const response = await fetch(`${baseUrl}/vendor/draco/${filename}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (response.status !== 200 || /text\/html/i.test(contentType)) {
      throw new Error(
        `GET /vendor/draco/${filename} -> HTTP ${response.status} "${contentType}" (SPA fallback?)`,
      );
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      throw new Error(`GET /vendor/draco/${filename} returned an empty body`);
    }
    passed(
      `/vendor/draco/${filename} — HTTP 200, Content-Type "${contentType}", ${buffer.length} bytes`,
    );
  }
}

console.log('\nBrain asset contract verified.');
