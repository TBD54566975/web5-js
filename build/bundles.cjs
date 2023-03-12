const esbuild = require('esbuild');
const browserConfig = require('./esbuild-browser-config.cjs');

// cjs bundle. external dependencies **not** bundled
esbuild.buildSync({
  platform: 'node',
  bundle: true,
  format: 'cjs',
  packages: 'external',
  sourcemap: true,
  entryPoints: ['./src/main.js'],
  outfile: './dist/cjs/index.cjs',
  allowOverwrite: true
});

// esm bundle. external dependencies **not** bundled
esbuild.buildSync({
  platform: 'node',
  bundle: true,
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  entryPoints: ['./src/main.js'],
  outfile: './dist/esm/index.mjs',
  allowOverwrite: true
});

// esm polyfilled bundle for browser
esbuild.build({
  ...browserConfig,
  outfile: 'dist/browser.mjs',
});

// iife polyfilled bundle for browser
esbuild.build({
  ...browserConfig,
  format: 'iife',
  globalName: 'Web5',
  outfile: 'dist/browser.js',
});