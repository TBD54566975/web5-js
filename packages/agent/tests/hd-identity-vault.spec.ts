import type { KeyValueStore } from '@web5/common';

import { expect } from 'chai';
import { LevelStore, MemoryStore } from '@web5/common';

import type { IdentityVaultBackup } from '../src/types/identity-vault.js';

import { HdIdentityVault } from '../src/hd-identity-vault.js';

describe('HdIdentityVault', () => {
  ['MemoryStore', 'LevelStore'].forEach((vaultStoreType) => {
    describe(`with ${vaultStoreType}`, () => {
      let identityVault: HdIdentityVault;
      let vaultStore: KeyValueStore<string, string>;

      before(() => {
        vaultStore = (vaultStoreType === 'MemoryStore')
          ? new MemoryStore<string, string>()
          : new LevelStore<string, string>({ location: '__TESTDATA__/VAULT_STORE' });

        identityVault = new HdIdentityVault({
          store                   : vaultStore,
          keyDerivationWorkFactor : 1
        });
      });

      beforeEach(async () => {
        await vaultStore.clear();
      });

      afterEach(async () => {
        await vaultStore.clear();
      });

      after(async () => {
        await vaultStore.close();
      });

      describe('backup()', () => {
        it('should backup the vault', async () => {
          // Initialize the vault.
          await identityVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          // The vault should not have been backed up yet.
          let vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.lastBackup).to.be.null;

          // Backup the vault.
          const encryptedBackup = await identityVault.backup();

          // Verify the results.
          expect(encryptedBackup).to.exist;
          expect(encryptedBackup).to.have.property('data').is.a.string;
          expect(encryptedBackup).to.have.property('dateCreated').is.a.string;
          expect(encryptedBackup).to.have.property('size').greaterThan(100);
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.lastBackup).to.be.string;
        });

        it('throws an error if the vault is not initialized', async () => {
          try {
            await identityVault.backup();
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('vault has not been initialized');
          }
        });
      });

      describe('changePassphrase()', () => {
        it('should change the passphrase', async () => {
          // Initialize the vault.
          await identityVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Change the passphrase.
          const newPassphrase = 'brick-shield-anchor';
          await identityVault.changePassphrase({ oldPassphrase: 'dumbbell-krakatoa-ditty', newPassphrase });

          // Verify that the vault is initialized and is unlocked.
          const vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;
        });

        it('throws an error if the vault is not initialized', async () => {
          try {
            await identityVault.changePassphrase({ oldPassphrase: 'dumbbell-krakatoa-ditty', newPassphrase: 'brick-shield-anchor' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('vault has not been initialized');
          }
        });

        it('should throw an error if decryption fails due to an incorrect old passphrase', async () => {
          // Initialize the vault with a known passphrase.
          const correctPassphrase = 'correct-horse-battery-staple';
          await identityVault.initialize({ passphrase: correctPassphrase });

          // Attempt to change the passphrase using an incorrect old passphrase.
          const incorrectOldPassphrase = 'incorrect-old-passphrase';
          const newPassphrase = 'new-super-secure-passphrase';

          try {
            await identityVault.changePassphrase({
              oldPassphrase : incorrectOldPassphrase,
              newPassphrase : newPassphrase
            });
            // If no error is thrown, the test should fail.
            expect.fail('Expected an error to be thrown due to incorrect old passphrase.');
          } catch (error: any) {
            expect(error.message).to.include('incorrectly entered old passphrase');

            // Verify that the vault is locked after the failed decryption attempt.
            const vaultStatus = await identityVault.getStatus();
            expect(vaultStatus.locked).to.be.true;
          }
        });
      });

      describe('getStatus()', () => {
        it('should return initialized=false when first instantiated', async () => {
          const vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
        });

        it('should return locked=true when first instantiated', async () => {
          const vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.locked).to.be.true;
        });

        it('should return initialized=true after initialization', async () => {
          // Mock initialization having been completed.
          await vaultStore.set(
            'vaultStatus',
            JSON.stringify({
              initialized : true,
              locked      : false,
              lastBackup  : null,
              lastRestore : null
            })
          );

          const vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
        });
      });

      describe('getDid()', () => {
        it('should return the DID for an initialized vault', async () => {
          // Initialize the vault.
          await identityVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          const did = await identityVault.getDid();

          expect(did).to.exist;
          expect(did).to.have.property('uri');
          expect(did).to.have.property('document');
          expect(did).to.have.property('metadata');
          expect(did).to.have.property('keyManager');
        }).timeout(100_000);

        it('should deterministically return a DID given a mnemonic', async () => {
          // Initialize the vault.
          await identityVault.initialize({
            passphrase : 'dumbbell-krakatoa-ditty',
            mnemonic   : 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
          });

          const did = await identityVault.getDid();

          // Verify that the expected DID URI is returned given the mnemonic.
          expect(did).to.have.property('uri', 'did:dht:qftx7z968xcpfy1a1diu75pg5meap3gdtg6ezagaw849wdh6oubo');
        });

        it('should throw an error if the vault is not initialized and unlocked', async () => {
          try {
            await identityVault.getDid();
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('has not been initialized and unlocked');
          }
        });
      });

      describe('initialize()', () => {
        it('should initialize and unlock the vault', async () => {
          // Verify that the vault is not initialized and is locked.
          let vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
          expect(vaultStatus.locked).to.be.true;

          // Initialize the vault.
          const passphrase = 'dumbbell-krakatoa-ditty';
          await identityVault.initialize({ passphrase });

          // Verify that the vault is initialized and is unlocked.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;
        });

        it('generates and returns a 12-word mnenomic if one is not provided', async () => {
          // Initialize the vault.
          const generatedMnemonic = await identityVault.initialize({
            passphrase: 'dumbbell-krakatoa-ditty'
          });

          // Verify that the vault is initialized and is unlocked.
          expect(generatedMnemonic).to.be.a('string');
          expect(generatedMnemonic.split(' ')).to.have.lengthOf(12);
        });

        it('accepts a mnemonic', async () => {
          const predefinedMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

          // Initialize the vault with a mnemonic.
          const returnedMnemonic = await identityVault.initialize({
            passphrase : 'dumbbell-krakatoa-ditty',
            mnemonic   : predefinedMnemonic
          });

          // Verify that the vault is initialized and is unlocked.
          expect(returnedMnemonic).to.equal(predefinedMnemonic);
        });

        it('throws an error if the vault is already initialized', async () => {
          // Initialize the vault.
          await identityVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          try {
            await identityVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('Vault has already been initialized');
          }
        });

        it('throws an error if the passphrase is empty', async () => {
          try {
            await identityVault.initialize({ passphrase: '' });
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
          await identityVault.initialize({ passphrase });

          // Backup the vault.
          const encryptedBackup = await identityVault.backup();

          // The vault should not have been restored.
          let vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.lastRestore).to.be.null;

          // Restore the vault from the backup.
          await identityVault.restore({ passphrase, backup: encryptedBackup });

          // Verify the results.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.lastRestore).to.be.string;
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;
        });

        it('should revert to the previous vault contents if conversion of backup data fails', async () => {
          const backup: IdentityVaultBackup = {
            data        : 'invalid-backup-data',
            dateCreated : new Date().toISOString(),
            size        : 123
          };

          const passphrase = 'dumbbell-krakatoa-ditty';

          // Initialize the vault.
          await identityVault.initialize({ passphrase });

          // Mock the initial vault state
          const previousStatus = await vaultStore.get('vaultStatus');
          const previousContentEncryptionKey = await vaultStore.get('contentEncryptionKey');
          const previousDid = await vaultStore.get('did');

          try {
            await identityVault.restore({ backup, passphrase });
            expect.fail('Expected an error to be thrown due to backup data conversion failure.');
          } catch (error: any) {
            expect(error.message).to.include('invalid backup data or an incorrect passphrase');

            // Verify that the vault contents are unchanged
            const currentStatus = await vaultStore.get('vaultStatus');
            const currentContentEncryptionKey = await vaultStore.get('contentEncryptionKey');
            const currentDid = await vaultStore.get('did');

            expect(currentStatus).to.deep.equal(previousStatus);
            expect(currentContentEncryptionKey).to.equal(previousContentEncryptionKey);
            expect(currentDid).to.equal(previousDid);
          }
        });

        it('throws an error if the vault is not initialized', async () => {
          try {
            await identityVault.backup();
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('vault has not been initialized');
          }
        });

        it('should throw an error if the existing vault contents are missing or inaccessible', async () => {
          const backup: IdentityVaultBackup = {
            data        : 'a.b.c.d.e',
            dateCreated : new Date().toISOString(),
            size        : 123
          };
          const passphrase = 'test-passphrase';

          try {
            vaultStore.delete('vaultStatus');
            await identityVault.restore({ backup, passphrase });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('restore operation cannot proceed');
            expect(error.message).to.include('vault contents are missing or inaccessible');
          }

          try {
            vaultStore.delete('did');
            await identityVault.restore({ backup, passphrase });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('restore operation cannot proceed');
            expect(error.message).to.include('vault contents are missing or inaccessible');
          }

          try {
            vaultStore.delete('contentEncryptionKey');
            await identityVault.restore({ backup, passphrase });
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
          let vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
          expect(vaultStatus.locked).to.be.true;

          // Initialize the vault.
          await identityVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;

          // Lock the vault.
          await identityVault.lock();

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.true;

          // Unock the vault.
          await identityVault.unlock({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;
        });

        it('returns true immediately if the vault is already unlocked', async () => {
          // Validate that the vault is not initialized and is locked.
          let vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
          expect(vaultStatus.locked).to.be.true;

          // Initialize the vault.
          await identityVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;

          // Unock the vault (which is already unlocked).
          await identityVault.unlock({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(vaultStatus.locked).to.be.false;
        });

        it('throws an error if the passphrase is incorrect', async () => {
          // Initialize the vault.
          await identityVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          try {
            await identityVault.unlock({ passphrase: 'incorrect-passphrase' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('incorrect passphrase');
          }
        });

        it('throws an error if the vault is not initialized', async () => {
          try {
            await identityVault.unlock({ passphrase: 'dumbbell-krakatoa-ditty' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('Vault has not been initialized');
          }
        });

        it('throws an error if the content encryption key data is missing', async () => {
          // Initialize the vault.
          await identityVault.initialize({ passphrase: 'dumbbell-krakatoa-ditty' });

          // Remove the content encryption key data.
          await vaultStore.delete('contentEncryptionKey');

          try {
            await identityVault.unlock({ passphrase: 'dumbbell-krakatoa-ditty' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('Unable to retrieve the Content Encryption Key');
          }
        });
      });
    });
  });
});