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

      const verified = await vc.verify(jwt);
      expect(verified).to.be.true;
    });
  });

  describe('verify', () => {
    it('should verify a valid JWT', async () => {
      const jwt = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCIsImtpZCI6ImRpZDprZXk6ejZNa3J3TUZLSGFlTDZGTEJMRWo4VlV0S2o1YVZFZ2p2cEg3VjQ0UmI4UTlVd3NYI3o2TWtyd01GS0hhZUw2RkxCTEVqOFZVdEtqNWFWRWdqdnBIN1Y0NFJiOFE5VXdzWCJ9.eyJpc3MiOiJkaWQ6a2V5Ono2TWtyd01GS0hhZUw2RkxCTEVqOFZVdEtqNWFWRWdqdnBIN1Y0NFJiOFE5VXdzWCIsInN1YiI6IiIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIl0sImlkIjoidGVzdC1pZCIsInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJUZXN0Q3JlZGVudGlhbCJdLCJpc3N1ZXIiOiJkaWQ6a2V5Ono2TWtyd01GS0hhZUw2RkxCTEVqOFZVdEtqNWFWRWdqdnBIN1Y0NFJiOFE5VXdzWCIsImlzc3VhbmNlRGF0ZSI6IjIwMjMtMTAtMTFUMjE6MjI6MzRaIiwiY3JlZGVudGlhbFN1YmplY3QiOnsidGVzdCI6dHJ1ZX19fQ.YFwgFxhLIUza9hBOiEk-rgFUaLHupsdgbPPRDv1oK2OuUDPTuNgf0GbnBOuHMb2gnucuFJNvcpgEr0p4G_eyCA';

      const verified = await vc.verify(jwt);
      expect(verified).to.be.true;
    });

    it('should not verify an invalid JWT', async () => {
      const badJWT = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCIsImtpZCI6ImRpZDprZXk6ejZNa3J3TUZLSGFlTDZGTEJMRWo4VlV0S2o1YVZFZ2p2cEg3VjQ0UmI4UTlVd3NYI3o2TWtyd01GS0hhZUw2RkxCTEVqOFZVdEtqNWFWRWdqdnBIN1Y0NFJiOFE5VXdzWCJ9.eyJpc3MiOiJkaWQ6a2V5Ono2TWtyd01GS0hhZUw2RkxCTEVqOFZVdEtqNWFWRWdqdnBIN1Y0NFJiOFE5VXdzWCIsInN1YiI6IiIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIl0sImlkIjoidGVzdC1pZCIsInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJUZXN0Q3JlZGVudGlhbCJdLCJpc3N1ZXIiOiJkaWQ6a2V5Ono2TWtyd01GS0hhZUw2RkxCTEVqOFZVdEtqNWFWRWdqdnBIN1Y0NFJiOFE5VXdzWCIsImlzc3VhbmNlRGF0ZSI6IjIwMjMtMTAtMTFUMjE6MjI6MzRaIiwiY3JlZGVudGlhbFN1YmplY3QiOnsidGVzdCI6dHJ1ZX19fQ.YFwgFxhLIUza9hBOiEk-rgFUaLHupsdgbPPRDv1oK2OuUDPTuNgf0GbnBOuHMb2gnucuFJNvcpgEr0p4G_eyCB';

      const verified = await vc.verify(badJWT);
      expect(verified).to.be.false;
    });
  });
});

