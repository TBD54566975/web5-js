import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { TestManagedAgent } from '@web5/agent';

import { Web5UserAgent } from '../src/user-agent.js';

chai.use(chaiAsPromised);

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
      let testAgent: TestManagedAgent;

      before(async () => {
        testAgent = await TestManagedAgent.create({
          agentClass  : Web5UserAgent,
          agentStores : agentStoreType
        });
      });

      beforeEach(async () => {
        await testAgent.clearStorage();
      });

      after(async () => {
        await testAgent.clearStorage();
        await testAgent.closeStorage();
      });

      describe('firstLaunch()', () => {
        it('returns true the first time the Identity Agent runs', async () => {
          await expect(testAgent.agent.firstLaunch()).to.eventually.be.true;
        });

        it('returns false after Identity Agent initialization', async () => {
          await expect(testAgent.agent.firstLaunch()).to.eventually.be.true;

          await testAgent.agent.initialize({ passphrase: 'test' });
          await expect(testAgent.agent.firstLaunch()).to.eventually.be.false;
        });
      });

      if (agentStoreType === 'dwn') {
        describe('subsequent launches', () => {
          it('can access stored identifiers after second launch', async () => {
            // First launch and initialization.
            await testAgent.agent.start({ passphrase: 'test' });

            // Create and persist a new Identity (with DID and Keys).
            const socialIdentity = await testAgent.agent.identityManager.create({
              name      : 'Social',
              didMethod : 'key',
              kms       : 'local'
            });

            // Simulate terminating and restarting an app.
            await testAgent.closeStorage();
            testAgent = await TestManagedAgent.create({
              agentClass  : Web5UserAgent,
              agentStores : 'dwn'
            });
            await testAgent.agent.start({ passphrase: 'test' });

            // Try to get the identity and verify it exists.
            const storedIdentity = await testAgent.agent.identityManager.get({
              did     : socialIdentity.did,
              context : socialIdentity.did
            });
            expect(storedIdentity).to.have.property('did', socialIdentity.did);
          });
        });
      }
    });
  });

});
