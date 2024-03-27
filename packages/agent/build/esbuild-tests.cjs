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
  define      : {
    ...browserConfig.define,
    'process.env.TEST_DWN_URL': JSON.stringify(process.env.TEST_DWN_URL ?? null),
  },
});
