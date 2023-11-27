/* eslint-disable @typescript-eslint/no-var-requires */
const esbuild = require('esbuild');
const browserConfig = require('./esbuild-browser-config.cjs');

esbuild.build({
  ...browserConfig,
  format      : 'esm',
  entryPoints : ['./tests/*.spec.*'],
  bundle      : true,
  minify      : false,
  outdir      : 'tests/compiled',
  // define      : undefined,
  // inject      : undefined,
  // plugins     : undefined,
  // packages    : 'external',
  // banner      : {
  //   js: `
  //   import path from 'path';
  //   import { fileURLToPath } from 'url';
  //   import { createRequire as topLevelCreateRequire } from 'module';
  //   const require = topLevelCreateRequire(import.meta.url);
  //   const __filename = fileURLToPath(import.meta.url);
  //   const __dirname = path.dirname(__filename);
  //   `},
});
