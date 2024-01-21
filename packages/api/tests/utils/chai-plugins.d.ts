/// <reference types="chai" resolution-mode="require"/>
/**
 * Chai plugin for validating URLs.
 *
 * This function adds two types of URL validation methods to Chai:
 * 1. For the BDD "expect" API: `expect(string).to.be.a.url;`
 * 2. For the Assert API: `assert.isUrl(string);`
 *
 * @param {Chai.ChaiStatic} chai - The Chai library object.
 * @param {Chai.ChaiUtils} utils - The Chai Utilities object.
 *
 * @example
 * // BDD API example:
 * import chai, { expect } from 'chai';
 * import chaiUrl from './chai-plugins.js';
 * chai.use(chaiUrl);
 *
 * describe('My Test Suite', () => {
 *   it('should validate the URL', () => {
 *     const url = 'https://example.org';
 *     expect(url).to.be.a.url;
 *   });
 * });
 *
 * @example
 * // Assert API example:
 * import chai, { assert } from 'chai';
 * import chaiUrl from './chai-plugins.js';
 * chai.use(chaiUrl);
 *
 * describe('My Test Suite', () => {
 *   it('should validate the URL', () => {
 *     const url = 'https://example.org';
 *     assert.isUrl(url);
 *   });
 * });
 */
export declare const chaiUrl: Chai.ChaiPlugin;
//# sourceMappingURL=chai-plugins.d.ts.map