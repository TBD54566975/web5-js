/**
 * The `browser` directive in package.json will result in
 * the bundler swapping this file for `dom-api-browser.ts`
 * such that web browsers, which have a DOM, can use the
 * activateDomFeatures() / deactivateDomFeatures() functions.
 *
 * Other runtime environments, like Node.js, will get the
 * no-op versions since there is no DOM.
 */

export function activateDomFeatures() {
  // no-op
}

export function deactivateDomFeatures() {
  // no-op
}