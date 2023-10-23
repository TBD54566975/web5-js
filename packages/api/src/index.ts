/**
 * Making developing with Web5 components at least 5 times easier to work with.
 *
 * Web5 consists of the following components:
 * - Decentralized Identifiers
 * - Verifiable Credentials
 * - DWeb Node personal datastores
 *
 * The SDK sets out to gather the most oft used functionality from all three of
 * these pillar technologies to provide a simple library that is as close to
 * effortless as possible.
 *
 * The SDK is currently still under active development, but having entered the
 * Tech Preview phase there is now a drive to avoid unnecessary changes unless
 * backwards compatibility is provided. Additional functionality will be added
 * in the lead up to 1.0 final, and modifications will be made to address
 * issues and community feedback.
 *
 * [Link to GitHub Repo](https://github.com/TBD54566975/web5-js)
 *
 * @packageDocumentation
 */

export * from './did-api.js';
export * from './dwn-api.js';
export * from './protocol.js';
export * from './record.js';
export * from './vc-api.js';
export * from './web5.js';
export * from './tech-preview.js';

import * as utils from './utils.js';
export { utils };