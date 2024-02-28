import type { Jwk } from '@web5/crypto';
import type { KeyValueStore } from '@web5/common';

import { HDKey } from 'ed25519-keygen/hdkey';
import { BearerDid, DidDht } from '@web5/dids';
import { Convert, MemoryStore } from '@web5/common';
import { wordlist } from '@scure/bip39/wordlists/english';
import { Ed25519, utils as cryptoUtils } from '@web5/crypto';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';

import type { Web5PlatformAgent } from './types/agent.js';
import type { JweHeaderParams } from './prototyping/crypto/jose/jwe.js';
import type { AppDataBackup, AppDataStatus, AppDataStore } from './types/app-data.js';

import { AgentCryptoApi } from './crypto-api.js';
import { Hkdf } from './prototyping/crypto/primitives/hkdf.js';
import { Pbkdf2 } from './prototyping/crypto/primitives/pbkdf2.js';
import { isPortableDid } from './prototyping/dids/utils.js';
import { CompactJwe } from './prototyping/crypto/jose/jwe.js';
import { DeterministicKeyGenerator } from './utils-internal.js';
import { AesKw } from './prototyping/crypto/primitives/aes-kw.js';
import { AesGcm } from './prototyping/crypto/primitives/aes-gcm.js';

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
 * Extended initialization parameters for AppDataVault, including the privateKey required for
 * encrypting the contents of the vault.
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

interface VaultContentProtectedHeader extends Pick<JweHeaderParams, 'alg' | 'enc' | 'iv' | 'tag' | 'cty'> {
  alg: string;
  enc: string;
  cty: string;
}

interface VaultContentKeyProtectedHeader extends Pick<JweHeaderParams, 'alg' | 'enc' | 'p2c' | 'p2s'> {
  alg: string;
  enc: string;
  p2c: number;
  p2s: string;
  cty: string;
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

function isNonEmptyPassphrase(obj: unknown): obj is string {
  return typeof obj === 'string' && obj !== null
    && obj.trim().length > 0;
}

/**
 * Type guard function to check if an object is a valid protected header for a JWE that contains
 * the Agent's vault contents encrypted with the vault content key (CEK).
 */
// function isValidVaultContentProtectedHeader(obj: unknown): obj is VaultContentProtectedHeader {
//   if (typeof obj !== 'object' || obj === null) {
//     return false;
//   }

//   // Define the required properties for the protected header.
//   const requiredProperties = ['alg', 'enc', 'iv', 'tag'];

//   // Check for the existence of all required properties.
//   const hasAllProperties = requiredProperties.every(prop => prop in obj);

//   return hasAllProperties;
// }

/**
 * Type guard function to check if an object is a valid protected header for a JWE that contains
 * the Agent's vault content key (CEK) encrypted with the Vault Unlock Key (VUK).
 */
function isValidVaultContentKeyProtectedHeader(obj: unknown): obj is VaultContentKeyProtectedHeader {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  // Define the required properties for the protected header.
  const requiredProperties = ['alg', 'cty', 'enc', 'p2c', 'p2s'];

  // Check for the existence of all required properties.
  const hasAllProperties = requiredProperties.every(prop => prop in obj);

  return hasAllProperties;
}

export class AppDataVault implements SecureAppDataStore {
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
  }): Promise<boolean> {
    // Step 1: Verify the data vault has already been initialized.
    const { initialized } = await this.getStatus();
    if (initialized !== true) {
      throw new Error(
        'AppDataVault: Unable to proceed with the change passphrase operation because the data ' +
        'vault has not been initialized. Please ensure the vault is properly initialized with a ' +
        'secure passphrase before trying again.'
      );
    }

    // Step 2: Verify the old passphrase is correct by attempting to change to the new passphrase.
    await this.lock();
    await this.unlock({ passphrase: oldPassphrase });

    // Step 3: Derive a new Vault Unlock Key (VUK) from the new `passphrase` and the stored `salt`.
    // The VUK serves as the key encryption key (KEK) when wrapping the Agent's vault private key.
    const salt = await this.getStoredSalt();
    const _newVaultUnlockKey = await this.deriveVaultUnlockKey({ passphrase: newPassphrase, salt });

    // Step 3: Re-encrypt the Agent's vault key (CEK) using the new VUK (aka KEK).
    // const vaultContents = await this.getStoredAgentDid();
    // const encryptedVaultContents = await XChaCha20Poly1305.encrypt({
    //   data  : Convert.string(vaultContents).toUint8Array(),
    //   key   : newVaultUnlockKey,
    //   nonce : cryptoUtils.randomBytes(12),
    // });

    // // Step 4: Update the vault with the new encrypted data
    // await this._store.set('vaultContents', Convert.uint8Array(encryptedVaultContents).toBase64Url());

    // // Update the vault's unlock key in memory (if you store this in persistent storage, it should be updated as well)
    // this._contentEncryptionKey = newVaultUnlockKey;

    // // Optional: Update any relevant metadata in your vault status, like the last updated timestamp

    return true; // Indicate success
  }

  public async getAgentDid(): Promise<BearerDid> {
    // Verify the data vault has been initialized and is unlocked.
    const { initialized, locked } = await this.getStatus();
    if (!(initialized === true && locked === false && this._contentEncryptionKey)) {
      throw new Error(`AppDataVault: Data vault has not been initialized and unlocked.`);
    }

    // Retrieve the Agent's encrypted DID record as compact JWE from the data store.
    const encryptedAgentDid = await this.getStoredAgentDid();

    // Initialize a Crypto API instance to decrypt the compact JWE.
    const cryptoApi = new AgentCryptoApi({ agent: {} as Web5PlatformAgent });

    // Decrypt the compact JWE to obtain the Agent DID as a byte array.
    const { plaintext: portableDidBytes } = await CompactJwe.decrypt({
      jwe        : encryptedAgentDid,
      key        : this._contentEncryptionKey,
      keyManager : cryptoApi
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
    // First, verify that the data vault was not previously initialized.
    const appDataStatus = await this.getStatus();
    if (appDataStatus.initialized === true) {
      throw new Error(`AppDataVault: Data vault already initialized.`);
    }

    // Verify that the passphrase is not empty.
    if (!isNonEmptyPassphrase) {
      throw new Error(`AppDataVault: Passphrase cannot be empty.`);
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
     * STEP 3: Derive the Agent's vault key, which serves as input keying material for:
     * - deriving the salt for that is used to derive the Vault Unlock Key (VUK)
     * - deriving the vault content encryption key (CEK)
     */

    // Derive the Agent's vault key from the root key.
    // Note: The Agent's vault key is derived using account 0 and index 0 so that it can be
    //       deterministically re-derived.
    const vaultHdKey = rootHdKey.derive(`m/44'/0'/0'/0'/0'`);






    /**
     * STEP 4: Derive the Agent's vault content encryption key (CEK) from the Agent's vault private
     * key and a non-secret static info value.
     */

    // A non-secret static info value is combined with the Agent's vault private key as input to
    // HKDF (Hash-based Key Derivation Function) to derive a 32-byte content encryption key (CEK).
    const contentEncryptionKeyBytes = await Hkdf.deriveKeyBytes({
      baseKeyBytes : vaultHdKey.privateKey, // input keying material
      hash         : 'SHA-512',             // hash function
      salt         : '',                    // empty salt because private key is sufficiently random
      info         : 'vault_cek',           // non-secret application specific information
      length       : 256                    // derived key length, in bits
    });

    // Convert the content encryption key bytes to a JWK to be used with A256GCM.
    const contentEncryptionKey = await AesGcm.bytesToPrivateKey({
      privateKeyBytes: contentEncryptionKeyBytes
    });








    /**
     * STEP 5: Derive the Vault Unlock Key (VUK) from the given `passphrase` and a `salt` derived
     * from the Agent's vault public key. The VUK serves as the key encryption key (KEK) when
     * wrapping the Agent's vault content encryption key (CEK).
     */

    // A non-secret static info value is combined with the Agent's vault public key as input to
    // HKDF (Hash-based Key Derivation Function) to derive a new 32-byte salt.
    const saltInput = await Hkdf.deriveKeyBytes({
      baseKeyBytes : vaultHdKey.publicKey,  // input keying material
      hash         : 'SHA-512',             // hash function
      salt         : '',                    // empty salt because private key is sufficiently random
      info         : 'vault_unlock_salt',   // non-secret application specific information
      length       : 32,                    // derived key length, in bytes
    });

    // Per {@link https://www.rfc-editor.org/rfc/rfc7518.html#section-4.8.1.1 | RFC 7518, Section 4.8.1.1},
    // the salt value used with PBES2 should be of the format (UTF8(Alg) || 0x00 || Salt Input),
    // where Alg is the "alg" (algorithm) Header Parameter value. This reduces the potential for a
    // precomputed dictionary attack (also known as a rainbow table attack).
    const algorithmBytes = Convert.string('PBES2-HS512+A256KW').toUint8Array();
    const salt = new Uint8Array([...algorithmBytes, 0x00, ...saltInput]);

    // Derive the vault unlock key (VUK) from the given `passphrase` and derived `salt`.
    // The VUK serves as the key encryption key (KEK) when wrapping the Agent's vault CEK.
    const vaultUnlockKey = await this.deriveVaultUnlockKey({ passphrase, salt });



    /**
     * STEP 6: Encrypt the Vault CEK using the KEK (aka VUK) with A256KW.
     */

    // Construct the JWE header.
    const contentKeyProtectedHeader: VaultContentKeyProtectedHeader = {
      alg : 'PBES2-HS512+A256KW',
      enc : 'A256GCM',
      cty : 'text/plain',
      p2c : this._keyDerivationWorkFactor,
      p2s : Convert.uint8Array(salt).toBase64Url()
    };

    // Encrypt the CEK with the "A128KW" algorithm using the PBKDF2 Derived Key.
    const contentKeyEncryptedKey = await AesKw.wrapKey({
      unwrappedKey  : contentEncryptionKey,
      encryptionKey : vaultUnlockKey
    });

    // Generate a 12-byte initialization vector to use with AES-GCM when encrypting the payload.
    const contentKeyInitializationVector = cryptoUtils.randomBytes(12);

    // Use the JWE header as Additional Authenticated Data when encrypting the data payload.
    const contentKeyProtectedHeaderB64U = Convert.object(contentKeyProtectedHeader).toBase64Url();
    const contentKeyAdditionalData = Convert.string(contentKeyProtectedHeaderB64U).toUint8Array();

    // Encrypt the payload using the CEK and AES-GCM.
    const contentKeyCiphertextWithTag = await AesGcm.encrypt({
      data           : Convert.string(`m/44'/0'/0'/0'/0'`).toUint8Array(),
      key            : contentEncryptionKey,
      iv             : contentKeyInitializationVector,
      additionalData : contentKeyAdditionalData
    });

    // Extract the ciphertext and tag from the encrypted payload.
    const contentKeyCiphertext = contentKeyCiphertextWithTag.slice(0, -16);
    const contentKeyAuthenticationTag = contentKeyCiphertextWithTag.slice(-16);


    // Serialize to a compact JWE.
    const contentKeyJwe = [
      contentKeyProtectedHeaderB64U,
      Convert.uint8Array(contentKeyEncryptedKey).toBase64Url(),
      Convert.uint8Array(contentKeyInitializationVector).toBase64Url(),
      Convert.uint8Array(contentKeyCiphertext).toBase64Url(),
      Convert.uint8Array(contentKeyAuthenticationTag).toBase64Url()
    ].join('.');

    // Store the compact JWE in the data store.
    await this._store.set('contentEncryptionKey', contentKeyJwe);




























    /**
     * STEP 6: Create the Agent's DID using identity, signing, and encryption keys derived from the
     * root key.
     */

    // Derive the Agent's identity key pair using index 0 and convert to JWK format.
    // Note: The account is set to Unix epoch time so that in the future, the keys for a DID DHT
    //       document can be deterministically derived based on the versionId returned in a DID
    //       resolution result.
    const identityHdKey = rootHdKey.derive(`m/44'/0'/1708523827'/0'/0'`);
    const identityPrivateKey = await Ed25519.bytesToPrivateKey({ privateKeyBytes: identityHdKey.privateKey });

    // Derive the Agent's signing key using index 1 and convert to JWK format.
    let signingHdKey = rootHdKey.derive(`m/44'/0'/1708523827'/0'/1'`);
    const signingPrivateKey = await Ed25519.bytesToPrivateKey({ privateKeyBytes: signingHdKey.privateKey });

    // TODO: Enable this once DID DHT supports X25519 keys.
    // Derive the Agent's encryption key using index 1 and convert to JWK format.
    // const encryptionHdKey = rootHdKey.derive(`m/44'/0'/1708523827'/0'/1'`);
    // const encryptionKeyEd25519 = await Ed25519.bytesToPrivateKey({ privateKeyBytes: encryptionHdKey.privateKey });
    // const encryptionKey = await Ed25519.convertPrivateKeyToX25519({ privateKey: encryptionKeyEd25519 });

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
          }
        ]
      }
    });

    /**
     * STEP 7: Encrypt the Agent's DID in portable format, which will be the payload of the JWE.
     */

    // Construct the JWE header.
    const protectedHeader: VaultContentProtectedHeader = {
      alg : 'dir',
      enc : 'A256GCM',
      cty : 'json'
    };

    // Generate a 12-byte initialization vector to use with AES-GCM when encrypting the payload.
    const payloadInitializationVector = cryptoUtils.randomBytes(12);

    // Use the JWE header as Additional Authenticated Data when encrypting the data payload.
    const protectedHeaderB64U = Convert.object(protectedHeader).toBase64Url();
    const payloadAdditionalData = Convert.string(protectedHeaderB64U).toUint8Array();

    // Convert the Agent's DID to a portable format as a byte array.
    const portableDid = await agentDid.export();
    const portableDidBytes = Convert.object(portableDid).toUint8Array();

    // Encrypt the Agent's DID in portable format with the Agent's vault key (CEK).
    const payloadCiphertextWithTag = await AesGcm.encrypt({
      data           : portableDidBytes,
      key            : contentEncryptionKey,
      iv             : payloadInitializationVector,
      additionalData : payloadAdditionalData
    });

    /**
     * STEP 8: Serialize the JWE to compact JWE format and store it in the data store.
     */

    // Extract the ciphertext and tag from the encrypted payload.
    const payloadCiphertext = payloadCiphertextWithTag.slice(0, -16);
    const payloadAuthenticationTag = payloadCiphertextWithTag.slice(-16);

    // Serialize to a compact JWE.
    const agentDidJwe = [
      protectedHeaderB64U,
      '',
      Convert.uint8Array(payloadInitializationVector).toBase64Url(),
      Convert.uint8Array(payloadCiphertext).toBase64Url(),
      Convert.uint8Array(payloadAuthenticationTag).toBase64Url()
    ].join('.');

    // Store the compact JWE in the data store.
    await this._store.set('agentDid', agentDidJwe);

    /**
     * STEP 8: Set the vault to initialized and unlocked.
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
        'AppDataVault: Restore operation failed due to an incorrect passphrase. ' +
        'Please verify the passphrase is correct for the provided backup and try again.'
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

    // Initialize a Crypto API instance to decrypt the compact JWE.
    const cryptoApi = new AgentCryptoApi({ agent: {} as Web5PlatformAgent });

    const test = await CompactJwe.decrypt({
      jwe        : cekJwe,
      key        : 'thing',
      keyManager : cryptoApi
    });



    // Decode the protected header.
    let [ encodedProtectedHeader, encodedEncryptedCek ] = cekJwe.split('.');
    const protectedHeader = Convert.base64Url(encodedProtectedHeader).toObject();

    // Ensure the protected header is valid for a CEK compact JWE.
    if (!isValidVaultContentKeyProtectedHeader(protectedHeader)) {
      throw new Error('AppDataVault: Invalid Content Encryption Key JWE protected header detected.');
    }

    // Convert the salt to bytes.
    const salt = Convert.base64Url(protectedHeader.p2s).toUint8Array();

    // Re-derive the Vault Unlock Key (VUK) from the given `passphrase` and stored `salt`.
    const vaultUnlockKey = await this.deriveVaultUnlockKey({ passphrase, salt });

    // Convert the encrypted content encryption key (CEK) to bytes.
    const encryptedCekBytes = Convert.base64Url(encodedEncryptedCek).toUint8Array();

    // Decrypt the Agent's vault content encryption key (CEK) using the Vault Unlock Key (VUK).
    let contentEncryptionKey: Jwk;
    try {
      contentEncryptionKey = await AesKw.unwrapKey({
        wrappedKeyBytes     : encryptedCekBytes,
        decryptionKey       : vaultUnlockKey,
        wrappedKeyAlgorithm : 'A256KW'
      });
    } catch (error: any) {
      // If the decryption fails, the vault is considered locked.
      await this.setStatus({ locked: true });
      throw new Error(`AppDataVault: Unable to unlock the vault due to an incorrect passphrase.`);
    }

    // Save the content encryption key in memory.
    this._contentEncryptionKey = contentEncryptionKey;

    // If the decryption is successful, the vault is considered unlocked.
    await this.setStatus({ locked: false });
  }

  private async deriveVaultUnlockKey({ passphrase, salt }: {
    passphrase: string;
    salt: Uint8Array;
  }): Promise<Jwk> {
    // The `passphrase` entered by the end-user and `salt` derived from the Agent's vault public
    // key are inputs to the PBKDF2 algorithm to derive a 32-byte secret key that will be referred
    // to as the Vault Unlock Key (VUK).
    const vaultUnlockKeyBytes = await Pbkdf2.deriveKeyBytes({
      baseKeyBytes : Convert.string(passphrase).toUint8Array(),
      hash         : 'SHA-512',
      iterations   : this._keyDerivationWorkFactor,
      salt         : salt,
      length       : 256
    });

    // Convert the derived key bytes to a JWK to be used with AES-KW.
    const vaultUnlockKey = await AesKw.bytesToPrivateKey({ privateKeyBytes: vaultUnlockKeyBytes });

    return vaultUnlockKey;
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

  private async getStoredSalt(): Promise<Uint8Array> {
    // Retrieve the content encryption key (CEK) record as a compact JWE from the data store.
    const cekJwe = await this.getStoredContentEncryptionKey();

    // Decode the protected header.
    let [ encodedProtectedHeader ] = cekJwe.split('.');
    const protectedHeader = Convert.base64Url(encodedProtectedHeader).toObject();

    // Ensure the protected header is valid for a CEK compact JWE.
    if (!isValidVaultContentKeyProtectedHeader(protectedHeader)) {
      throw new Error('AppDataVault: Invalid Content Encryption Key JWE protected header detected.');
    }

    // Convert the salt to bytes.
    const salt = Convert.base64Url(protectedHeader.p2s).toUint8Array();

    return salt;
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