import esbuild from 'esbuild';
import browserConfig from './esbuild-browser-config.cjs';

// esm polyfilled bundle for browser
esbuild.build({
  ...browserConfig,
  outfile: 'dist/browser.mjs',
});

// iife polyfilled bundle for browser
esbuild.build({
  ...browserConfig,
  format     : 'iife',
  globalName : 'Web5Agent',
  outfile    : 'dist/browser.js',
});