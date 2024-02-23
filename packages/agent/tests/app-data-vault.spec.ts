import { expect } from 'chai';
import { LevelStore, MemoryStore } from '@web5/common';

import { AppDataVault } from '../src/app-data-vault.js';

const testConfigurations = [
  {
    name      : 'MemoryStore',
    dataStore : new MemoryStore<string, string>()
  },
  {
    name      : 'LevelStore',
    dataStore : new LevelStore<string, string>()
  }
];

describe.only('AppDataVault', () => {
  testConfigurations.forEach((test) => {
    describe(`with ${test.name}`, () => {
      let dataVault: AppDataVault;
      let dataStore = test.dataStore;

      before(() => {
        dataVault = new AppDataVault({
          store                   : dataStore,
          keyDerivationWorkFactor : 1
        });
      });

      beforeEach(() => {
        dataStore.clear();
      });

      afterEach(() => {
        dataStore.clear();
      });

      after(() => {
        dataStore.close();
      });

      describe('backup()', () => {
        it('should backup the vault', async () => {
          // Initialize the vault.
          await dataVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Backup the vault.
          const backup = await dataVault.backup({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Verify that the backup is a string.
          expect(backup).to.exist;
          expect(backup).to.have.property('data').is.a.string;
          expect(backup).to.have.property('dateCreated').is.a.string;
          expect(backup).to.have.property('size').greaterThan(100);
        }).slow(1000); // Yellow (>= 500ms), Red (>= 1000ms);

        it('throws an error if the vault is not initialized', async () => {
          try {
            await dataVault.backup({ passphrase: 'dumbbell-krakatoa-ditty' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('data vault has not been initialized');
          }
        });
      });

      describe('getStatus()', () => {
        it('should return initialized=false when first instantiated', async () => {
          const vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
        });

        it('should return locked=true when first instantiated', async () => {
          const vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.locked).to.be.true;
        });

        it('should return initialized=true after initialization', async () => {
          // Mock initialization having been completed.
          await dataStore.set(
            'appDataStatus',
            JSON.stringify({
              initialized : true,
              locked      : false,
              lastBackup  : null,
              lastRestore : null
            })
          );

          const vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
        });
      });

      describe('getAgentDid()', () => {
        it('should return the agent DID for an initialized vault', async () => {
          // Initialize the vault.
          await dataVault.initialize({
            passphrase: 'dumbbell-krakatoa-ditty'
          });

          const agentDid = await dataVault.getAgentDid();

          expect(agentDid).to.exist;
          expect(agentDid).to.have.property('uri');
          expect(agentDid).to.have.property('document');
          expect(agentDid).to.have.property('metadata');
          expect(agentDid).to.have.property('keyManager');
        }).slow(1000); // Yellow (>= 500ms), Red (>= 1000ms);

        it('should deterministically return a DID given a mnemonic', async () => {
          // Initialize the vault.
          await dataVault.initialize({
            passphrase : 'dumbbell-krakatoa-ditty',
            mnemonic   : 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
          });

          const agentDid = await dataVault.getAgentDid();

          // Verify that the expected DID URI is returned given the mnemonic.
          expect(agentDid).to.have.property('uri', 'did:dht:qftx7z968xcpfy1a1diu75pg5meap3gdtg6ezagaw849wdh6oubo');
        }).slow(1000); // Yellow (>= 500ms), Red (>= 1000ms);
      });

      describe('initialize()', () => {
        it('should initialize and unlock data vault', async () => {
          // Verify that the vault is not initialized and is locked.
          let vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
          expect(vaultStatus.locked).to.be.true;

          // Initialize the vault.
          const passphrase = 'dumbbell-krakatoa-ditty';
          await dataVault.initialize({ passphrase });

          // Verify that the vault is initialized and is unlocked.
          vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;
        }).slow(800); // Yellow (>= 400ms), Red (>= 800ms);

        it('generates and returns a 12-word mnenomic if one is not provided', async () => {
          // Initialize the vault.
          const generatedMnemonic = await dataVault.initialize({
            passphrase: 'dumbbell-krakatoa-ditty'
          });

          // Verify that the vault is initialized and is unlocked.
          expect(generatedMnemonic).to.be.a('string');
          expect(generatedMnemonic.split(' ')).to.have.lengthOf(12);
        }).slow(300); // Yellow (>= 150ms), Red (>= 300ms);

        it('accepts a mnemonic', async () => {
          const predefinedMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

          // Initialize the vault with a mnemonic.
          const returnedMnemonic = await dataVault.initialize({
            passphrase : 'dumbbell-krakatoa-ditty',
            mnemonic   : predefinedMnemonic
          });

          // Verify that the vault is initialized and is unlocked.
          expect(returnedMnemonic).to.equal(predefinedMnemonic);
        }).slow(300); // Yellow (>= 150ms), Red (>= 300ms)
      });

      describe('unlock()', () => {
        it('unlocks a locked vault', async () => {
          // Validate that the vault is not initialized and is locked.
          let vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
          expect(vaultStatus.locked).to.be.true;

          // Initialize the vault.
          await dataVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;

          // Lock the vault.
          await dataVault.lock();

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.true;

          // Unock the vault.
          await dataVault.unlock({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;
        }).slow(400); // Yellow (>= 200ms), Red (>= 400ms);

        it('returns true immediately if the vault is already unlocked', async () => {
          // Validate that the vault is not initialized and is locked.
          let vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
          expect(vaultStatus.locked).to.be.true;

          // Initialize the vault.
          await dataVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;

          // Unock the vault (which is already unlocked).
          await dataVault.unlock({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;
        }).slow(400); // Yellow (>= 200ms), Red (>= 400ms);
      });
    });
  });
});