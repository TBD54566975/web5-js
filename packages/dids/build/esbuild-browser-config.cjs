/** @type {import('esbuild').BuildOptions} */
module.exports = {
  entryPoints : ['./src/index.ts'],
  bundle      : true,
  format      : 'esm',
  sourcemap   : true,
  minify      : true,
  platform    : 'browser',
  target      : ['chrome101', 'firefox108', 'safari16'],
  inject      : ['./build/buffer-polyfill.cjs'],
  define      : {
    'global': 'globalThis',
  },
};
