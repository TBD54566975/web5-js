import { expect } from 'chai';
import { TestManagedAgent } from '@web5/agent';

import { VcApi } from '../src/vc-api.js';
import { TestUserAgent } from './utils/test-user-agent.js';

import { VerifiableCredentialTypeV1, utils } from '@web5/credentials';

describe('VcApi', () => {
  let vc: VcApi;
  let testAgent: TestManagedAgent;
  let connectedDid: string;

  before(async () => {
    testAgent = await TestManagedAgent.create({
      agentClass  : TestUserAgent,
      agentStores : 'memory'
    });
  });

  beforeEach(async () => {
    await testAgent.clearStorage();

    // Create an Agent DID.
    await testAgent.createAgentDid();

    // Create a new Identity to author DWN messages.
    const identity = await testAgent.agent.identityManager.create({
      name      : 'Test',
      didMethod : 'key',
      kms       : 'local'
    });

    // Instantiate VcApi.
    vc = new VcApi({ agent: testAgent.agent, connectedDid: identity.did });
    connectedDid = identity.did;
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('create()', () => {
    it('should create a verifiable credential JWT', async () => {
      const verifiableCredential: VerifiableCredentialTypeV1 = {
        '@context'        : ['https://www.w3.org/2018/credentials/v1'],
        id                : 'test-id',
        type              : ['VerifiableCredential', 'TestCredential'],
        issuer            : connectedDid,
        issuanceDate      : utils.getCurrentXmlSchema112Timestamp(),
        credentialSubject : { test: true }
      };

      const jwt = await vc.create({ verifiableCredential, subjectDid: '' });

      expect(jwt).to.be.a('string');

    });
  });
});