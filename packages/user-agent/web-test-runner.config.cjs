/* eslint-disable @typescript-eslint/no-var-requires */
const playwrightLauncher =
  require('@web/test-runner-playwright').playwrightLauncher;

/**
 * @type {import('@web/test-runner').TestRunnerConfig}
 */
module.exports = {
  playwright         : true,
  nodeResolve        : true,
  testsFinishTimeout : 300000,
  concurrentBrowsers : 2,
  testFramework      : {
    config: {
      timeout: '15000',
    },
  },
  groups: [
    {
      name     : 'chromium',
      files    : 'tests/compiled/**/*.spec.js',
      browsers : [
        playwrightLauncher({
          product: 'chromium',
        }),
      ],
    },
    {
      name     : 'firefox',
      files    : 'tests/compiled/**/*.spec.js',
      browsers : [
        playwrightLauncher({
          product: 'firefox',
        }),
      ],
    },
    {
      name     : 'webkit',
      files    : 'tests/compiled/**/*.spec.js',
      browsers : [
        playwrightLauncher({
          product: 'webkit',
        }),
      ],
    },
  ],
};
