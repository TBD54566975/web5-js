import { Web5 } from '@web5/api';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { TestManagedAgent } from '@web5/agent';

import { IdentityAgent } from '../src/identity-agent.js';

chai.use(chaiAsPromised);

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

describe('Managing Identities', () => {

  const agentStoreTypes = ['dwn', 'memory'] as const;
  agentStoreTypes.forEach((agentStoreType) => {

    describe(`with ${agentStoreType} data stores`, () => {
      let testAgent: TestManagedAgent;

      before(async () => {
        testAgent = await TestManagedAgent.create({
          agentClass  : IdentityAgent,
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

      describe('initial identity creation', () => {
        it('can create three identities', async () => {
          // Start agent for the first time.
          await testAgent.agent.start({ passphrase: 'test' });

          // Create three identities, each of which is stored in a new tenant.
          const careerIdentity = await testAgent.agent.identityManager.create({
            name      : 'Social',
            didMethod : 'key',
            kms       : 'local'
          });

          const familyIdentity = await testAgent.agent.identityManager.create({
            name      : 'Social',
            didMethod : 'key',
            kms       : 'local'
          });

          const socialIdentity = await testAgent.agent.identityManager.create({
            name      : 'Social',
            didMethod : 'key',
            kms       : 'local'
          });

          // Verify the Identities were stored in each new Identity's tenant.
          const storedCareerIdentity = await testAgent.agent.identityManager.get({ did: careerIdentity.did, context: careerIdentity.did });
          const storedFamilyIdentity = await testAgent.agent.identityManager.get({ did: familyIdentity.did, context: familyIdentity.did });
          const storedSocialIdentity = await testAgent.agent.identityManager.get({ did: socialIdentity.did, context: socialIdentity.did });
          expect(storedCareerIdentity).to.have.property('did', careerIdentity.did);
          expect(storedFamilyIdentity).to.have.property('did', familyIdentity.did);
          expect(storedSocialIdentity).to.have.property('did', socialIdentity.did);
        }).timeout(30000);

        // Tests that should only run for DWN-backed stores that provide multi-tenancy.
        if (agentStoreType === 'dwn') {
          it('supports tenant isolation between Identity Agent and Identities under management', async () => {
            // Start agent for the first time.
            await testAgent.agent.start({ passphrase: 'test' });

            // Create three identities, each of which is stored in a new tenant.
            const careerIdentity = await testAgent.agent.identityManager.create({
              name      : 'Career',
              didMethod : 'key',
              kms       : 'local'
            });

            const familyIdentity = await testAgent.agent.identityManager.create({
              name      : 'Family',
              didMethod : 'key',
              kms       : 'local'
            });

            const socialIdentity = await testAgent.agent.identityManager.create({
              name      : 'Social',
              didMethod : 'key',
              kms       : 'local'
            });

            // Import just the Identity metadata for the new identities to the Identity Agent's tenant.
            await testAgent.agent.identityManager.import({ identity: careerIdentity, context: testAgent.agent.agentDid });
            await testAgent.agent.identityManager.import({ identity: familyIdentity, context: testAgent.agent.agentDid });
            await testAgent.agent.identityManager.import({ identity: socialIdentity, context: testAgent.agent.agentDid });

            // Verify the Identities were stored in each new Identity's tenant.
            const storedCareerIdentity = await testAgent.agent.identityManager.get({ did: careerIdentity.did, context: careerIdentity.did });
            const storedFamilyIdentity = await testAgent.agent.identityManager.get({ did: familyIdentity.did, context: familyIdentity.did });
            const storedSocialIdentity = await testAgent.agent.identityManager.get({ did: socialIdentity.did, context: socialIdentity.did });
            expect(storedCareerIdentity).to.have.property('did', careerIdentity.did);
            expect(storedFamilyIdentity).to.have.property('did', familyIdentity.did);
            expect(storedSocialIdentity).to.have.property('did', socialIdentity.did);

            // Verify the Identities were ALSO stored in the Identity Agent's tenant.
            const storedIdentities = await testAgent.agent.identityManager.list();
            expect(storedIdentities).to.have.length(3);

            // Verify the DIDs were only stored in the new Identity's tenant.
            let storedCareerDid = await testAgent.agent.didManager.get({ didRef: careerIdentity.did, context: careerIdentity.did });
            expect(storedCareerDid).to.exist;
            storedCareerDid = await testAgent.agent.didManager.get({ didRef: careerIdentity.did });
            expect(storedCareerDid).to.not.exist;
            let storedFamilyDid = await testAgent.agent.didManager.get({ didRef: familyIdentity.did, context: familyIdentity.did });
            expect(storedFamilyDid).to.exist;
            storedFamilyDid = await testAgent.agent.didManager.get({ didRef: familyIdentity.did });
            expect(storedFamilyDid).to.not.exist;
            let storedSocialDid = await testAgent.agent.didManager.get({ didRef: socialIdentity.did, context: socialIdentity.did });
            expect(storedSocialDid).to.exist;
            storedSocialDid = await testAgent.agent.didManager.get({ didRef: socialIdentity.did });
            expect(storedSocialDid).to.not.exist;

            // Verify keys were stored in Identity Agent's DWN.
            const careerKey = await testAgent.agent.keyManager.getKey({
              keyRef: await testAgent.agent.didManager.getDefaultSigningKey({ did: careerIdentity.did }) ?? '' // Type guard.
            });
            expect(careerKey).to.exist;
            const familyKey = await testAgent.agent.keyManager.getKey({
              keyRef: await testAgent.agent.didManager.getDefaultSigningKey({ did: familyIdentity.did }) ?? '' // Type guard.
            });
            expect(familyKey).to.exist;
            const socialKey = await testAgent.agent.keyManager.getKey({
              keyRef: await testAgent.agent.didManager.getDefaultSigningKey({ did: socialIdentity.did }) ?? '' // Type guard.
            });
            expect(socialKey).to.exist;
          }).timeout(30000);
        }
      });

      describe('Using Web5 API', async () => {
        it('should instantiate Web5 API with provided Web5Agent and DID', async () => {
          // Start agent for the first time.
          await testAgent.agent.start({ passphrase: 'test' });

          // Create two identities, each of which is stored in a new tenant.
          const careerIdentity = await testAgent.agent.identityManager.create({
            name      : 'Career',
            didMethod : 'key',
            kms       : 'local'
          });
          const socialIdentity = await testAgent.agent.identityManager.create({
            name      : 'Social',
            didMethod : 'key',
            kms       : 'local'
          });

          // Instantiate a Web5 instance with the "Career" Identity, write a record, and verify the result.
          const web5Career = new Web5({ agent: testAgent.agent, connectedDid: careerIdentity.did });
          expect(web5Career).to.exist;

          // Instantiate a Web5 instance with the "Social" Identity, write a record, and verify the result.
          const web5Social = new Web5({ agent: testAgent.agent, connectedDid: socialIdentity.did });
          expect(web5Social).to.exist;
        }).timeout(30000);

        it('Can write records using an Identity under management', async () => {
          // Start agent for the first time.
          await testAgent.agent.start({ passphrase: 'test' });

          // Create two identities, each of which is stored in a new tenant.
          const careerIdentity = await testAgent.agent.identityManager.create({
            name      : 'Social',
            didMethod : 'key',
            kms       : 'local'
          });
          const socialIdentity = await testAgent.agent.identityManager.create({
            name      : 'Social',
            didMethod : 'key',
            kms       : 'local'
          });

          // Instantiate a Web5 instance with the "Career" Identity, write a record, and verify the result.
          const web5Career = new Web5({ agent: testAgent.agent, connectedDid: careerIdentity.did });
          const careerResult = await web5Career.dwn.records.write({
            data    : 'Hello, world!',
            message : {
              schema     : 'foo/bar',
              dataFormat : 'text/plain'
            }
          });
          expect(careerResult.status.code).to.equal(202);
          expect(careerResult.record).to.exist;
          expect(careerResult.record?.author).to.equal(careerIdentity.did);
          expect(await careerResult.record?.data.text()).to.equal('Hello, world!');

          // Instantiate a Web5 instance with the "Social" Identity, write a record, and verify the result.
          const web5Social = new Web5({ agent: testAgent.agent, connectedDid: socialIdentity.did });
          const socialResult = await web5Social.dwn.records.write({
            data    : 'Hello, everyone!',
            message : {
              schema     : 'foo/bar',
              dataFormat : 'text/plain'
            }
          });
          expect(socialResult.status.code).to.equal(202);
          expect(socialResult.record).to.exist;
          expect(socialResult.record?.author).to.equal(socialIdentity.did);
          expect(await socialResult.record?.data.text()).to.equal('Hello, everyone!');
        }).timeout(30000);

      });
    });
  });
});