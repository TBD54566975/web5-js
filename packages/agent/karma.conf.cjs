/* eslint-disable @typescript-eslint/no-var-requires */
// Karma is what we're using to run our tests in browser environments
// Karma does not support .mjs

// playwright acts as a safari executable on windows and mac
const playwright = require('@playwright/test');
const esbuildBrowserConfig = require('./build/esbuild-browser-config.cjs');

// use playwright chrome exec path as run target for chromium tests
process.env.CHROME_BIN = playwright.chromium.executablePath();

// use playwright webkit exec path as run target for safari tests
process.env.WEBKIT_HEADLESS_BIN = playwright.webkit.executablePath();

// use playwright firefox exec path as run target for firefox tests
process.env.FIREFOX_BIN = playwright.firefox.executablePath();

module.exports = function (config) {
  config.set({
    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-webkit-launcher',
      'karma-esbuild',
      'karma-mocha',
      'karma-mocha-reporter',
    ],

    // frameworks to use
    // available frameworks: https://www.npmjs.com/search?q=keywords:karma-adapter
    frameworks: ['mocha'],

    client: {
      // Increase Mocha's default timeout of 2 seconds to prevent timeouts during GitHub CI runs.
      mocha: {
        timeout: 10000 // 10 seconds
      },
      // If an environment variable is defined, override the default test DWN URL.
      testDwnUrls: process.env.TEST_DWN_URLS,
    },

    // list of files / patterns to load in the browser
    files: [
      { pattern: 'tests/**/*.spec.ts', watched: false },
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://www.npmjs.com/search?q=keywords:karma-preprocessor
    preprocessors: {
      'tests/**/*.spec.ts': ['esbuild'],
    },

    esbuild: esbuildBrowserConfig,

    // list of files / patterns to exclude
    exclude: [],

    // test results reporter to use
    // available reporters: https://www.npmjs.com/search?q=keywords:karma-reporter
    reporters: ['mocha'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN ||
    // config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    concurrency: 1,

    // start these browsers
    // available browser launchers: https://www.npmjs.com/search?q=keywords:karma-launcher
    browsers: ['ChromeHeadless', 'FirefoxHeadless', 'WebkitHeadless'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Increase browser timeouts to avoid DISCONNECTED messages during GitHub CI runs.
    browserDisconnectTimeout   : 10000, // default 2000
    browserDisconnectTolerance : 1, // default 0
  });
};
