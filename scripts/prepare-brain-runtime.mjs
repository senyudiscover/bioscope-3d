import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
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
const runtimeFiles = ['draco_wasm_wrapper.js', 'draco_decoder.wasm'];

await mkdir(destinationRoot, { recursive: true });

for (const filename of runtimeFiles) {
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
  `Brain runtime prepared (${runtimeFiles.length} verified Draco files).`,
);
