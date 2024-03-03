import type { Jwk } from '@web5/crypto';
import type { KeyValueStore } from '@web5/common';

import { HDKey } from 'ed25519-keygen/hdkey';
import { BearerDid, DidDht } from '@web5/dids';
import { Convert, MemoryStore } from '@web5/common';
import { wordlist } from '@scure/bip39/wordlists/english';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';

import type { JweHeaderParams } from './prototyping/crypto/jose/jwe.js';
import type { AppDataBackup, AppDataStatus, AppDataStore } from './types/app-data.js';

import { AgentCryptoApi } from './crypto-api.js';
import { LocalKeyManager } from './local-key-manager.js';
import { isPortableDid } from './prototyping/dids/utils.js';
import { CompactJwe } from './prototyping/crypto/jose/jwe.js';
import { DeterministicKeyGenerator } from './utils-internal.js';

/**
 * An extension of the AppDataStore interface which secures the contents of the store.
 */
export interface SecureAppDataStore extends AppDataStore<{ InitializeResult: string }> {
  /**
   * Initializes the AppDataStore instance with the given `passphrase` and returns the mnemonic
   * used to generate the Agent's DID if the initialization operation was successful.
   */
  initialize(params: { passphrase: string }): Promise<string>;
}

/**
 * Extended initialization parameters for AppDataVault, including an optional mnemonic that can be
 * used to derive keys to encrypt the vault and generate the Agent's DID.
 */
export type AppDataVaultInitializeParams = {
  passphrase: string;
  mnemonic?: string;
};

export type AppDataBackupObject = {
  agentDid: string;
  contentEncryptionKey: string;
  status: AppDataStatus;
};

export type AppDataVaultParams = {
  keyDerivationWorkFactor?: number;
  store?: KeyValueStore<string, any>;
}

function isAppDataStatus(obj: unknown): obj is AppDataStatus {
  return typeof obj === 'object' && obj !== null
    && 'initialized' in obj && typeof obj.initialized === 'boolean'
    && 'locked' in obj && typeof obj.locked === 'boolean'
    && 'lastBackup' in obj
    && 'lastRestore' in obj;
}

function isAppDataBackup(obj: unknown): obj is AppDataBackup {
  return typeof obj === 'object' && obj !== null
    && 'dateCreated' in obj && typeof obj.dateCreated === 'string'
    && 'size' in obj && typeof obj.size === 'number'
    && 'data' in obj && typeof obj.data === 'string';
}

function isEmptyPassphrase(obj: unknown): obj is string {
  return typeof obj !== 'string' || obj.trim().length === 0;
}

export class AppDataVault implements SecureAppDataStore {
  public crypto = new AgentCryptoApi();

  private _keyDerivationWorkFactor: number;
  private _store: KeyValueStore<string, string>;
  private _contentEncryptionKey: Jwk | undefined;

  constructor({ keyDerivationWorkFactor, store }: AppDataVaultParams = {}) {
    this._keyDerivationWorkFactor = keyDerivationWorkFactor ?? 210_000;
    this._store = store ?? new MemoryStore<string, string>();

    // Set the initial status of the vault.
    this.setStatus({ initialized: false });
  }

  public async backup(): Promise<AppDataBackup> {
    // Verify the data vault has already been initialized and unlocked.
    const { initialized, locked } = await this.getStatus();
    if (!(initialized === true && locked === false && this._contentEncryptionKey)) {
      throw new Error(
        'AppDataVault: Unable to proceed with the backup operation because the data vault has ' +
        'not been initialized and unlocked. Please ensure the vault is properly initialized with ' +
        ' a secure passphrase before attempting to backup its contents.'
      );
    }

    // Encode the encrypted CEK and Agent DID as a single Base64Url string.
    const backupDataObject: AppDataBackupObject = {
      agentDid             : await this.getStoredAgentDid(),
      contentEncryptionKey : await this.getStoredContentEncryptionKey(),
      status               : await this.getStatus()
    };
    const backupDataString = Convert.object(backupDataObject).toBase64Url();

    // Create a backup object containing the encrypted vault contents.
    const backup: AppDataBackup = {
      data        : backupDataString,
      dateCreated : new Date().toISOString(),
      size        : backupDataString.length
    };

    // Update the last backup date in the data store.
    await this.setStatus({ lastBackup: backup.dateCreated });

    return backup;
  }

  public async changePassphrase({ oldPassphrase, newPassphrase }: {
    oldPassphrase: string;
    newPassphrase: string;
  }): Promise<void> {
    // Verify the data vault has already been initialized.
    const { initialized } = await this.getStatus();
    if (initialized !== true) {
      throw new Error(
        'AppDataVault: Unable to proceed with the change passphrase operation because the data ' +
        'vault has not been initialized. Please ensure the vault is properly initialized with a ' +
        'secure passphrase before trying again.'
      );
    }

    // Lock the vault.
    await this.lock();

    // Retrieve the content encryption key (CEK) record as a compact JWE from the data store.
    const cekJwe = await this.getStoredContentEncryptionKey();

    // Decrypt the compact JWE using the given `oldPassphrase` to verify it is correct.
    let protectedHeader: JweHeaderParams;
    let contentEncryptionKey: Jwk;
    try {
      let contentEncryptionKeyBytes: Uint8Array;
      ({ plaintext: contentEncryptionKeyBytes, protectedHeader } = await CompactJwe.decrypt({
        jwe        : cekJwe,
        key        : Convert.string(oldPassphrase).toUint8Array(),
        crypto     : this.crypto,
        keyManager : new LocalKeyManager()
      }));
      contentEncryptionKey = Convert.uint8Array(contentEncryptionKeyBytes).toObject() as Jwk;

    } catch (error: any) {
      // If the decryption fails, the vault is considered locked.
      await this.setStatus({ locked: true });
      throw new Error(`AppDataVault: Unable to change the vault passphrase due to an incorrectly entered old passphrase.`);
    }

    // Re-encrypt the Agent's vault content encryption key (CEK) using the new passphrase.
    const newCekJwe = await CompactJwe.encrypt({
      key        : Convert.string(newPassphrase).toUint8Array(),
      protectedHeader, // Re-use the protected header from the original JWE.
      plaintext  : Convert.object(contentEncryptionKey).toUint8Array(),
      crypto     : this.crypto,
      keyManager : new LocalKeyManager()
    });

    // Update the vault with the new CEK JWE.
    await this._store.set('contentEncryptionKey', newCekJwe);

    // Update the Agent's vault CEK in memory.
    this._contentEncryptionKey = contentEncryptionKey;

    // Set the vault to unlocked.
    await this.setStatus({ locked: false });
  }

  public async getAgentDid(): Promise<BearerDid> {
    // Verify the data vault has been initialized and is unlocked.
    const { initialized, locked } = await this.getStatus();
    if (!(initialized === true && locked === false && this._contentEncryptionKey)) {
      throw new Error(`AppDataVault: Data vault has not been initialized and unlocked.`);
    }

    // Retrieve the Agent's encrypted DID record as compact JWE from the data store.
    const encryptedAgentDid = await this.getStoredAgentDid();

    // Decrypt the compact JWE to obtain the Agent DID as a byte array.
    const { plaintext: portableDidBytes } = await CompactJwe.decrypt({
      jwe        : encryptedAgentDid,
      key        : this._contentEncryptionKey,
      crypto     : this.crypto,
      keyManager : new LocalKeyManager()
    });

    // Convert the Agent's DID from a byte array to PortableDid format.
    const portableDid = Convert.uint8Array(portableDidBytes).toObject();
    if (!isPortableDid(portableDid)) {
      throw new Error('AppDataVault: Unable to decode malformed Agent DID in data vault');
    }

    // Return the Agent's DID in Bearer DID format.
    return await BearerDid.import({ portableDid });
  }

  public async getStatus(): Promise<AppDataStatus> {
    const storedStatus = await this._store.get('appDataStatus');

    // On the first run, the store will not contain an AppDataStatus object yet, so return an
    // uninitialized status.
    if (!storedStatus) {
      return {
        initialized : false,
        locked      : true,
        lastBackup  : null,
        lastRestore : null
      };
    }

    const appDataStatus = Convert.string(storedStatus).toObject();
    if (!isAppDataStatus(appDataStatus)) {
      throw new Error('AppDataVault: Invalid AppDataStatus object in store');
    }

    return appDataStatus;
  }

  public async initialize({ mnemonic, passphrase }: AppDataVaultInitializeParams): Promise<string> {
    /**
     * STEP 0: Validate the input parameters and verify the data vault is not already initialized.
     */

    // Verify that the data vault was not previously initialized.
    const appDataStatus = await this.getStatus();
    if (appDataStatus.initialized === true) {
      throw new Error(`AppDataVault: Data vault has already been initialized.`);
    }

    // Verify that the passphrase is not empty.
    if (isEmptyPassphrase(passphrase)) {
      throw new Error(
        `AppDataVault: The passphrase is required and cannot be blank. Please provide a valid, ' +
        'non-empty passphrase.`
      );
    }

    /**
     * STEP 1: Derive the Agent's HD (Hierarchical Deterministic) key pair from the given
     * (or generated) mnemonic.
     */

    // Generate a 12-word (128-bit) mnemonic, if one was not provided.
    mnemonic ??= generateMnemonic(wordlist, 128);

    // Validate the mnemonic for being 12-24 words contained in `wordlist`.
    if (!validateMnemonic(mnemonic, wordlist)) {
      throw new Error('AppDataVault: Invalid mnemonic');
    }

    // Derive a root seed from the mnemonic.
    const rootSeed = mnemonicToSeedSync(mnemonic);

    // Derive a root key for the Agent DID from the root seed.
    const rootHdKey = HDKey.fromMasterSeed(rootSeed);

    /**
     * STEP 2: Derive the Agent's vault key, which serves as input keying material for:
     * - deriving the salt for that is used to derive the Vault Unlock Key (VUK)
     * - deriving the vault content encryption key (CEK)
     */

    // Derive the Agent's vault key from the root key.
    // Note: The Agent's vault key is derived using account 0 and index 0 so that it can be
    //       deterministically re-derived.
    const vaultHdKey = rootHdKey.derive(`m/44'/0'/0'/0'/0'`);

    /**
     * STEP 3: Derive the Agent's vault Content Encryption Key (CEK) from the Agent's vault private
     * key and a non-secret static info value.
     */

    // A non-secret static info value is combined with the Agent's vault private key as input to
    // HKDF (Hash-based Key Derivation Function) to derive a 32-byte content encryption key (CEK).
    const contentEncryptionKey = await this.crypto.deriveKey({
      algorithm           : 'HKDF-512',            // key derivation function
      baseKeyBytes        : vaultHdKey.privateKey, // input keying material
      salt                : '',                    // empty salt because private key is sufficiently random
      info                : 'vault_cek',           // non-secret application specific information
      derivedKeyAlgorithm : 'A256GCM'              // derived key algorithm
    });

    /**
     * STEP 4: Using the given `passphrase` and a `salt` derived from the Agent's vault public key,
     * encrypt the Agent's vault CEK and store it in the data store.
     */

    // A non-secret static info value is combined with the Agent's vault public key as input to
    // HKDF (Hash-based Key Derivation Function) to derive a new 32-byte salt.
    const saltInput = await this.crypto.deriveKeyBytes({
      algorithm    : 'HKDF-512',           // key derivation function
      baseKeyBytes : vaultHdKey.publicKey, // input keying material
      salt         : '',                   // empty salt because private key is sufficiently random
      info         : 'vault_unlock_salt',  // non-secret application specific information
      length       : 256,                  // derived key length, in bits
    });

    // Construct the JWE header.
    const cekJweProtectedHeader: JweHeaderParams = {
      alg : 'PBES2-HS512+A256KW',
      enc : 'A256GCM',
      cty : 'text/plain',
      p2c : this._keyDerivationWorkFactor,
      p2s : Convert.uint8Array(saltInput).toBase64Url()
    };

    // Encrypt the Agent's vault content encryption key (CEK) to compact JWE format.
    const cekJwe = await CompactJwe.encrypt({
      key             : Convert.string(passphrase).toUint8Array(),
      protectedHeader : cekJweProtectedHeader,
      plaintext       : Convert.object(contentEncryptionKey).toUint8Array(),
      crypto          : this.crypto,
      keyManager      : new LocalKeyManager()
    });

    // Store the compact JWE in the data store.
    await this._store.set('contentEncryptionKey', cekJwe);

    /**
     * STEP 5: Create the Agent's DID using identity, signing, and encryption keys derived from the
     * root key.
     */

    // Derive the Agent's identity key pair using index 0 and convert to JWK format.
    // Note: The account is set to Unix epoch time so that in the future, the keys for a DID DHT
    //       document can be deterministically derived based on the versionId returned in a DID
    //       resolution result.
    const identityHdKey = rootHdKey.derive(`m/44'/0'/1708523827'/0'/0'`);
    const identityPrivateKey = await this.crypto.bytesToPrivateKey({
      algorithm       : 'Ed25519',
      privateKeyBytes : identityHdKey.privateKey
    });

    // Derive the Agent's signing key using index 1 and convert to JWK format.
    let signingHdKey = rootHdKey.derive(`m/44'/0'/1708523827'/0'/1'`);
    const signingPrivateKey = await this.crypto.bytesToPrivateKey({
      algorithm       : 'Ed25519',
      privateKeyBytes : signingHdKey.privateKey
    });

    // TODO: Enable this once DID DHT supports X25519 keys.
    // Derive the Agent's encryption key using index 1 and convert to JWK format.
    // const encryptionHdKey = rootHdKey.derive(`m/44'/0'/1708523827'/0'/1'`);
    // const encryptionKeyEd25519 = await this.crypto.bytesToPrivateKey({
    //   algorithm       : 'Ed25519',
    //   privateKeyBytes : encryptionHdKey.privateKey
    // });
    // const encryptionPrivateKey = await Ed25519.convertPrivateKeyToX25519({ privateKey: encryptionKeyEd25519 });

    // Add the Agent's identity and signing keys to the deterministic key generator so that when the
    // Agent DID is created it will use the derived keys.
    const deterministicKeyGenerator = new DeterministicKeyGenerator();
    await deterministicKeyGenerator.addPredefinedKeys({ privateKeys: [ identityPrivateKey, signingPrivateKey] });

    // Create the Agent's DID using the derived identity, signing, and encryption keys.
    const agentDid = await DidDht.create({
      keyManager : deterministicKeyGenerator,
      options    : {
        verificationMethods: [
          {
            algorithm : 'Ed25519',
            id        : 'sig',
            purposes  : ['assertionMethod', 'authentication']
          },
          // TODO: Enable this once DID DHT supports X25519 keys.
          // {
          //   algorithm : 'X25519',
          //   id        : 'enc',
          //   purposes  : ['keyAgreement']
          // }
        ]
      }
    });

    /**
     * STEP 6: Convert the Agent's DID to portable format and store it in the data store as a
     * compact JWE.
     */

    // Construct the JWE header.
    const agentDidJweProtectedHeader: JweHeaderParams = {
      alg : 'dir',
      enc : 'A256GCM',
      cty : 'json'
    };

    // Convert the Agent's DID to a portable format.
    const portableDid = await agentDid.export();

    const agentDidJwe = await CompactJwe.encrypt({
      key             : contentEncryptionKey,
      plaintext       : Convert.object(portableDid).toUint8Array(),
      protectedHeader : agentDidJweProtectedHeader,
      crypto          : this.crypto,
      keyManager      : new LocalKeyManager()
    });

    // Store the compact JWE in the data store.
    await this._store.set('agentDid', agentDidJwe);

    /**
     * STEP 7: Set the vault to initialized and unlocked and return the mnemonic used to generate
     * the Agent's vault CEK and DID.
     */

    this._contentEncryptionKey = contentEncryptionKey;

    await this.setStatus({ initialized: true, locked: false });

    // Return the mnemonic in case it was generated so that it can be displayed to the user for
    // safekeeping.
    return mnemonic;
  }

  public async lock(): Promise<void> {
    // Verify the data vault has already been initialized.
    const { initialized } = await this.getStatus();
    if (initialized !== true) {
      throw new Error(`AppDataVault: Lock operation failed. Data vault has not been initialized.`);
    }

    // Clear the vault content encryption key (CEK) from memory.
    if (this._contentEncryptionKey) this._contentEncryptionKey.k = '';
    this._contentEncryptionKey = undefined;

    // Set the vault to locked.
    await this.setStatus({ initialized: true, locked: true });
  }

  public async restore({ backup, passphrase }: {
    backup: AppDataBackup;
    passphrase: string;
  }): Promise<void> {
    // Validate the backup object.
    if (!isAppDataBackup(backup)) {
      throw new Error(`AppDataVault: Restore operation failed due to invalid backup object.`);
    }

    // Temporarily save the status and contents of the data store while attempting to restore the
    // backup so that they are not lost in case the restore operation fails.
    let previousStatus: AppDataStatus;
    let previousContentEncryptionKey: string;
    let previousAgentDid: string;
    try {
      previousAgentDid = await this.getStoredAgentDid();
      previousContentEncryptionKey = await this.getStoredContentEncryptionKey();
      previousStatus = await this.getStatus();
    } catch {
      throw new Error(
        'AppDataVault: The restore operation cannot proceed because the existing vault contents ' +
        'are missing or inaccessible. If the problem persists consider re-initializing the vault' +
        'and retrying the restore.'
      );
    }

    try {
      // Convert the backup data back to a JSON object.
      const backupDataObject = Convert.base64Url(backup.data).toObject() as AppDataBackupObject;

      // Restore the backup to the data store.
      await this._store.set('agentDid', backupDataObject.agentDid);
      await this._store.set('contentEncryptionKey', backupDataObject.contentEncryptionKey);
      await this.setStatus(backupDataObject.status);

      // Attempt to unlock the vault with the given `passphrase`.
      await this.unlock({ passphrase });

    } catch (error: any) {
      // If the restore operation fails, revert the data store to the status and contents that were
      // saved before the restore operation was attempted.
      await this.setStatus(previousStatus);
      await this._store.set('contentEncryptionKey', previousContentEncryptionKey);
      await this._store.set('agentDid', previousAgentDid);

      throw new Error(
        'AppDataVault: Restore operation failed due to invalid backup data or an incorrect ' +
        'passphrase. Please verify the passphrase is correct for the provided backup and try again.'
      );
    }

    // Update the status of the vault.
    await this.setStatus({
      lastRestore: new Date().toISOString()
    });
  }

  public async unlock({ passphrase }: { passphrase: string }): Promise<void> {
    // Verify the data vault has already been initialized.
    const { initialized } = await this.getStatus();
    if (initialized !== true) {
      throw new Error(`AppDataVault: Unlock operation failed. Data vault has not been initialized.`);
    }

    // Lock the vault.
    await this.lock();

    // Retrieve the content encryption key (CEK) record as a compact JWE from the data store.
    const cekJwe = await this.getStoredContentEncryptionKey();

    // Decrypt the compact JWE.
    try {
      const { plaintext: contentEncryptionKeyBytes } = await CompactJwe.decrypt({
        jwe        : cekJwe,
        key        : Convert.string(passphrase).toUint8Array(),
        crypto     : this.crypto,
        keyManager : new LocalKeyManager()
      });
      const contentEncryptionKey = Convert.uint8Array(contentEncryptionKeyBytes).toObject() as Jwk;

      // Save the content encryption key in memory.
      this._contentEncryptionKey = contentEncryptionKey;

    } catch (error: any) {
      // If the decryption fails, the vault is considered locked.
      await this.setStatus({ locked: true });
      throw new Error(`AppDataVault: Unable to unlock the vault due to an incorrect passphrase.`);
    }

    // If the decryption is successful, the vault is considered unlocked.
    await this.setStatus({ locked: false });
  }

  private async getStoredAgentDid(): Promise<string> {
    // Retrieve the Agent's DID record as a compact JWE from the data store.
    const agentDidJwe = await this._store.get('agentDid');

    if (!agentDidJwe) {
      throw new Error(
        'AppDataVault: Unable to retrieve the Agent DID record from the vault. Please check the ' +
        'vault status and if the problem persists consider re-initializing the vault and ' +
        'restoring the contents from a previous backup.'
      );
    }

    return agentDidJwe;
  }

  private async getStoredContentEncryptionKey(): Promise<string> {
    // Retrieve the content encryption key (CEK) record as a compact JWE from the data store.
    const cekJwe = await this._store.get('contentEncryptionKey');

    if (!cekJwe) {
      throw new Error(
        'AppDataVault: Unable to retrieve the Content Encryption Key record from the vault. ' +
        'Please check the vault status and if the problem persists consider re-initializing the ' +
        'vault and restoring the contents from a previous backup.'
      );
    }

    return cekJwe;
  }

  private async setStatus({ initialized, locked, lastBackup, lastRestore }: Partial<AppDataStatus>): Promise<boolean> {
    // Get the current status values from the store, if any.
    let appDataStatus = await this.getStatus();

    // Update the status properties with new values specified, if any.
    appDataStatus.initialized = initialized ?? appDataStatus.initialized;
    appDataStatus.locked = locked ?? appDataStatus.locked;
    appDataStatus.lastBackup = lastBackup ?? appDataStatus.lastBackup;
    appDataStatus.lastRestore = lastRestore ?? appDataStatus.lastRestore;

    // Write the changes to the store.
    await this._store.set('appDataStatus', JSON.stringify(appDataStatus));

    return true;
  }
}