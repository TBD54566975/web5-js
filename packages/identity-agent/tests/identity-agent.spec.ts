import * as sinon from 'sinon';
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

describe('IdentityAgent', () => {

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

      describe('firstLaunch()', () => {
        it('returns true the first time the Identity Agent runs', async () => {
          await expect(testAgent.agent.firstLaunch()).to.eventually.be.true;
        });

        it('returns false after Identity Agent initialization', async () => {
          await expect(testAgent.agent.firstLaunch()).to.eventually.be.true;

          await testAgent.agent.start({ passphrase: 'test' });
          await expect(testAgent.agent.firstLaunch()).to.eventually.be.false;
        });
      });

      describe('initialize()', () => {
        it('initializes the AppData store and stores the vault key set', async () => {
          await testAgent.agent.initialize({ passphrase: 'test' });

          // Confirm the AppData store was initialized.
          const { initialized } = await testAgent.agent.appData.getStatus();
          expect(initialized).to.be.true;

          // Confirm the vault key set was stored.
          const storedVaultKeySet = await testAgent.appDataStore.get('vaultKeySet');
          expect(storedVaultKeySet).to.exist;
          expect(storedVaultKeySet).to.be.a.string;
        });
      });

      describe('start()', () => {
        it('initializes the AppData store the first time the Identity Agent runs', async () => {
          // const agent = await IdentityAgent.create({ appData, dwnManager });
          let initializeSpy = sinon.spy(testAgent.agent, 'initialize');
          let unlockSpy = sinon.spy(testAgent.agent.appData, 'unlock');

          // Execute agent.start() for the first time.
          await testAgent.agent.start({ passphrase: 'test' });

          // Confirm agent.initialize() was called.
          expect(initializeSpy.called).to.be.true;

          // Confirm agent.appData.unlock() was not called.
          expect(unlockSpy.called).to.be.false;

          // Confirm the AppData store was initialized.
          const { initialized } = await testAgent.agent.appData.getStatus();
          expect(initialized).to.be.true;

          // Confirm the vault key set was stored.
          const storedVaultKeySet = await testAgent.appDataStore.get('vaultKeySet');
          expect(storedVaultKeySet).to.exist;
          expect(storedVaultKeySet).to.be.a.string;

          // Confirm the AppData store was unlocked.
          // @ts-expect-error because a private variable is being intentionally accessed.
          const vaultUnlockKey = testAgent.agent.appData._vaultUnlockKey;
          expect(vaultUnlockKey).to.exist;
          expect(vaultUnlockKey).to.be.a('Uint8Array');

          // Confirm the Agent's key pair was stored in KeyManager.
          if (testAgent.agent.agentDid === undefined) throw new Error(); // Type guard.
          const signingKeyId = await testAgent.agent.didManager.getDefaultSigningKey({ did: testAgent.agent.agentDid });
          if (!signingKeyId) throw new Error('Type guard');
          const agentKeyPair = await testAgent.agent.keyManager.getKey({ keyRef: signingKeyId });
          expect(agentKeyPair).to.exist;
          expect(agentKeyPair).to.have.property('privateKey');
          expect(agentKeyPair).to.have.property('publicKey');

          initializeSpy.restore();
          unlockSpy.restore();
        });

        it('unlocks the AppData store on subsequent Identity Agent runs', async () => {
          // Execute agent.start() for the first time.
          await testAgent.agent.start({ passphrase: 'test' });

          let initializeSpy = sinon.spy(testAgent.agent, 'initialize');
          let unlockSpy = sinon.spy(testAgent.agent.appData, 'unlock');

          // Execute agent.start() for the second time.
          await testAgent.agent.start({ passphrase: 'test' });

          // Confirm agent.initialize() was not called.
          expect(initializeSpy.called).to.be.false;

          // Confirm agent.appData.unlock() was called.
          expect(unlockSpy.called).to.be.true;

          // Confirm the vault key set was stored.
          const storedVaultKeySet = await testAgent.appDataStore.get('vaultKeySet');
          expect(storedVaultKeySet).to.exist;
          expect(storedVaultKeySet).to.be.a.string;

          // Confirm the AppData store was unlocked.
          // @ts-expect-error because a private variable is being intentionally accessed.
          const vaultUnlockKey = testAgent.agent.appData._vaultUnlockKey;
          expect(vaultUnlockKey).to.exist;
          expect(vaultUnlockKey).to.be.a('Uint8Array');

          // Confirm the Agent's key pair was stored in KeyManager.
          if (testAgent.agent.agentDid === undefined) throw new Error(); // Type guard.
          const signingKeyId = await testAgent.agent.didManager.getDefaultSigningKey({ did: testAgent.agent.agentDid });
          if (!signingKeyId) throw new Error('Type guard');
          const agentKeyPair = await testAgent.agent.keyManager.getKey({ keyRef: signingKeyId });
          expect(agentKeyPair).to.exist;
          expect(agentKeyPair).to.have.property('privateKey');
          expect(agentKeyPair).to.have.property('publicKey');

          initializeSpy.restore();
          unlockSpy.restore();
        });

        it('unlocks the AppData store', async () => {
          // const agent = await IdentityAgent.create({ appData, dwnManager });
          let initializeSpy = sinon.spy(testAgent.agent, 'initialize');
          let unlockSpy = sinon.spy(testAgent.agent.appData, 'unlock');

          await testAgent.agent.start({ passphrase: 'test' });

          // Confirm agent.initialize() was called.
          expect(initializeSpy.called).to.be.true;

          // Confirm agent.appData.unlock() was not called.
          expect(unlockSpy.called).to.be.false;

          // @ts-expect-error because a private variable is being intentionally accessed.
          const vaultUnlockKey = testAgent.agent.appData._vaultUnlockKey;
          expect(vaultUnlockKey).to.exist;
          expect(vaultUnlockKey).to.be.a('Uint8Array');

          initializeSpy.restore();
          unlockSpy.restore();
        });
      });
    });
  });
});