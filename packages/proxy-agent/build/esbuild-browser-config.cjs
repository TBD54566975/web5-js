/* eslint-disable @typescript-eslint/no-var-requires */
const polyfillProviderPlugin = require('node-stdlib-browser/helpers/esbuild/plugin');
const stdLibBrowser = require('node-stdlib-browser');

const requiredPolyfills = new Set(['crypto', 'node:crypto', 'stream']);

// populate object containing lib -> polyfill path
const polyfills = {};
for (let lib in stdLibBrowser) {
  if (requiredPolyfills.has(lib)) {
    const polyfill = stdLibBrowser[lib];
    polyfills[lib] = polyfill;
  }
}

/** @type {import('esbuild').BuildOptions} */
module.exports = {
  entryPoints : ['./src/index.ts'],
  bundle      : true,
  format      : 'esm',
  sourcemap   : true,
  minify      : true,
  platform    : 'browser',
  target      : ['chrome101', 'firefox108', 'safari16'],
  inject      : [require.resolve('node-stdlib-browser/helpers/esbuild/shim')],
  plugins     : [polyfillProviderPlugin(polyfills)],
  define      : {
    'global': 'globalThis',
  },
};