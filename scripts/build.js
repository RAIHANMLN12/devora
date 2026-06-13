import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/index.ts'],
  outfile: 'build/index.js',
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  external,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
};

async function main() {
  if (isWatch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log('[dev] watching for changes...');
  } else {
    const result = await esbuild.build(config);
    if (result.errors.length) {
      console.error('Build failed:', result.errors);
      process.exit(1);
    }
    console.log('Build complete → build/index.js');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
