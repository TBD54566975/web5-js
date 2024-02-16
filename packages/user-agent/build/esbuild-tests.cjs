const esbuild = require('esbuild');
const browserConfig = require('./esbuild-browser-config.cjs');

/** @type {import('esbuild').BuildOptions} */
let config = {
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
};

const handleBuild = () => {
  esbuild.build(config);
};

const handleWatch = async() => {
  let ctx = await esbuild.context(config);

  await ctx.watch();
};

const hasWatchArg = process.argv.includes('--watch');

if (hasWatchArg) {
  handleWatch();
} else {
  handleBuild();
}