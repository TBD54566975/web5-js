import { expect } from 'chai';
import { PlatformAgentTestHarness } from '@web5/agent';

import { Web5UserAgent } from '../src/user-agent.js';

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

describe('Web5UserAgent', () => {

  const agentStoreTypes = ['dwn', 'memory'] as const;
  agentStoreTypes.forEach((agentStoreType) => {

    describe(`with ${agentStoreType} data stores`, () => {
      let testHarness: PlatformAgentTestHarness;

      before(async () => {
        testHarness = await PlatformAgentTestHarness.setup({
          agentClass  : Web5UserAgent,
          agentStores : agentStoreType
        });
      });

      beforeEach(async () => {
        await testHarness.clearStorage();
        await testHarness.createAgentDid();
      });

      after(async () => {
        await testHarness.clearStorage();
        await testHarness.closeStorage();
      });

      describe('firstLaunch()', () => {
        it('returns true the first time the Identity Agent runs', async () => {
          const result = await testHarness.agent.firstLaunch();
          expect(result).to.be.true;
        });

        it('returns false after Identity Agent initialization', async () => {
          let result = await testHarness.agent.firstLaunch();
          expect(result).to.be.true;

          await testHarness.agent.initialize({ passphrase: 'test' });

          result = await testHarness.agent.firstLaunch();
          expect(result).to.be.false;
        });
      });

      if (agentStoreType === 'dwn') {
        describe('subsequent launches', () => {
          it('can access stored identifiers after second launch', async () => {
            // First launch and initialization.
            await testHarness.agent.initialize({ passphrase: 'test' });

            // Start the Agent, which will decrypt and load the Agent's DID from the vault.
            await testHarness.agent.start({ passphrase: 'test' });

            // Create and persist a new Identity (with DID and Keys).
            const socialIdentity = await testHarness.agent.identity.create({
              metadata  : { name: 'Social' },
              didMethod : 'jwk'
            });

            // Simulate terminating and restarting an app.
            await testHarness.closeStorage();
            testHarness = await PlatformAgentTestHarness.setup({
              agentClass  : Web5UserAgent,
              agentStores : 'dwn'
            });
            await testHarness.agent.start({ passphrase: 'test' });

            // Try to get the identity and verify it exists.
            const storedIdentity = await testHarness.agent.identity.get({
              didUri : socialIdentity.did.uri,
              tenant : socialIdentity.did.uri
            });

            expect(storedIdentity).to.exist;
            expect(storedIdentity!.did).to.have.property('uri', socialIdentity.did.uri);
          });
        });
      }
    });
  });

});
