declare const __karma__: { config?: { testDwnUrls?: string; } };

const DEFAULT_TEST_DWN_URLS = 'https://dwn.tbddev.org/dwn0';

function getTestDwnUrls(): string[] {
  // Check to see if we're running in a Karma browser test environment.
  const browserTestEnvironment = typeof __karma__ !== 'undefined' && __karma__?.config?.testDwnUrls !== undefined;

  // Check to see if we're running in a Node environment.
  const nodeTestEnvironment = process && process?.env !== undefined;

  // Attempt to use DWN URL defined in Karma config, if running a browser test.
  // Otherwise, attempt to use the Node environment variable.
  const envTestDwnUrl = (browserTestEnvironment)
    ? __karma__.config!.testDwnUrls
    : (nodeTestEnvironment)
      ? process.env.TEST_DWN_URLS
      : undefined;

  // If defined, return the test environment DWN URL. Otherwise, return the default.
  return (envTestDwnUrl || DEFAULT_TEST_DWN_URLS).split(',');
}

export const testDwnUrls = getTestDwnUrls();