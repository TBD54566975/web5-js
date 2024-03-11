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
      });

      beforeEach(async () => {
        await vaultStore.clear();
        identityVault = new HdIdentityVault({
          store                   : vaultStore,
          keyDerivationWorkFactor : 1
        });
      });

      afterEach(async () => {
        await vaultStore.clear();
      });

      after(async () => {
        await vaultStore.close();
      });

      describe('backup()', () => {
        it('backs up the vault', async () => {
          // Initialize the vault.
          await identityVault.initialize({ password: 'dumbbell-krakatoa-ditty' });

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

      describe('changePassword()', () => {
        it('changes the password', async () => {
          // Initialize the vault.
          await identityVault.initialize({ password: 'dumbbell-krakatoa-ditty' });

          // Change the password.
          const newPassword = 'brick-shield-anchor';
          await identityVault.changePassword({ oldPassword: 'dumbbell-krakatoa-ditty', newPassword });

          // Verify that the vault is initialized and is unlocked.
          const vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(identityVault.isLocked()).to.be.false;
        });

        it('throws an error if the vault is not initialized', async () => {
          try {
            await identityVault.changePassword({ oldPassword: 'dumbbell-krakatoa-ditty', newPassword: 'brick-shield-anchor' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('vault has not been initialized');
          }
        });

        it('throws an error if decryption fails due to an incorrect old password', async () => {
          // Initialize the vault with a known password.
          const correctPassword = 'correct-horse-battery-staple';
          await identityVault.initialize({ password: correctPassword });

          // Attempt to change the password using an incorrect old password.
          const incorrectOldPassword = 'incorrect-old-password';
          const newPassword = 'new-super-secure-password';

          try {
            await identityVault.changePassword({
              oldPassword : incorrectOldPassword,
              newPassword : newPassword
            });
            // If no error is thrown, the test should fail.
            expect.fail('Expected an error to be thrown due to incorrect old password.');
          } catch (error: any) {
            expect(error.message).to.include('incorrectly entered old password');

            // Verify that the vault is locked after the failed decryption attempt.
            expect(identityVault.isLocked()).to.be.true;
          }
        });
      });

      describe('getStatus()', () => {
        it('returns initialized=false when first instantiated', async () => {
          const vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
        });

        it('returns initialized=true after initialization', async () => {
          // Mock initialization having been completed.
          await vaultStore.set(
            'vaultStatus',
            JSON.stringify({
              initialized : true,
              lastBackup  : null,
              lastRestore : null
            })
          );

          const vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
        });
      });

      describe('getDid()', () => {
        it('returns the DID for an initialized vault', async () => {
          // Initialize the vault.
          await identityVault.initialize({ password: 'dumbbell-krakatoa-ditty' });

          const did = await identityVault.getDid();

          expect(did).to.exist;
          expect(did).to.have.property('uri');
          expect(did).to.have.property('document');
          expect(did).to.have.property('metadata');
          expect(did).to.have.property('keyManager');
        });

        it('deterministically returns a DID given a recovery phrase', async () => {
          // Initialize the vault.
          await identityVault.initialize({
            password       : 'dumbbell-krakatoa-ditty',
            recoveryPhrase : 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
          });

          const did = await identityVault.getDid();

          // Verify that the expected DID URI is returned given the recovery phrase.
          expect(did).to.have.property('uri', 'did:dht:qftx7z968xcpfy1a1diu75pg5meap3gdtg6ezagaw849wdh6oubo');
        });

        it('throws an error if the vault is not initialized and unlocked', async () => {
          try {
            await identityVault.getDid();
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('has not been initialized and unlocked');
          }
        });
      });

      describe('initialize()', () => {
        it('initializes and unlocks the vault', async () => {
          // Verify that the vault is not initialized and is locked.
          let vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
          expect(identityVault.isLocked()).to.be.true;

          // Initialize the vault.
          const password = 'dumbbell-krakatoa-ditty';
          await identityVault.initialize({ password });

          // Verify that the vault is initialized and is unlocked.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(identityVault.isLocked()).to.be.false;
        });

        it('generates and returns a 12-word mnenomic if one is not provided', async () => {
          // Initialize the vault.
          const generatedRecoveryPhrase = await identityVault.initialize({
            password: 'dumbbell-krakatoa-ditty'
          });

          // Verify that the vault is initialized and is unlocked.
          expect(generatedRecoveryPhrase).to.be.a('string');
          expect(generatedRecoveryPhrase.split(' ')).to.have.lengthOf(12);
        });

        it('accepts a recovery phrase', async () => {
          const predefinedRecoveryPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

          // Initialize the vault with a recovery phrase.
          const returnedRecoveryPhrase = await identityVault.initialize({
            password       : 'dumbbell-krakatoa-ditty',
            recoveryPhrase : predefinedRecoveryPhrase
          });

          // Verify that the vault is initialized and is unlocked.
          expect(returnedRecoveryPhrase).to.equal(predefinedRecoveryPhrase);
        });

        it('throws an error if the vault is already initialized', async () => {
          // Initialize the vault.
          await identityVault.initialize({ password: 'dumbbell-krakatoa-ditty' });

          try {
            await identityVault.initialize({ password: 'dumbbell-krakatoa-ditty' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('Vault has already been initialized');
          }
        });

        it('throws an error if the password is empty', async () => {
          try {
            await identityVault.initialize({ password: '' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('password is required and cannot be blank');
          }
        });
      });

      describe('isInitialized()', () => {
        it('returns false for a newly instantiated vault', async () => {
          const isInitialized = await identityVault.isInitialized();
          expect(isInitialized).to.be.false;
        });

        it('returns true after the vault has been initialized', async () => {
          await identityVault.initialize({ password: 'secure-password' });
          const isInitialized = await identityVault.isInitialized();
          expect(isInitialized).to.be.true;
        });

        it('returns false after the vault has been cleared', async () => {
          await identityVault.initialize({ password: 'secure-password' });
          await vaultStore.clear();
          const isInitialized = await identityVault.isInitialized();
          expect(isInitialized).to.be.false;
        });
      });

      describe('isLocked()', () => {
        it('returns true if the vault is locked', async () => {
          await identityVault.initialize({ password: 'secure-password' });
          await identityVault.lock();
          const isLocked = identityVault.isLocked();
          expect(isLocked).to.be.true;
        });

        it('returns false if the vault is unlocked', async () => {
          await identityVault.initialize({ password: 'secure-password' });
          const isLocked = identityVault.isLocked();
          expect(isLocked).to.be.false;
        });

        it('returns true for a newly instantiated vault', async () => {
          const isLocked = identityVault.isLocked();
          expect(isLocked).to.be.true;
        });
      });

      describe('restore()', () => {
        it('restores the vault from a backup', async () => {
          const password = 'dumbbell-krakatoa-ditty';

          // Initialize the vault.
          await identityVault.initialize({ password });

          // Backup the vault.
          const encryptedBackup = await identityVault.backup();

          // The vault should not have been restored.
          let vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.lastRestore).to.be.null;

          // Restore the vault from the backup.
          await identityVault.restore({ password, backup: encryptedBackup });

          // Verify the results.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.lastRestore).to.be.string;
          expect(vaultStatus.initialized).to.be.true;
          expect(identityVault.isLocked()).to.be.false;
        });

        it('reverts to the previous vault contents if conversion of backup data fails', async () => {
          const backup: IdentityVaultBackup = {
            data        : 'invalid-backup-data',
            dateCreated : new Date().toISOString(),
            size        : 123
          };

          const password = 'dumbbell-krakatoa-ditty';

          // Initialize the vault.
          await identityVault.initialize({ password });

          // Mock the initial vault state
          const previousStatus = await vaultStore.get('vaultStatus');
          const previousContentEncryptionKey = await vaultStore.get('contentEncryptionKey');
          const previousDid = await vaultStore.get('did');

          try {
            await identityVault.restore({ backup, password });
            expect.fail('Expected an error to be thrown due to backup data conversion failure.');
          } catch (error: any) {
            expect(error.message).to.include('invalid backup data or an incorrect password');

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

        it('throws an error if the existing vault contents are missing or inaccessible', async () => {
          const backup: IdentityVaultBackup = {
            data        : 'a.b.c.d.e',
            dateCreated : new Date().toISOString(),
            size        : 123
          };
          const password = 'test-password';

          try {
            vaultStore.delete('vaultStatus');
            await identityVault.restore({ backup, password });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('restore operation cannot proceed');
            expect(error.message).to.include('vault contents are missing or inaccessible');
          }

          try {
            vaultStore.delete('did');
            await identityVault.restore({ backup, password });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('restore operation cannot proceed');
            expect(error.message).to.include('vault contents are missing or inaccessible');
          }

          try {
            vaultStore.delete('contentEncryptionKey');
            await identityVault.restore({ backup, password });
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
          expect(identityVault.isLocked()).to.be.true;

          // Initialize the vault.
          await identityVault.initialize({ password: 'dumbbell-krakatoa-ditty' });

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(identityVault.isLocked()).to.be.false;

          // Lock the vault.
          await identityVault.lock();

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(identityVault.isLocked()).to.be.true;

          // Unock the vault.
          await identityVault.unlock({ password: 'dumbbell-krakatoa-ditty' });

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(identityVault.isLocked()).to.be.false;
        });

        it('unlocks an unlocked vault', async () => {
          // Validate that the vault is not initialized and is locked.
          let vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
          expect(identityVault.isLocked()).to.be.true;

          // Initialize the vault.
          await identityVault.initialize({ password: 'dumbbell-krakatoa-ditty' });

          // Validate that the vault is now initialized and unlocked.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(identityVault.isLocked()).to.be.false;

          // Unock the vault (which is already unlocked).
          await identityVault.unlock({ password: 'dumbbell-krakatoa-ditty' });

          // Validate that the vault is initialized and unlocked.
          vaultStatus = await identityVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
          expect(identityVault.isLocked()).to.be.false;
        });

        it('throws an error if the password is incorrect', async () => {
          // Initialize the vault.
          await identityVault.initialize({ password: 'dumbbell-krakatoa-ditty' });

          try {
            await identityVault.unlock({ password: 'incorrect-password' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('incorrect password');
          }
        });

        it('throws an error if the vault is not initialized', async () => {
          try {
            await identityVault.unlock({ password: 'dumbbell-krakatoa-ditty' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('Vault has not been initialized');
          }
        });

        it('throws an error if the content encryption key data is missing', async () => {
          // Initialize the vault.
          await identityVault.initialize({ password: 'dumbbell-krakatoa-ditty' });

          // Remove the content encryption key data.
          await vaultStore.delete('contentEncryptionKey');

          try {
            await identityVault.unlock({ password: 'dumbbell-krakatoa-ditty' });
            expect.fail('Expected an error to be thrown.');
          } catch (error: any) {
            expect(error.message).to.include('Unable to retrieve the Content Encryption Key');
          }
        });
      });
    });
  });
});