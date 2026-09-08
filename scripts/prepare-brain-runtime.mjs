import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRAIN_GLB,
  DRACO_FILES,
  glbFileContract,
  resolveProjectRoot,
} from './brain-asset-contract.mjs';

const projectRoot = resolveProjectRoot(fileURLToPath(import.meta.url));
const sourceRoot = path.join(
  projectRoot,
  'node_modules',
  'three',
  'examples',
  'jsm',
  'libs',
  'draco',
);
const destinationRoot = path.join(
  projectRoot,
  'local-public',
  'vendor',
  'draco',
);

// Guard 1 — source brain.glb must exist and satisfy the pinned contract.
// A missing binary used to slip silently into dist and then be served as the
// SPA HTML fallback (HTTP 200 text/html). Fail loudly instead.
const glbPath = path.join(projectRoot, BRAIN_GLB.relativePath);
try {
  const contract = await glbFileContract(glbPath);
  console.log(
    `Brain GLB source verified (${contract.size} bytes, magic "${contract.magic}", sha256 ${contract.sha256.slice(0, 12)}…).`,
  );
} catch (error) {
  throw new Error(
    `${error.message}\n\nPlace the CC BY-SA brain.glb at ${glbPath} ` +
      `(exact ${BRAIN_GLB.byteLength} bytes, sha256 ${BRAIN_GLB.sha256}) before building.`,
  );
}

// Guard 2 — Draco decoder runtime must exist in three's examples libs and be
// copied (with size verification) into local-public/vendor/draco, which the
// DRACOLoader serves from /vendor/draco/.
await mkdir(destinationRoot, { recursive: true });

for (const filename of DRACO_FILES) {
  const source = path.join(sourceRoot, filename);
  const destination = path.join(destinationRoot, filename);
  const sourceInfo = await stat(source);
  if (!sourceInfo.isFile() || sourceInfo.size === 0) {
    throw new Error(`Invalid Draco runtime dependency: ${source}`);
  }
  await copyFile(source, destination);
  const copiedInfo = await stat(destination);
  if (copiedInfo.size !== sourceInfo.size) {
    throw new Error(`Draco runtime verification failed: ${destination}`);
  }
}

console.log(
  `Brain runtime prepared (${DRACO_FILES.length} verified Draco files).`,
);
