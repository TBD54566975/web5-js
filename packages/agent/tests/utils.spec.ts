import { expect } from 'chai';

import { poll, retry } from '../src/utils.js';

describe('Agent Utils', () => {
  describe('retry()', () => {
    it('should return the result if the function succeeds', async () => {
      const fn = async () => 42;
      const result = await retry(fn, { maxRetries: 3, interval: 2, errorMsg: 'Failed' });
      expect(result).to.equal(42);
    });

    it('should retry if the function fails and eventually succeed', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) throw new Error('Failed');
        return 42;
      };
      const result = await retry(fn, { maxRetries: 3, interval: 2, errorMsg: 'Failed' });
      expect(result).to.equal(42);
    });

    it('should throw an error if the function fails repeatedly', async () => {
      const fn = async () => { throw new Error('Failed'); };
      try {
        await retry(fn, { maxRetries: 3, interval: 2, errorMsg: 'Failed' });
        expect.fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).to.equal('Failed');
      }
    });

    it('should validate the result and retry if validation fails', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        return attempts;
      };
      const validate = (result: number) => result === 3;
      const result = await retry(fn, { maxRetries: 3, interval: 2, errorMsg: 'Failed', validate });
      expect(result).to.equal(3);
    });

    it('should throw an error if validation fails repeatedly', async () => {
      const fn = async () => 42;
      const validate = (result: number) => result === 43;
      try {
        await retry(fn, { maxRetries: 3, interval: 2, errorMsg: 'Validation Failed', validate });
        expect.fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).to.equal('Validation Failed');
      }
    });
  });

  describe('poll()', () => {
    it('should poll and handle valid messages until aborted', async () => {
      let counter = 0;
      const fn = async () => {
        counter++;
        return counter;
      };
      const validate = (result: number) => result > 0;
      const callback = async (result: number) => {
        expect(result).to.be.greaterThan(0);
      };
      const ac = new AbortController();

      // Start polling in the background
      const pollingPromise = poll(fn, { interval: 5, abortSignal: ac.signal, validate, callback });

      // Abort polling after some time
      setTimeout(() => ac.abort(), 20);

      // Await the polling promise to ensure it completes
      await pollingPromise;
    });

    it('should continue polling after invoking the callback', async () => {
      let callbackCount = 0;
      const fn = async () => 42;
      const callback = async () => {
        callbackCount++;
        // Stop the test after a few iterations to prevent it from running indefinitely
        if (callbackCount >= 3) {
          expect(callbackCount).to.equal(3);
        }
      };
      poll(fn, { interval: 10, callback });
    });

    it('should stop polling once aborted', async () => {
      let counter = 0;
      const fn = async () => {
        counter++;
        return counter;
      };
      const ac = new AbortController();

      // Start polling in the background.
      const pollingPromise = poll(fn, { interval: 5, abortSignal: ac.signal, callback: async () => {} });

      // Abort polling after some time.
      setTimeout(() => ac.abort(), 10);

      // Await the polling promise to ensure it completes.
      await pollingPromise;

      // Capture the counter value at the time of abort.
      const countAtAbort = structuredClone(counter);

      // Wait for some additional time to ensure polling has stopped
      await new Promise(resolve => setTimeout(resolve, 10));

      // Confirm the counter value hasn't changed, indicating polling has stopped
      expect(counter).to.equal(countAtAbort);
    });

    it('should return the result if no callback is provided', async () => {
      const ac = new AbortController();
      const fn = async () => 42;
      const result = await poll(fn, { interval: 10, abortSignal: ac.signal });
      expect(result).to.equal(42);
    });

    it('should return the result if no callback or AbortSignal is provided', async () => {
      const fn = async () => 42;
      const result = await poll(fn, { interval: 10 });
      expect(result).to.equal(42);
    });

    it('should handle invalid results by continuing to poll', (done) => {
      let counter = 0;
      const fn = async () => {
        counter++;
        return counter;
      };
      const validate = (result: number) => result >= 3;
      const callback = async (result: number) => {
        expect(result).to.equal(3);
        done();
      };
      poll(fn, { interval: 10, validate, callback });
    });
  });
});