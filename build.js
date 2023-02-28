import esbuild from 'esbuild';


esbuild.buildSync({
  platform: 'node',
  bundle: true,
  format: 'cjs',
  packages: 'external',
  sourcemap: true,
  entryPoints: ['./main.js'],
  outfile: './dist/cjs/index.js',
  allowOverwrite: true
});

esbuild.buildSync({
  platform: 'node',
  bundle: true,
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  entryPoints: ['./main.js'],
  outfile: './dist/esm/index.js',
  allowOverwrite: true
});

// esbuild.buildSync({
//   entryPoints: [ './main.js' ],
//   outdir: './dist/browser',
//   bundle: true,
//   format: 'esm',
//   minify: true,
//   sourcemap: true,
//   platform: 'browser',
//   target: ['chrome101', 'firefox108', 'safari16'],
// });
