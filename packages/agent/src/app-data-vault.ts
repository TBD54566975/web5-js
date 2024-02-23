import type { JweHeaderParams, Jwk } from '@web5/crypto';
import type { KeyValueStore } from '@web5/common';

import { HDKey } from 'ed25519-keygen/hdkey';
import { BearerDid, DidDht } from '@web5/dids';
import { Convert, MemoryStore } from '@web5/common';
import { wordlist } from '@scure/bip39/wordlists/english';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { Ed25519, POLY1305_TAG_LENGTH, Pbkdf2, XChaCha20Poly1305, utils as cryptoUtils } from '@web5/crypto';

import type { AppDataBackup, AppDataStatus, AppDataStore } from './types/app-data.js';

import { Hkdf } from './temp/add-to-crypto.js';
import { isPortableDid } from './temp/add-to-dids.js';
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

export interface SecureAppDataStatus extends AppDataStatus {
  /**
   * Boolean indicating whether the SecureAppDataStore is currently locked.
   */
  locked: boolean;
}

/**
 * Extended initialization parameters for AppDataVault, including the privateKey required for
 * encrypting the contents of the vault.
 */
export type AppDataVaultInitializeParams = {
  passphrase: string;
  mnemonic?: string;
};

export type AppDataVaultParams = {
  keyDerivationWorkFactor?: number;
  store?: KeyValueStore<string, any>;
}

interface AppDataVaultProtectedHeader extends Omit<JweHeaderParams, 'iv' | 'tag'> {
  alg: string;
  enc: string;
  p2c: number;
  p2s: string;
  iv: string;
  tag: string;
}

function isSecureAppDataStatus(obj: unknown): obj is SecureAppDataStatus {
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
 * Type guard function to check if an object is a valid ProtectedHeader.
 */
function isValidProtectedHeader(obj: unknown): obj is AppDataVaultProtectedHeader {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  // Define the required properties for the protected header.
  const requiredProperties = ['alg', 'enc', 'iv', 'p2c', 'p2s', 'tag'];

  // Check for the existence of all required properties.
  const hasAllProperties = requiredProperties.every(prop => prop in obj);

  return hasAllProperties;
}

export class AppDataVault implements SecureAppDataStore {
  private _keyDerivationWorkFactor: number;
  private _store: KeyValueStore<string, string>;
  private _vaultUnlockKey: Jwk | undefined;

  constructor({ keyDerivationWorkFactor, store }: AppDataVaultParams = {}) {
    this._keyDerivationWorkFactor = keyDerivationWorkFactor ?? 650_000;
    this._store = store ?? new MemoryStore<string, string>();

    // Set the initial status of the vault.
    this.setStatus({ initialized: false });
  }

  public async backup({ passphrase }: { passphrase: string }): Promise<AppDataBackup> {
    // Verify the data vault has already been initialized.
    const { initialized } = await this.getStatus();
    if (initialized !== true) {
      throw new Error(
        'AppDataVault: Unable to proceed with the backup operation because the data vault has ' +
        'not been initialized. Please ensure the vault is properly initialized with a secure ' +
        'passphrase before attempting to backup its contents.'
      );
    }

    // Lock the data vault and attempt to unlock with the given `passphrase` to authenticate the
    // backup operation.
    await this.lock();
    const isUnlocked = await this.unlock({ passphrase });

    if (isUnlocked === false) {
      throw new Error(
        'AppDataVault: The backup operation could not be completed due to an incorrect ' +
        'passphrase. Please verify the passphrase is correct and try again.'
      );
    }

    // Retrieve the Agent's DID record as a compact JWE from the data store.
    const encryptedAgentDid = await this.getEncryptedAgentDid();

    // Create a backup object containing the encrypted vault contents.
    const backup: AppDataBackup = {
      data        : encryptedAgentDid,
      dateCreated : new Date().toISOString(),
      size        : encryptedAgentDid.length
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

    // Step 2: Verify the old passphrase is correct by attempting to unlock the vault
    await this.lock();
    const isUnlocked = await this.unlock({ passphrase: oldPassphrase });
    if (!isUnlocked) {
      throw new Error('AppDataVault: Incorrect old passphrase provided.');
    }

    // Step 3: Derive a new Vault Unlock Key (VUK) from the new `passphrase` and the stored `salt`.
    // The VUK serves as the key encryption key (KEK) when wrapping the Agent's vault private key.
    const salt = await this.getStoredSalt();
    const newVaultUnlockKey = await this.deriveVaultUnlockKey({ passphrase: newPassphrase, salt });

    // Step 3: Re-encrypt the Agent's vault key (CEK) using the new VUK (aka KEK).
    const vaultContents = await this.getEncryptedAgentDid(); // You need to implement this method based on your vault structure
    const encryptedVaultContents = await XChaCha20Poly1305.encrypt({
      data  : Convert.string(vaultContents).toUint8Array(),
      key   : newVaultUnlockKey,
      nonce : cryptoUtils.randomBytes(12), // XChaCha20Poly1305 might require a nonce, adjust accordingly
    });

    // // Step 4: Update the vault with the new encrypted data
    // await this._store.set('vaultContents', Convert.uint8Array(encryptedVaultContents).toBase64Url());

    // // Update the vault's unlock key in memory (if you store this in persistent storage, it should be updated as well)
    // this._vaultUnlockKey = newVaultUnlockKey;

    // // Optional: Update any relevant metadata in your vault status, like the last updated timestamp

    return true; // Indicate success
  }

  public async getAgentDid(): Promise<BearerDid> {
    /**
     * STEP 1: Verify the data vault has been initialized and is unlocked.
     */
    const { initialized, locked } = await this.getStatus();
    if (!(initialized === true && locked === false && this._vaultUnlockKey)) {
      throw new Error(`AppDataVault: Data vault must first be initialized and unlocked.`);
    }

    /**
     * STEP 2: Retrieve the Agent's DID record from the data store and deserialize it to compact
     * JWE format.
     */

    // Retrieve the compact JWE from the data store.
    const encryptedAgentDid = await this.getEncryptedAgentDid();

    // Split the JWE into its constituent components.
    let [
      protectedHeaderB64U,
      cekCiphertextB64U,
      payloadNonceB64U,
      payloadCiphertextB64U,
      payloadAuthenticationTagB64U
    ] = encryptedAgentDid.split('.');

    // Decode the Base64 URL encoded JWE components.
    const protectedHeader = Convert.base64Url(protectedHeaderB64U).toObject() as AppDataVaultProtectedHeader;
    const cekCiphertext = Convert.base64Url(cekCiphertextB64U).toUint8Array();
    const payloadNonce = Convert.base64Url(payloadNonceB64U).toUint8Array();
    const payloadCiphertext = Convert.base64Url(payloadCiphertextB64U).toUint8Array();
    const payloadAuthenticationTag = Convert.base64Url(payloadAuthenticationTagB64U).toUint8Array();

    /**
     * STEP 3: Decrypt the Agent's vault private key (CEK) using the Vault Unlock Key (VUK aka KEK).
     */

    if (!isValidProtectedHeader(protectedHeader)) {
      throw new Error('AppDataVault: Invalid Agent DID protected header');
    }

    // Decode the the nonce and authentication tag from the protected header.
    const cekNonce = Convert.base64Url(protectedHeader.iv).toUint8Array();
    const cekAuthenticationTag = Convert.base64Url(protectedHeader.tag).toUint8Array();

    // Decrypt the Agent's vault key (CEK) using the Vault Unlock Key (VUK aka KEK).
    const contentEncryptionKeyBytes = await XChaCha20Poly1305.decrypt({
      data  : new Uint8Array([...cekCiphertext, ...cekAuthenticationTag]),
      key   : this._vaultUnlockKey,
      nonce : cekNonce
    });

    // Convert the Agent's vault key (CEK) to JWK format.
    const contentEncryptionKey = await XChaCha20Poly1305.bytesToPrivateKey({
      privateKeyBytes: contentEncryptionKeyBytes
    });
    contentEncryptionKey.alg = 'XC20P';

    /**
     * STEP 3: Decrypt the Agent's DID.
     */
    // Use the JWE header as Additional Authenticated Data when decrypting the data payload.
    const payloadAdditionalData = Convert.object(protectedHeader).toUint8Array();

    // Decrypt the Agent's DID in portable format with the Agent's vault key (CEK).
    const portableDidBytes = await XChaCha20Poly1305.decrypt({
      data           : new Uint8Array([...payloadCiphertext, ...payloadAuthenticationTag]),
      key            : contentEncryptionKey,
      nonce          : payloadNonce,
      additionalData : payloadAdditionalData
    });

    // Convert the Agent's DID from a byte array to PortableDid format.
    const portableDid = Convert.uint8Array(portableDidBytes).toObject();
    if (!isPortableDid(portableDid)) {
      throw new Error('AppDataVault: Unable to decode malformed Agent DID in data vault');
    }

    // Return the Agent's DID in Bearer DID format.
    return await BearerDid.import({ portableDid });
  }

  public async getStatus(): Promise<SecureAppDataStatus> {
    const storedStatus = await this._store.get('appDataStatus');

    // On the first run, the store will not contain an SecureAppDataStatus object yet, so return an
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
    if (!isSecureAppDataStatus(appDataStatus)) {
      throw new Error('AppDataVault: Invalid SecureAppDataStatus object in store');
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
     * STEP 1: Derive the Agent's HD (Hierarchical Deterministic) key pair from the
     * given (or generated) mnemonic.
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
     * STEP 2: Derive the Agent's app data vault key, which serves as the CEK (Content Encryption
     * Key) for the app data vault.
     */

    // Derive the Agent's app data vault key from the root key.
    // Note: The Agent's vault key is derived using account 0 and index 0 so that it can be
    //       deterministically re-derived.
    const vaultHdKey = rootHdKey.derive(`m/44'/0'/0'/0'/0'`);

    /**
     * STEP 3: Create the Agent's DID using identity, signing, and encryption keys derived from the
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
     * STEP 4: Derive the Vault Unlock Key (VUK) from the given `passphrase` and a `salt` derived
     * from the Agent's vault private key. The VUK serves as the key encryption key (KEK) when
     * wrapping the Agent's vault private key (aka CEK).
     */

    // A non-secret static info value is combined with the Agent's vault private key as input to
    // HKDF (Hash-based Key Derivation Function) to derive a new 32-byte salt.
    const saltInput = await Hkdf.deriveKey({
      hash    : 'SHA-512',             // hash function
      length  : 256,                   // derived key length, in bits
      baseKey : vaultHdKey.privateKey, // input keying material
      salt    : '',                    // empty salt because private key is sufficiently random
      info    : 'vault_unlock_salt',   // non-secret application specific information
    });

    // Per {@link https://www.rfc-editor.org/rfc/rfc7518.html#section-4.8.1.1 | RFC 7518, Section 4.8.1.1},
    // the salt value used with PBES2 should be of the format (UTF8(Alg) || 0x00 || Salt Input),
    // where Alg is the "alg" (algorithm) Header Parameter value. This reduces the potential for a
    // precomputed dictionary attack (also known as a rainbow table attack).
    const algorithm = Convert.string('PBES2-HS512+XC20PKW').toUint8Array();
    const salt = new Uint8Array([...algorithm, 0x00, ...saltInput]);

    // Derive the vault unlock key (VUK) from the given `passphrase` and derived `salt`.
    // The VUK serves as the key encryption key (KEK) when wrapping the Agent's vault private key.
    this._vaultUnlockKey = await this.deriveVaultUnlockKey({ passphrase, salt });

    /**
     * STEP 5: Encrypt the Agent's vault key (CEK) using the VUK (aka KEK).
     */

    // A non-secret static info value is combined with the Agent's vault private key as input to
    // HKDF (Hash-based Key Derivation Function) to derive a 32-byte content encryption key (CEK).
    const contentEncryptionKeyBytes = await Hkdf.deriveKey({
      hash    : 'SHA-512',             // hash function
      length  : 256,                   // derived key length, in bits
      baseKey : vaultHdKey.privateKey, // input keying material
      salt    : '',                    // empty salt because private key is sufficiently random
      info    : 'vault_cek',           // non-secret application specific information
    });

    // Generate a random 24-byte nonce to use with XChaCha20-Poly1305 when encrypting the CEK.
    const cekNonce = cryptoUtils.randomBytes(24);

    // Encrypt the Agent's vault key (CEK) with the VUK (KEK).
    const cekCiphertextWithTag = await XChaCha20Poly1305.encrypt({
      data  : contentEncryptionKeyBytes,
      key   : this._vaultUnlockKey,
      nonce : cekNonce,
    });

    // Extract the ciphertext and tag from the encrypted Agent's vault private key (CEK).
    const cekCiphertext = cekCiphertextWithTag.slice(0, -POLY1305_TAG_LENGTH);
    const cekAuthenticationTag = cekCiphertextWithTag.slice(-POLY1305_TAG_LENGTH);

    // Construct the JWE header.
    const protectedHeader: AppDataVaultProtectedHeader = {
      alg : 'PBES2-HS512+XC20PKW',
      enc : 'XC20P',
      p2c : this._keyDerivationWorkFactor,
      p2s : Convert.uint8Array(salt).toBase64Url(),
      iv  : Convert.uint8Array(cekNonce).toBase64Url(),
      tag : Convert.uint8Array(cekAuthenticationTag).toBase64Url(),
      cty : 'json'
    };

    /**
     * STEP 6: Encrypt the Agent's DID in portable format, which will be the payload of the JWE.
     */

    // Convert the content encryption key bytes to a JWK to be used with XChaCha20-Poly1305.
    const contentEncryptionKey = await XChaCha20Poly1305.bytesToPrivateKey({
      privateKeyBytes: contentEncryptionKeyBytes
    });
    contentEncryptionKey.alg = 'XC20P';

    // Generate a random 24-byte nonce to use with XChaCha20-Poly1305 when encrypting the payload.
    const payloadNonce = cryptoUtils.randomBytes(24);

    // Use the JWE header as Additional Authenticated Data when encrypting the data payload.
    const payloadAdditionalData = Convert.object(protectedHeader).toUint8Array();

    // Convert the Agent's DID to a portable format as a byte array.
    const portableDid = await agentDid.export();
    const portableDidBytes = Convert.object(portableDid).toUint8Array();

    // Encrypt the Agent's DID in portable format with the Agent's vault key (CEK).
    const payloadCiphertextWithTag = await XChaCha20Poly1305.encrypt({
      data           : portableDidBytes,
      key            : contentEncryptionKey,
      nonce          : payloadNonce,
      additionalData : payloadAdditionalData
    });

    /**
     * STEP 7: Serialize the JWE to compact JWE format and store it in the data store.
     */

    // Extract the ciphertext and tag from the encrypted payload.
    const payloadCiphertext = payloadCiphertextWithTag.slice(0, -POLY1305_TAG_LENGTH);
    const payloadAuthenticationTag = payloadCiphertextWithTag.slice(-POLY1305_TAG_LENGTH);

    // Serialize to a compact JWE.
    const agentDidJwe = [
      Convert.object(protectedHeader).toBase64Url(),
      Convert.uint8Array(cekCiphertext).toBase64Url(),
      Convert.uint8Array(payloadNonce).toBase64Url(),
      Convert.uint8Array(payloadCiphertext).toBase64Url(),
      Convert.uint8Array(payloadAuthenticationTag).toBase64Url()
    ].join('.');

    // Store the compact JWE in the data store.
    await this._store.set('agentDid', agentDidJwe);

    /**
     * STEP 8: Set the vault to initialized and unlocked.
     */

    await this.setStatus({ initialized: true, locked: false });

    // Return the mnemonic in case it was generated so that it can be displayed to the user for
    // safekeeping.
    return mnemonic;
  }

  public async lock(): Promise<void> {
    // Verify the data vault has already been initialized.
    const { initialized } = await this.getStatus();
    if (initialized !== true) {
      throw new Error(`AppDataVault: Lock operation failed. Data vault must first be initialized.`);
    }

    // Clear the vault unlock key from memory.
    this._vaultUnlockKey = undefined;

    // Set the vault to locked.
    await this.setStatus({ initialized: true, locked: true });
  }

  public async restore({ backup, passphrase }: {
    backup: AppDataBackup;
    passphrase: string;
  }): Promise<boolean> {
    // Verify the data vault has already been unlocked.
    const { locked } = await this.getStatus();
    if (locked === true) {
      throw new Error(
        'AppDataVault: The data vault must be unlocked before attempting to restore any backups. ' +
        'This ensures that the vault contents cannot be overwritten by an unauthorized party.'
      );
    }

    // Validate the backup object.
    if (!isAppDataBackup(backup)) {
      throw new Error(`AppDataVault: Restore operation failed due to invalid backup object.`);
    }

    // Temporarily save the status and contents of the data store while attempting to restore the
    // backup so that they are not lost in case the restore operation fails.
    const previousStatus = await this.getStatus();
    let previousContents: string;
    try {
      previousContents = await this.getEncryptedAgentDid();
    } catch {
      throw new Error(
        'AppDataVault: The restore operation cannot proceed because the existing vault contents ' +
        'are missing or inaccessible. If the problem persists consider re-initializing the vault' +
        'and retrying the restore.'
      );
    }

    // Restore the backup to the data store.
    await this._store.set('agentDid', backup.data);

    // Attempt to unlock the vault with the given `passphrase`.
    const isUnlocked = await this.unlock({ passphrase });
    if (isUnlocked === false) {
      // If the restore operation fails, revert the data store to the status and contents that were
      // saved before the restore operation was attempted.
      await this.setStatus(previousStatus);
      await this._store.set('agentDid', previousContents);

      throw new Error(
        'AppDataVault: Restore operation failed due to an incorrect passphrase. ' +
        'Please verify the passphrase is correct for the provided backup and try again.'
      );
    }

    // Update the status of the vault.
    await this.setStatus({
      initialized : true,
      lastRestore : new Date().toISOString(),
      locked      : false
    });

    return true;
  }

  public async unlock({ passphrase }: { passphrase: string }): Promise<boolean> {
    // If the vault is already unlocked, return true immediately.
    const { locked } = await this.getStatus();
    if (!locked && this._vaultUnlockKey) {
      return true;
    }

    // Retrieve the stored salt from the data store.
    const salt = await this.getStoredSalt();

    // Re-derive the Vault Unlock Key (VUK) from the given `passphrase` and stored `salt`.
    this._vaultUnlockKey = await this.deriveVaultUnlockKey({ passphrase, salt });

    // Set the vault to unlocked.
    await this.setStatus({ locked: false });

    return true;
  }

  private async deriveVaultUnlockKey({ passphrase, salt }: {
    passphrase: string;
    salt: Uint8Array;
  }): Promise<Jwk> {
    // The `passphrase` entered by the end-user and `salt` derived from the Agent's vault private
    // key are inputs to the PBKDF2 algorithm to derive a 32-byte secret key that will be referred
    // to as the Vault Unlock Key (VUK).
    const privateKeyBytes = await Pbkdf2.deriveKey({
      hash       : 'SHA-512',
      iterations : this._keyDerivationWorkFactor,
      length     : 256,
      password   : Convert.string(passphrase).toUint8Array(),
      salt       : salt
    });

    // Convert the derived private key bytes to a JWK to be used with XChaCha20-Poly1305.
    const vaultUnlockKey = await XChaCha20Poly1305.bytesToPrivateKey({ privateKeyBytes });
    vaultUnlockKey.alg = 'XC20P';

    return vaultUnlockKey;
  }

  private async getEncryptedAgentDid(): Promise<string> {
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

  private async getStoredSalt(): Promise<Uint8Array> {
    // Retrieve the stored agent JWE from the store.
    const agentDidJwe = await this.getEncryptedAgentDid();

    // Decode the protected header.
    let [ encodedProtectedHeader ] = agentDidJwe.split('.');
    const protectedHeader = Convert.base64Url(encodedProtectedHeader).toObject();

    // Ensure the protected header is valid.
    if (!isValidProtectedHeader(protectedHeader)) {
      throw new Error('AppDataVault: Invalid Agent DID protected header detected.');
    }

    // Convert the salt to bytes.
    const salt = Convert.base64Url(protectedHeader.p2s).toUint8Array();

    return salt;
  }

  private async setStatus({ initialized, locked, lastBackup, lastRestore }: Partial<SecureAppDataStatus>): Promise<boolean> {
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