import { expect } from 'chai';
import { PlatformAgentTestHarness } from '@web5/agent';

import { Web5IdentityAgent } from '../src/identity-agent.js';

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

describe('Managing Identities', () => {

  const agentStoreTypes = ['dwn', 'memory'] as const;
  agentStoreTypes.forEach((agentStoreType) => {

    describe(`with ${agentStoreType} data stores`, () => {
      let testHarness: PlatformAgentTestHarness;

      before(async () => {
        testHarness = await PlatformAgentTestHarness.setup({
          agentClass  : Web5IdentityAgent,
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

      describe('initial identity creation', () => {
        it('can create three identities', async () => {
          // First launch and initialization.
          await testHarness.agent.initialize({ password: 'test' });

          // Start the Agent, which will decrypt and load the Agent's DID from the vault.
          await testHarness.agent.start({ password: 'test' });

          // Create three identities, each of which is stored in a new tenant.
          const careerIdentity = await testHarness.agent.identity.create({
            metadata  : { name: 'Social' },
            didMethod : 'jwk'
          });

          const familyIdentity = await testHarness.agent.identity.create({
            metadata  : { name: 'Social' },
            didMethod : 'jwk'
          });

          const socialIdentity = await testHarness.agent.identity.create({
            metadata  : { name: 'Social' },
            didMethod : 'jwk'
          });

          // Verify the Identities were stored in each new Identity's tenant.
          const storedCareerIdentity = await testHarness.agent.identity.get({ didUri: careerIdentity.did.uri });
          const storedFamilyIdentity = await testHarness.agent.identity.get({ didUri: familyIdentity.did.uri });
          const storedSocialIdentity = await testHarness.agent.identity.get({ didUri: socialIdentity.did.uri });
          expect(storedCareerIdentity!.did).to.have.property('uri', careerIdentity.did.uri);
          expect(storedFamilyIdentity!.did).to.have.property('uri', familyIdentity.did.uri);
          expect(storedSocialIdentity!.did).to.have.property('uri', socialIdentity.did.uri);
        }).timeout(30000);
      });
    });
  });
});