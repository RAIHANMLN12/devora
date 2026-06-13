import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const uiDir = resolve(root, 'ui');
const outDir = resolve(root, 'build/ui');

mkdirSync(outDir, { recursive: true });

async function main() {
  // Bundle the React app
  await esbuild.build({
    entryPoints: [resolve(uiDir, 'src/index.tsx')],
    outfile: resolve(outDir, 'ui.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    sourcemap: false,
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
    },
  });

  // Copy index.html
  copyFileSync(resolve(uiDir, 'index.html'), resolve(outDir, 'index.html'));

  // Copy styles.css
  copyFileSync(resolve(uiDir, 'styles.css'), resolve(outDir, 'styles.css'));

  console.log('UI build complete → build/ui/');
}

main().catch((err) => {
  console.error('UI build failed:', err);
  process.exit(1);
});
