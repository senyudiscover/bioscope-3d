import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Minimal standalone test runner config. It deliberately mirrors only the
// '@' alias from vite-spa.config.ts; the app builds (vinext / vite-spa) are
// untouched so the test setup can never influence runtime behavior.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { '@': projectRoot } },
  test: { environment: 'node' },
});
