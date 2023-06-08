import esbuild from 'esbuild';
import browserConfig from './esbuild-browser-config.cjs';

// cjs bundle for Electron apps. external dependencies bundled except LevelDB
// Remove if/when the following PR is merged and this bundle is no longer needed by Electron apps
// https://github.com/electron/electron/pull/37535
esbuild.buildSync({
  platform       : 'node',
  bundle         : true,
  format         : 'cjs',
  // packages: 'external',
  external       : ['level'],
  sourcemap      : true,
  entryPoints    : ['./src/main.ts'],
  outfile        : './dist/electron/main.cjs',
  allowOverwrite : true,
});

// cjs bundle. external dependencies **not** bundled
esbuild.buildSync({
  platform       : 'node',
  bundle         : true,
  format         : 'cjs',
  packages       : 'external',
  sourcemap      : true,
  entryPoints    : ['./src/main.ts'],
  outfile        : './dist/cjs/main.cjs',
  allowOverwrite : true,
});

// esm bundle. external dependencies **not** bundled
esbuild.buildSync({
  platform       : 'node',
  bundle         : true,
  format         : 'esm',
  packages       : 'external',
  sourcemap      : true,
  entryPoints    : ['./src/main.ts'],
  outfile        : './dist/esm/main.mjs',
  allowOverwrite : true,
});

// esm polyfilled bundle for browser
esbuild.build({
  ...browserConfig,
  outfile: 'dist/browser.mjs',
});

// iife polyfilled bundle for browser
esbuild.build({
  ...browserConfig,
  format     : 'iife',
  globalName : 'Web5',
  outfile    : 'dist/browser.js',
});