import { test, expect } from '@playwright/test';

test('processDwnRequest can take a file', async ({ page }) => {
  await page.goto('http://127.0.0.1:8080/tests/browser/index.html');

  page.on('console', msg => console.log(msg.text()));

  const inputChonkerHandler = await page.$('#chonker');
  await expect(inputChonkerHandler).toBeTruthy;

  await inputChonkerHandler?.setInputFiles('./tests/browser/test.jpeg');
  await page.click('#chonker_btn');
  expect(true).toBe(false);
});
