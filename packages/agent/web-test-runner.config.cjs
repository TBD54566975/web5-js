/* eslint-disable @typescript-eslint/no-var-requires */
const playwrightLauncher =
  require('@web/test-runner-playwright').playwrightLauncher;

/**
 * @type {import('@web/test-runner').TestRunnerConfig}
 */
module.exports = {
  files       : 'tests/compiled/**/*.spec.js',
  playwright  : true,
  nodeResolve : true,
  browsers    : [
    playwrightLauncher({
      product: 'chromium',
    }),
    playwrightLauncher({
      product: 'firefox',
    }),
    playwrightLauncher({
      product: 'webkit',
    }),
  ],
  testsFinishTimeout : 300000,
  concurrentBrowsers : 2,
  testFramework      : {
    config: {
      timeout: '30000',
    },
  },
};
