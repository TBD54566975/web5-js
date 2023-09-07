import type { PortableDid } from '@web5/dids';
import type { ManagedIdentity } from '@web5/agent';

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { TestManagedAgent } from '@web5/agent';

import { DwnApi } from '../src/dwn-api.js';
import { testDwnUrls } from './test-config.js';
import { TestUserAgent } from './utils/test-user-agent.js';
import emailProtocolDefinition from './fixtures/protocol-definitions/email.json' assert { type: 'json' };

chai.use(chaiAsPromised);

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

// TODO: Come up with a better way of resolving the TS errors.
describe('Protocol', () => {
  let dwn: DwnApi;
  let alice: ManagedIdentity;
  let aliceDid: PortableDid;
  let testAgent: TestManagedAgent;

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

    // Create a new Identity to author the DWN messages.
    ({ did: aliceDid } = await testAgent.createIdentity({ testDwnUrls }));
    alice = await testAgent.agent.identityManager.import({
      did      : aliceDid,
      identity : { name: 'Alice', did: aliceDid.did },
      kms      : 'local'
    });

    // Instantiate DwnApi.
    dwn = new DwnApi({ agent: testAgent.agent, connectedDid: alice.did });
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('send()', () => {
    it('configures protocols on remote DWNs for your own DID', async () => {
      // Alice configures a protocol on her agent connected DWN.
      const { status: aliceEmailStatus, protocol: aliceEmailProtocol } = await dwn.protocols.configure({
        message: {
          definition: emailProtocolDefinition
        }
      });

      expect(aliceEmailStatus.code).to.equal(202);
      expect(aliceEmailProtocol.definition).to.deep.equal(emailProtocolDefinition);

      // Attempt to configure the protocol on Alice's remote DWN.
      const { status } = await aliceEmailProtocol.send(alice.did);
      expect(status.code).to.equal(202);

      // Query Alices's remote DWN for `email` schema records.
      const aliceRemoteQueryResult = await dwn.protocols.query({
        from    : alice.did,
        message : {
          filter: {
            protocol: emailProtocolDefinition.protocol
          }
        }
      });

      expect(aliceRemoteQueryResult.status.code).to.equal(200);
      expect(aliceRemoteQueryResult.protocols).to.exist;
      expect(aliceRemoteQueryResult.protocols.length).to.equal(1);
      const [ aliceRemoteEmailProtocol ] = aliceRemoteQueryResult.protocols;
      expect(aliceRemoteEmailProtocol.definition).to.deep.equal(emailProtocolDefinition);
    });
  });

  describe('toJSON()', () => {
    xit('should return all defined properties');
  });
});