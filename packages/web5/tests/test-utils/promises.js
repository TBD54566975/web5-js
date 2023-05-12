/**
 * This utility function is used in tests when validating that a Promise is expected to never fulfill.
 * Rather than waiting indefinitely for the Promise to fulfill, Promise.race is used with `timeoutPromise`
 * to assert that the method/function being tested won't fulfill before `timeoutPromise` does.
 *
 * @example
 * const neverFulfillingPromise = new Promise((resolve, reject) => {
 *   // Intentionally not resolving or rejecting the promise.
 * });
 *
 * // Assert that the neverFulfillingPromise is rejected due to the timeout.
 * await chai.assert.isRejected(Promise.race([neverFulfillingPromise, timeoutPromise]));
 */
export function createTimeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Promise should not have been fulfilled'));
    }, ms);
  });
}