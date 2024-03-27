const DEFAULT_TEST_DWN_URL = 'http://localhost:3000';

const getTestDwnUrl = () => process.env.TEST_DWN_URL || DEFAULT_TEST_DWN_URL;

export const testDwnUrl = getTestDwnUrl();