import { expect } from 'chai';
import { LevelStore, MemoryStore } from '@web5/common';

import { AppDataVault } from '../src/app-data-vault.js';
import { AppDataBackup } from '../src/types/app-data.js';

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

describe('AppDataVault', () => {
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

          // The vault should not have been backed up yet.
          let vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.lastBackup).to.be.null;

          // Backup the vault.
          const encryptedBackup = await dataVault.backup();

          // Verify the results.
          expect(encryptedBackup).to.exist;
          expect(encryptedBackup).to.have.property('data').is.a.string;
          expect(encryptedBackup).to.have.property('dateCreated').is.a.string;
          expect(encryptedBackup).to.have.property('size').greaterThan(100);
          vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.lastBackup).to.be.string;
        });

        it('throws an error if the vault is not initialized', async () => {
          try {
            await dataVault.backup();
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('data vault has not been initialized');
          }
        });
      });

      describe('changePassphrase()', () => {
        it('should change the passphrase', async () => {
          // Initialize the vault.
          await dataVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Change the passphrase.
          const newPassphrase = 'brick-shield-anchor';
          await dataVault.changePassphrase({ oldPassphrase: 'dumbbell-krakatoa-ditty', newPassphrase });

          // Verify that the vault is initialized and is unlocked.
          const vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;
        });

        it('throws an error if the vault is not initialized', async () => {
          try {
            await dataVault.changePassphrase({ oldPassphrase: 'dumbbell-krakatoa-ditty', newPassphrase: 'brick-shield-anchor' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('vault has not been initialized');
          }
        });

        it('should throw an error if decryption fails due to an incorrect old passphrase', async () => {
          // Initialize the vault with a known passphrase.
          const correctPassphrase = 'correct-horse-battery-staple';
          await dataVault.initialize({ passphrase: correctPassphrase });

          // Attempt to change the passphrase using an incorrect old passphrase.
          const incorrectOldPassphrase = 'incorrect-old-passphrase';
          const newPassphrase = 'new-super-secure-passphrase';

          try {
            await dataVault.changePassphrase({
              oldPassphrase : incorrectOldPassphrase,
              newPassphrase : newPassphrase
            });
            // If no error is thrown, the test should fail.
            expect.fail('Expected an error to be thrown due to incorrect old passphrase.');
          } catch (error: any) {
            expect(error.message).to.include('incorrectly entered old passphrase');

            // Verify that the vault is locked after the failed decryption attempt.
            const vaultStatus = await dataVault.getStatus();
            expect(vaultStatus.locked).to.be.true;
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
          await dataVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          const agentDid = await dataVault.getAgentDid();

          expect(agentDid).to.exist;
          expect(agentDid).to.have.property('uri');
          expect(agentDid).to.have.property('document');
          expect(agentDid).to.have.property('metadata');
          expect(agentDid).to.have.property('keyManager');
        }).timeout(100_000);

        it('should deterministically return a DID given a mnemonic', async () => {
          // Initialize the vault.
          await dataVault.initialize({
            passphrase : 'dumbbell-krakatoa-ditty',
            mnemonic   : 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
          });

          const agentDid = await dataVault.getAgentDid();

          // Verify that the expected DID URI is returned given the mnemonic.
          expect(agentDid).to.have.property('uri', 'did:dht:qftx7z968xcpfy1a1diu75pg5meap3gdtg6ezagaw849wdh6oubo');
        });

        it('should throw an error if the vault is not initialized and unlocked', async () => {
          try {
            await dataVault.getAgentDid();
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('has not been initialized and unlocked');
          }
        });
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
        });

        it('generates and returns a 12-word mnenomic if one is not provided', async () => {
          // Initialize the vault.
          const generatedMnemonic = await dataVault.initialize({
            passphrase: 'dumbbell-krakatoa-ditty'
          });

          // Verify that the vault is initialized and is unlocked.
          expect(generatedMnemonic).to.be.a('string');
          expect(generatedMnemonic.split(' ')).to.have.lengthOf(12);
        });

        it('accepts a mnemonic', async () => {
          const predefinedMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

          // Initialize the vault with a mnemonic.
          const returnedMnemonic = await dataVault.initialize({
            passphrase : 'dumbbell-krakatoa-ditty',
            mnemonic   : predefinedMnemonic
          });

          // Verify that the vault is initialized and is unlocked.
          expect(returnedMnemonic).to.equal(predefinedMnemonic);
        });

        it('throws an error if the vault is already initialized', async () => {
          // Initialize the vault.
          await dataVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          try {
            await dataVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('vault has already been initialized');
          }
        });

        it('throws an error if the passphrase is empty', async () => {
          try {
            await dataVault.initialize({ passphrase: '' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('passphrase is required and cannot be blank');
          }
        });
      });

      describe('restore()', () => {
        it('should restore the vault from a backup', async () => {
          const passphrase = 'dumbbell-krakatoa-ditty';

          // Initialize the vault.
          await dataVault.initialize({ passphrase });

          // Backup the vault.
          const encryptedBackup = await dataVault.backup();

          // The vault should not have been restored.
          let vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.lastRestore).to.be.null;

          // Restore the vault from the backup.
          await dataVault.restore({ passphrase, backup: encryptedBackup });

          // Verify the results.
          vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.lastRestore).to.be.string;
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;
        });

        it('should revert to the previous vault contents if conversion of backup data fails', async () => {
          const backup: AppDataBackup = {
            data        : 'invalid-backup-data',
            dateCreated : new Date().toISOString(),
            size        : 123
          };

          const passphrase = 'dumbbell-krakatoa-ditty';

          // Initialize the vault.
          await dataVault.initialize({ passphrase });

          // Mock the initial vault state
          const previousStatus = await dataStore.get('appDataStatus');
          const previousContentEncryptionKey = await dataStore.get('contentEncryptionKey');
          const previousAgentDid = await dataStore.get('agentDid');

          try {
            await dataVault.restore({ backup, passphrase });
            expect.fail('Expected an error to be thrown due to backup data conversion failure.');
          } catch (error: any) {
            expect(error.message).to.include('invalid backup data or an incorrect passphrase');

            // Verify that the vault contents are unchanged
            const currentStatus = await dataStore.get('appDataStatus');
            const currentContentEncryptionKey = await dataStore.get('contentEncryptionKey');
            const currentAgentDid = await dataStore.get('agentDid');

            expect(currentStatus).to.deep.equal(previousStatus);
            expect(currentContentEncryptionKey).to.equal(previousContentEncryptionKey);
            expect(currentAgentDid).to.equal(previousAgentDid);
          }
        });

        it('throws an error if the vault is not initialized', async () => {
          try {
            await dataVault.backup();
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('data vault has not been initialized');
          }
        });

        it('should throw an error if the existing vault contents are missing or inaccessible', async () => {
          const backup: AppDataBackup = {
            data        : 'a.b.c.d.e',
            dateCreated : new Date().toISOString(),
            size        : 123
          };
          const passphrase = 'test-passphrase';

          try {
            dataStore.delete('appDataStatus');
            await dataVault.restore({ backup, passphrase });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('restore operation cannot proceed');
            expect(error.message).to.include('vault contents are missing or inaccessible');
          }

          try {
            dataStore.delete('agentDid');
            await dataVault.restore({ backup, passphrase });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('restore operation cannot proceed');
            expect(error.message).to.include('vault contents are missing or inaccessible');
          }

          try {
            dataStore.delete('contentEncryptionKey');
            await dataVault.restore({ backup, passphrase });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('restore operation cannot proceed');
            expect(error.message).to.include('vault contents are missing or inaccessible');
          }
        });
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
        });

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
        });

        it('throws an error if the passphrase is incorrect', async () => {
          // Initialize the vault.
          await dataVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          try {
            await dataVault.unlock({ passphrase: 'incorrect-passphrase' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('incorrect passphrase');
          }
        });

        it('throws an error if the vault is not initialized', async () => {
          try {
            await dataVault.unlock({ passphrase: 'dumbbell-krakatoa-ditty' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('vault has not been initialized');
          }
        });

        it('throws an error if the content encryption key data is missing', async () => {
          // Initialize the vault.
          await dataVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Remove the content encryption key data.
          await dataStore.delete('contentEncryptionKey');

          try {
            await dataVault.unlock({ passphrase: 'dumbbell-krakatoa-ditty' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('Unable to retrieve the Content Encryption Key');
          }
        });
      });
    });
  });
});