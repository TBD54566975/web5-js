import esbuild from 'esbuild';
import packageJson from '../package.json' assert { type: 'json' };

// list of dependencies that _dont_ ship cjs
const includeList = new Set([
  '@decentralized-identity/ion-sdk',
  'pkarr'
]);

// create list of dependencies that we _do not_ want to include in our bundle
const excludeList = ['sodium-universal'];
for (const dependency in packageJson.dependencies) {
  if (includeList.has(dependency)) {
    continue;
  } else {
    excludeList.push(dependency);
  }
}

/** @type {import('esbuild').BuildOptions} */
const baseConfig = {
  allowOverwrite : true,
  bundle         : true,
  external       : excludeList,
  format         : 'cjs',
  platform       : 'node',
  sourcemap      : true,
};

const indexConfig = {
  ...baseConfig,
  entryPoints : ['./dist/esm/index.js'],
  outfile     : './dist/cjs/index.js',
};
esbuild.buildSync(indexConfig);

const utilsConfig = {
  ...baseConfig,
  entryPoints : ['./dist/esm/utils.js'],
  outfile     : './dist/cjs/utils.js',
};
esbuild.buildSync(utilsConfig);