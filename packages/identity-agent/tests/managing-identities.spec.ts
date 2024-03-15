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
          const storedCareerIdentity = await testHarness.agent.identity.get({ didUri: careerIdentity.did.uri, tenant: careerIdentity.did.uri });
          const storedFamilyIdentity = await testHarness.agent.identity.get({ didUri: familyIdentity.did.uri, tenant: familyIdentity.did.uri });
          const storedSocialIdentity = await testHarness.agent.identity.get({ didUri: socialIdentity.did.uri, tenant: socialIdentity.did.uri });
          expect(storedCareerIdentity!.did).to.have.property('uri', careerIdentity.did.uri);
          expect(storedFamilyIdentity!.did).to.have.property('uri', familyIdentity.did.uri);
          expect(storedSocialIdentity!.did).to.have.property('uri', socialIdentity.did.uri);
        }).timeout(30000);

        // Tests that should only run for DWN-backed stores that provide multi-tenancy.
        if (agentStoreType === 'dwn') {
          it('supports tenant isolation between Identity Agent and Identities under management', async () => {
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

            // Manage the newly created identities with the Identity Agent.
            await testHarness.agent.identity.manage({ portableIdentity: await careerIdentity.export() });
            await testHarness.agent.identity.manage({ portableIdentity: await familyIdentity.export() });
            await testHarness.agent.identity.manage({ portableIdentity: await socialIdentity.export() });

            // Verify the Identities were ALSO stored in the Identity Agent's tenant.
            const storedIdentities = await testHarness.agent.identity.list();
            expect(storedIdentities).to.have.length(3);

            // Verify the DIDs were only stored in the new Identity's tenant.
            let storedCareerDid = await testHarness.agent.did.get({ didUri: careerIdentity.did.uri, tenant: careerIdentity.did.uri });
            expect(storedCareerDid).to.exist;
            storedCareerDid = await testHarness.agent.did.get({ didUri: careerIdentity.did.uri });
            expect(storedCareerDid).to.not.exist;
            let storedFamilyDid = await testHarness.agent.did.get({ didUri: familyIdentity.did.uri, tenant: familyIdentity.did.uri });
            expect(storedFamilyDid).to.exist;
            storedFamilyDid = await testHarness.agent.did.get({ didUri: familyIdentity.did.uri });
            expect(storedFamilyDid).to.not.exist;
            let storedSocialDid = await testHarness.agent.did.get({ didUri: socialIdentity.did.uri, tenant: socialIdentity.did.uri });
            expect(storedSocialDid).to.exist;
            storedSocialDid = await testHarness.agent.did.get({ didUri: socialIdentity.did.uri });
            expect(storedSocialDid).to.not.exist;

            // Verify keys were stored in Identity Agent's DWN.
            const careerVm = await testHarness.agent.did.getSigningMethod({ didUri: careerIdentity.did.uri });
            const careerKeyUri = await testHarness.agent.keyManager.getKeyUri({ key: careerVm!.publicKeyJwk! });
            const careerPublicKey = await testHarness.agent.keyManager.getPublicKey({ keyUri: careerKeyUri });
            expect(careerPublicKey).to.exist;

            const familyVm = await testHarness.agent.did.getSigningMethod({ didUri: familyIdentity.did.uri });
            const familyKeyUri = await testHarness.agent.keyManager.getKeyUri({ key: familyVm!.publicKeyJwk! });
            const familyPublicKey = await testHarness.agent.keyManager.getPublicKey({ keyUri: familyKeyUri });
            expect(familyPublicKey).to.exist;

            const socialVm = await testHarness.agent.did.getSigningMethod({ didUri: socialIdentity.did.uri });
            const socialKeyUri = await testHarness.agent.keyManager.getKeyUri({ key: socialVm!.publicKeyJwk! });
            const socialPublicKey = await testHarness.agent.keyManager.getPublicKey({ keyUri: socialKeyUri });
            expect(socialPublicKey).to.exist;
          });
        }
      });
    });
  });
});