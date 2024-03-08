import type { Jwk } from '@web5/crypto';
import type { KeyValueStore } from '@web5/common';

import { HDKey } from 'ed25519-keygen/hdkey';
import { BearerDid, DidDht } from '@web5/dids';
import { Convert, MemoryStore } from '@web5/common';
import { wordlist } from '@scure/bip39/wordlists/english';
import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '@scure/bip39';

import type { JweHeaderParams } from './prototyping/crypto/jose/jwe.js';
import type { IdentityVaultBackup, IdentityVaultBackupData, IdentityVaultStatus, IdentityVaultParams, IdentityVault } from './types/identity-vault.js';

import { AgentCryptoApi } from './crypto-api.js';
import { LocalKeyManager } from './local-key-manager.js';
import { isPortableDid } from './prototyping/dids/utils.js';
import { DeterministicKeyGenerator } from './utils-internal.js';
import { CompactJwe } from './prototyping/crypto/jose/jwe-compact.js';

/**
 * Extended initialization parameters for HdIdentityVault, including an optional mnemonic that can
 * be used to derive keys to encrypt the vault and generate a DID.
 */
export type HdIdentityVaultInitializeParams = {
  /**
    * The passphrase used to secure the vault.
    *
    * The passphrase selected should be strong and securely managed to prevent unauthorized access.
    */
   passphrase: string;

   /**
    * An optional mnemonic phrase used to derive the cryptographic keys for the vault.
    *
    * Providing a mnemonic can be used to recover the vault's content or establish a deterministic
    * key generation scheme. If not provided, a new mnemonic may be generated during the
    * initialization process.
    */
   mnemonic?: string;
 };

/**
 * Type guard function to check if a given object is an empty string or a string containing only
 * whitespace.
 *
 * This is an internal utility function used to validate passphrase inputs, ensuring they are not
 * empty or filled with only whitespace characters, which are considered invalid for passphrase
 * purposes.
 *
 * @param obj - The object to be checked, typically expected to be a passphrase string.
 * @returns A boolean value indicating whether the object is an empty string or a string with only
 *          whitespace.
 */
function isEmptyPassphrase(obj: unknown): obj is string {
  return typeof obj !== 'string' || obj.trim().length === 0;
}

/**
 * Type guard function to check if a given object conforms to the {@link IdentityVaultBackup}
 * interface.
 *
 * This function is an internal utility meant to ensure the integrity and structure of the data
 * assumed to be an {@link IdentityVaultBackup}. It verifies the presence and types of the
 * `dateCreated`, `size`, and `data` properties, aligning with the expected structure of a backup
 * object in the context of an {@link IdentityVault}.
 *
 * @param obj - The object to be verified against the {@link IdentityVaultBackup} interface.
 * @returns A boolean value indicating whether the object is a valid {@link IdentityVaultBackup}.
 */
function isIdentityVaultBackup(obj: unknown): obj is IdentityVaultBackup {
  return typeof obj === 'object' && obj !== null
    && 'dateCreated' in obj && typeof obj.dateCreated === 'string'
    && 'size' in obj && typeof obj.size === 'number'
    && 'data' in obj && typeof obj.data === 'string';
}

/**
 * Internal-only type guard function that checks if a given object conforms to the
 * {@link IdentityVaultStatus} interface.
 *
 * This function is utilized within the {@link HdIdentityVault} implementation to ensure the
 * integrity of the object representing the vault's status, verifying the presence and types of
 * required properties. It aasserts the presence and correct types of `initialized`, `locked`,
 * `lastBackup`, and `lastRestore` properties, ensuring they align with the expected structure of an
 * identity vault's status.
 *
 * @param obj - The object to be checked against the {{@link IdentityVaultStatus} interface.
 * @returns A boolean indicating whether the object is an instance of {@link IdentityVaultStatus}.
 */
function isIdentityVaultStatus(obj: unknown): obj is IdentityVaultStatus {
  return typeof obj === 'object' && obj !== null
    && 'initialized' in obj && typeof obj.initialized === 'boolean'
    && 'locked' in obj && typeof obj.locked === 'boolean'
    && 'lastBackup' in obj
    && 'lastRestore' in obj;
}

/**
 * The `HdIdentityVault` class provides secure storage and management of identity data.
 *
 * The `HdIdentityVault` class implements the `IdentityVault` interface, providing secure storage
 * and management of identity data with an added layer of security using Hierarchical Deterministic
 * (HD) key derivation based on the SLIP-0010 standard for Ed25519 keys. It enhances identity
 * protection by generating and securing the identity using a derived HD key, allowing for the
 * deterministic regeneration of keys from a mnemonic.
 *
 * The vault is capable of:
 * - Secure initialization with a passphrase and an optional mnemonic, employing HD key derivation.
 * - Encrypting the identity data using a derived content encryption key (CEK) which is securely
 *   encrypted and stored, accessible only by the correct passphrase.
 * - Securely backing up and restoring the vault’s contents, including the HD-derived keys and
 *   associated DID.
 * - Locking and unlocking the vault, which encrypts and decrypts the CEK for secure access to the
 *   vault's contents.
 * - Managing the DID associated with the identity, providing a secure identity layer for
 *   applications.
 *
 * Usage involves initializing the vault with a secure passphrase (and optionally a mnemonic),
 * which then allows for the secure storage, backup, and retrieval of the identity data.
 *
 * Note: Ensure the passphrase is strong and securely managed, as it is crucial for the security of the
 * vault's encrypted contents.
 *
 * @example
 * ```typescript
 * const vault = new HdIdentityVault();
 * await vault.initialize({ passphrase: 'securepassphrase', mnemonic: 'optional mnemonic' });
 * const backup = await vault.backup();
 * await vault.restore({ backup, passphrase: 'securepassphrase' });
 * ```
 */
export class HdIdentityVault implements IdentityVault<{ InitializeResult: string }> {
  /** Provides cryptographic functions needed for secure storage and management of the vault. */
  public crypto = new AgentCryptoApi();

  /** Determines the computational intensity of the key derivation process. */
  private _keyDerivationWorkFactor: number;

  /** The underlying key-value store for the vault's encrypted content. */
  private _store: KeyValueStore<string, string>;

  /** The cryptographic key used to encrypt and decrypt the vault's content securely. */
  private _contentEncryptionKey: Jwk | undefined;

  /**
   * Constructs an instance of `HdIdentityVault`, initializing the key derivation factor and data
   * store. It sets the default key derivation work factor and initializes the internal data store,
   * either with the provided store or a default in-memory store. It also establishes the initial
   * status of the vault as uninitialized and locked.
   *
   * @param params - Optional parameters when constructing a vault instance.
   * @param params.keyDerivationWorkFactor - Optionally set the computational effort for key derivation.
   * @param params.store - Optionally specify a custom key-value store for vault data.
   */
  constructor({ keyDerivationWorkFactor, store }: IdentityVaultParams = {}) {
    this._keyDerivationWorkFactor = keyDerivationWorkFactor ?? 210_000;
    this._store = store ?? new MemoryStore<string, string>();
  }

  /**
   * Creates a backup of the vault's current state, including the encrypted DID and content
   * encryption key, and returns it as an `IdentityVaultBackup` object. The backup includes a
   * Base64Url-encoded string representing the vault's encrypted data, encapsulating the
   * {@link PortableDid}, the content encryption key, and the vault's status.
   *
   * This method ensures that the vault is initialized and unlocked before proceeding with the
   * backup operation.
   *
   * @throws Error if the vault is not initialized or is locked, preventing the backup.
   * @returns A promise that resolves to the `IdentityVaultBackup` object containing the vault's
   *          encrypted backup data.
   */
  public async backup(): Promise<IdentityVaultBackup> {
    // Verify the identity vault has already been initialized and unlocked.
    const { initialized, locked } = await this.getStatus();
    if (!(initialized === true && locked === false && this._contentEncryptionKey)) {
      throw new Error(
        'HdIdentityVault: Unable to proceed with the backup operation because the identity vault ' +
        'has not been initialized and unlocked. Please ensure the vault is properly initialized ' +
        'with a secure passphrase before attempting to backup its contents.'
      );
    }

    // Encode the encrypted CEK and DID as a single Base64Url string.
    const backupData: IdentityVaultBackupData = {
      did                  : await this.getStoredDid(),
      contentEncryptionKey : await this.getStoredContentEncryptionKey(),
      status               : await this.getStatus()
    };
    const backupDataString = Convert.object(backupData).toBase64Url();

    // Create a backup object containing the encrypted vault contents.
    const backup: IdentityVaultBackup = {
      data        : backupDataString,
      dateCreated : new Date().toISOString(),
      size        : backupDataString.length
    };

    // Update the last backup date in the data store.
    await this.setStatus({ lastBackup: backup.dateCreated });

    return backup;
  }

  /**
   * Changes the passphrase used to secure the vault.
   *
   * This method decrypts the existing content encryption key (CEK) with the old passphrase, then
   * re-encrypts it with the new passphrase, updating the vault's stored encrypted CEK. It ensures
   * that the vault is initialized and unlocks the vault if the passphrase is successfully changed.
   *
   * @param params - Parameters required for changing the vault passphrase.
   * @param params.oldPassphrase - The current passphrase used to unlock the vault.
   * @param params.newPassphrase - The new passphrase to replace the existing one.
   * @throws Error if the vault is not initialized or the old passphrase is incorrect.
   * @returns A promise that resolves when the passphrase change is complete.
   */
  public async changePassphrase({ oldPassphrase, newPassphrase }: {
    oldPassphrase: string;
    newPassphrase: string;
  }): Promise<void> {
    // Verify the identity vault has already been initialized.
    const { initialized } = await this.getStatus();
    if (initialized !== true) {
      throw new Error(
        'HdIdentityVault: Unable to proceed with the change passphrase operation because the ' +
        'identity vault has not been initialized. Please ensure the vault is properly ' +
        'initialized with a secure passphrase before trying again.'
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
      throw new Error(`HdIdentityVault: Unable to change the vault passphrase due to an incorrectly entered old passphrase.`);
    }

    // Re-encrypt the vault content encryption key (CEK) using the new passphrase.
    const newCekJwe = await CompactJwe.encrypt({
      key        : Convert.string(newPassphrase).toUint8Array(),
      protectedHeader, // Re-use the protected header from the original JWE.
      plaintext  : Convert.object(contentEncryptionKey).toUint8Array(),
      crypto     : this.crypto,
      keyManager : new LocalKeyManager()
    });

    // Update the vault with the new CEK JWE.
    await this._store.set('contentEncryptionKey', newCekJwe);

    // Update the vault CEK in memory.
    this._contentEncryptionKey = contentEncryptionKey;

    // Set the vault to unlocked.
    await this.setStatus({ locked: false });
  }

  /**
   * Retrieves the DID (Decentralized Identifier) associated with the vault.
   *
   * This method ensures the vault is initialized and unlocked before decrypting and returning the
   * DID. The DID is stored encrypted and  is decrypted using the vault's content encryption key.
   *
   * @throws Error if the vault is not initialized, is locked, or the DID cannot be decrypted.
   * @returns A promise that resolves with a {@link BearerDid}.
   */
  public async getDid(): Promise<BearerDid> {
    // Verify the identity vault has been initialized and is unlocked.
    const { initialized, locked } = await this.getStatus();
    if (!(initialized === true && locked === false && this._contentEncryptionKey)) {
      throw new Error(`HdIdentityVault: Vault has not been initialized and unlocked.`);
    }

    // Retrieve the encrypted DID record as compact JWE from the vault store.
    const didJwe = await this.getStoredDid();

    // Decrypt the compact JWE to obtain the PortableDid as a byte array.
    const { plaintext: portableDidBytes } = await CompactJwe.decrypt({
      jwe        : didJwe,
      key        : this._contentEncryptionKey,
      crypto     : this.crypto,
      keyManager : new LocalKeyManager()
    });

    // Convert the DID from a byte array to PortableDid format.
    const portableDid = Convert.uint8Array(portableDidBytes).toObject();
    if (!isPortableDid(portableDid)) {
      throw new Error('HdIdentityVault: Unable to decode malformed DID in identity vault');
    }

    // Return the DID in Bearer DID format.
    return await BearerDid.import({ portableDid });
  }

  /**
   * Fetches the current status of the `HdIdentityVault`, providing details on whether it's
   * initialized, locked, and the timestamps of the last backup and restore operations.
   *
   * @returns A promise that resolves with the current status of the `HdIdentityVault`, detailing
   *          its initialization, lock state, and the timestamps of the last backup and restore.
   */
  public async getStatus(): Promise<IdentityVaultStatus> {
    const storedStatus = await this._store.get('vaultStatus');

    // On the first run, the store will not contain an IdentityVaultStatus object yet, so return an
    // uninitialized status.
    if (!storedStatus) {
      return {
        initialized : false,
        locked      : true,
        lastBackup  : null,
        lastRestore : null
      };
    }

    const vaultStatus = Convert.string(storedStatus).toObject();
    if (!isIdentityVaultStatus(vaultStatus)) {
      throw new Error('HdIdentityVault: Invalid IdentityVaultStatus object in store');
    }

    return vaultStatus;
  }

  /**
   * Initializes the `HdIdentityVault` with a passphrase and an optional mnemonic.
   *
   * If a mnemonic is not provided, a new one is generated. This process sets up the vault, deriving
   * the necessary cryptographic keys and preparing the vault for use. It ensures the vault is ready
   * to securely store and manage identity data.
   *
   * @example
   * ```ts
   * const identityVault = new HdIdentityVault();
   * const mnemonic = await identityVault.initialize({
   *   passphrase: 'your-secure-passphrase'
   * });
   * console.log('Vault initialized. Mnemonic:', mnemonic);
   * ```
   *
   * @param params - The initialization parameters.
   * @param params.passphrase - The passphrase used to secure the vault.
   * @param params.mnemonic - An optional mnemonic for key derivation. If omitted, a new mnemonic is
   *                          generated.
   * @returns A promise that resolves with the mnemonic used during the initialization, which should
   *          be securely stored by the user.
   */
  public async initialize({ mnemonic, passphrase }: HdIdentityVaultInitializeParams): Promise<string> {
    /**
     * STEP 0: Validate the input parameters and verify the identity vault is not already
     * initialized.
     */

    // Verify that the identity vault was not previously initialized.
    const vaultStatus = await this.getStatus();
    if (vaultStatus.initialized === true) {
      throw new Error(`HdIdentityVault: Vault has already been initialized.`);
    }

    // Verify that the passphrase is not empty.
    if (isEmptyPassphrase(passphrase)) {
      throw new Error(
        `HdIdentityVault: The passphrase is required and cannot be blank. Please provide a ' +
        'valid, non-empty passphrase.`
      );
    }

    /**
     * STEP 1: Derive a Hierarchical Deterministic (HD) key pair from the given (or generated)
     * mnemonic.
     */

    // Generate a 12-word (128-bit) mnemonic, if one was not provided.
    mnemonic ??= generateMnemonic(wordlist, 128);

    // Validate the mnemonic for being 12-24 words contained in `wordlist`.
    if (!validateMnemonic(mnemonic, wordlist)) {
      throw new Error('HdIdentityVault: Invalid mnemonic');
    }

    // Derive a root seed from the mnemonic.
    const rootSeed = await mnemonicToSeed(mnemonic);

    // Derive a root key for the DID from the root seed.
    const rootHdKey = HDKey.fromMasterSeed(rootSeed);

    /**
     * STEP 2: Derive the vault HD key pair from the root key.
     */

    // The vault HD key is derived using account 0 and index 0 so that it can be
    // deterministically re-derived. The vault key pair serves as input keying material for:
    // - deriving the vault content encryption key (CEK)
    // - deriving the salt that serves as input to derive the key that encrypts the vault CEK
    const vaultHdKey = rootHdKey.derive(`m/44'/0'/0'/0'/0'`);

    /**
     * STEP 3: Derive the vault Content Encryption Key (CEK) from the vault private
     * key and a non-secret static info value.
     */

    // A non-secret static info value is combined with the vault private key as input to HKDF
    // (Hash-based Key Derivation Function) to derive a 32-byte content encryption key (CEK).
    const contentEncryptionKey = await this.crypto.deriveKey({
      algorithm           : 'HKDF-512',            // key derivation function
      baseKeyBytes        : vaultHdKey.privateKey, // input keying material
      salt                : '',                    // empty salt because private key is sufficiently random
      info                : 'vault_cek',           // non-secret application specific information
      derivedKeyAlgorithm : 'A256GCM'              // derived key algorithm
    });

    /**
     * STEP 4: Using the given `passphrase` and a `salt` derived from the vault public key, encrypt
     * the vault CEK and store it in the data store as a compact JWE.
     */

    // A non-secret static info value is combined with the vault public key as input to HKDF
    // (Hash-based Key Derivation Function) to derive a new 32-byte salt.
    const saltInput = await this.crypto.deriveKeyBytes({
      algorithm    : 'HKDF-512',           // key derivation function
      baseKeyBytes : vaultHdKey.publicKey, // input keying material
      salt         : '',                   // empty salt because public key is sufficiently random
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

    // Encrypt the vault content encryption key (CEK) to compact JWE format.
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
     * STEP 5: Create a DID using identity, signing, and encryption keys derived from the root key.
     */

    // Derive the identity key pair using index 0 and convert to JWK format.
    // Note: The account is set to Unix epoch time so that in the future, the keys for a DID DHT
    //       document can be deterministically derived based on the versionId returned in a DID
    //       resolution result.
    const identityHdKey = rootHdKey.derive(`m/44'/0'/1708523827'/0'/0'`);
    const identityPrivateKey = await this.crypto.bytesToPrivateKey({
      algorithm       : 'Ed25519',
      privateKeyBytes : identityHdKey.privateKey
    });

    // Derive the signing key using index 1 and convert to JWK format.
    let signingHdKey = rootHdKey.derive(`m/44'/0'/1708523827'/0'/1'`);
    const signingPrivateKey = await this.crypto.bytesToPrivateKey({
      algorithm       : 'Ed25519',
      privateKeyBytes : signingHdKey.privateKey
    });

    // TODO: Enable this once DID DHT supports X25519 keys.
    // Derive the encryption key using index 1 and convert to JWK format.
    // const encryptionHdKey = rootHdKey.derive(`m/44'/0'/1708523827'/0'/1'`);
    // const encryptionKeyEd25519 = await this.crypto.bytesToPrivateKey({
    //   algorithm       : 'Ed25519',
    //   privateKeyBytes : encryptionHdKey.privateKey
    // });
    // const encryptionPrivateKey = await Ed25519.convertPrivateKeyToX25519({ privateKey: encryptionKeyEd25519 });

    // Add the identity and signing keys to the deterministic key generator so that when the DID is
    // created it will use the derived keys.
    const deterministicKeyGenerator = new DeterministicKeyGenerator();
    await deterministicKeyGenerator.addPredefinedKeys({
      privateKeys: [ identityPrivateKey, signingPrivateKey]
    });

    // Create the DID using the derived identity, signing, and encryption keys.
    const did = await DidDht.create({
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
     * STEP 6: Convert the DID to portable format and store it in the data store as a
     * compact JWE.
     */

    // Convert the DID to a portable format.
    const portableDid = await did.export();

    // Construct the JWE header.
    const didJweProtectedHeader: JweHeaderParams = {
      alg : 'dir',
      enc : 'A256GCM',
      cty : 'json'
    };

    // Encrypt the DID to compact JWE format.
    const didJwe = await CompactJwe.encrypt({
      key             : contentEncryptionKey,
      plaintext       : Convert.object(portableDid).toUint8Array(),
      protectedHeader : didJweProtectedHeader,
      crypto          : this.crypto,
      keyManager      : new LocalKeyManager()
    });

    // Store the compact JWE in the data store.
    await this._store.set('did', didJwe);

    /**
     * STEP 7: Set the vault to initialized and unlocked and return the mnemonic used to generate
     * the vault key.
     */

    this._contentEncryptionKey = contentEncryptionKey;

    await this.setStatus({ initialized: true, locked: false });

    // Return the mnemonic in case it was generated so that it can be displayed to the user for
    // safekeeping.
    return mnemonic;
  }

  /**
   * Locks the `HdIdentityVault`, securing its contents by clearing the in-memory encryption key.
   *
   * This method ensures that the vault's sensitive data cannot be accessed without unlocking the
   * vault again with the correct passphrase. It's an essential security feature for safeguarding
   * the vault's contents against unauthorized access.
   *
   * @example
   * ```ts
   * const identityVault = new HdIdentityVault();
   * await identityVault.lock();
   * console.log('Vault is now locked.');
   * ```
   * @throws An error if the identity vault has not been initialized.
   * @returns A promise that resolves when the vault is successfully locked.
   */
  public async lock(): Promise<void> {
    // Verify the identity vault has already been initialized.
    const { initialized } = await this.getStatus();
    if (initialized !== true) {
      throw new Error(`HdIdentityVault: Lock operation failed. Vault has not been initialized.`);
    }

    // Clear the vault content encryption key (CEK) from memory.
    if (this._contentEncryptionKey) this._contentEncryptionKey.k = '';
    this._contentEncryptionKey = undefined;

    // Set the vault to locked.
    await this.setStatus({ locked: true });
  }

  /**
   * Restores the vault's data from a backup object, decrypting and reinitializing the vault's
   * content with the provided backup data.
   *
   * This operation is crucial for data recovery scenarios, allowing users to regain access to their
   * encrypted data using a previously saved backup and their passphrase.
   *
   * @example
   * ```ts
   * const identityVault = new HdIdentityVault();
   * await identityVault.initialize({ passphrase: 'your-secure-passphrase' });
   * // Create a backup of the vault's contents.
   * const backup = await identityVault.backup();
   * // Restore the vault with the same passphrase.
   * await identityVault.restore({ backup: backup, passphrase: 'your-secure-passphrase' });
   * console.log('Vault restored successfully.');
   * ```
   *
   * @param params - The parameters required for the restore operation.
   * @param params.backup - The backup object containing the encrypted vault data.
   * @param params.passphrase - The passphrase used to encrypt the backup, necessary for decryption.
   * @returns A promise that resolves when the vault has been successfully restored.
   * @throws An error if the backup object is invalid or if the passphrase is incorrect.
   */
  public async restore({ backup, passphrase }: {
    backup: IdentityVaultBackup;
    passphrase: string;
  }): Promise<void> {
    // Validate the backup object.
    if (!isIdentityVaultBackup(backup)) {
      throw new Error(`HdIdentityVault: Restore operation failed due to invalid backup object.`);
    }

    // Temporarily save the status and contents of the data store while attempting to restore the
    // backup so that they are not lost in case the restore operation fails.
    let previousStatus: IdentityVaultStatus;
    let previousContentEncryptionKey: string;
    let previousDid: string;
    try {
      previousDid = await this.getStoredDid();
      previousContentEncryptionKey = await this.getStoredContentEncryptionKey();
      previousStatus = await this.getStatus();
    } catch {
      throw new Error(
        'HdIdentityVault: The restore operation cannot proceed because the existing vault ' +
        'contents are missing or inaccessible. If the problem persists consider re-initializing ' +
        'the vault and retrying the restore.'
      );
    }

    try {
      // Convert the backup data to a JSON object.
      const backupData = Convert.base64Url(backup.data).toObject() as IdentityVaultBackupData;

      // Restore the backup to the data store.
      await this._store.set('did', backupData.did);
      await this._store.set('contentEncryptionKey', backupData.contentEncryptionKey);
      await this.setStatus(backupData.status);

      // Attempt to unlock the vault with the given `passphrase`.
      await this.unlock({ passphrase });

    } catch (error: any) {
      // If the restore operation fails, revert the data store to the status and contents that were
      // saved before the restore operation was attempted.
      await this.setStatus(previousStatus);
      await this._store.set('contentEncryptionKey', previousContentEncryptionKey);
      await this._store.set('did', previousDid);

      throw new Error(
        'HdIdentityVault: Restore operation failed due to invalid backup data or an incorrect ' +
        'passphrase. Please verify the passphrase is correct for the provided backup and try again.'
      );
    }

    // Update the status of the vault.
    await this.setStatus({
      lastRestore: new Date().toISOString()
    });
  }

  /**
   * Unlocks the vault by decrypting the stored content encryption key (CEK) using the provided
   * passphrase.
   *
   * This method is essential for accessing the vault's encrypted contents, enabling the decryption
   * of stored data and the execution of further operations requiring the vault to be unlocked.
   *
   * @example
   * ```ts
   * const identityVault = new HdIdentityVault();
   * await identityVault.initialize({ passphrase: 'your-initial-passphrase' });
   * // Unlock the vault with the correct passphrase before accessing its contents
   * await identityVault.unlock({ passphrase: 'your-initial-passphrase' });
   * console.log('Vault unlocked successfully.');
   * ```
   *
   *
   * @param params - The parameters required for the unlock operation.
   * @param params.passphrase - The passphrase used to encrypt the vault's CEK, necessary for
   *                            decryption.
   * @returns A promise that resolves when the vault has been successfully unlocked.
   * @throws An error if the vault has not been initialized or if the provided passphrase is
   *         incorrect.
   */
  public async unlock({ passphrase }: { passphrase: string }): Promise<void> {
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
      throw new Error(`HdIdentityVault: Unable to unlock the vault due to an incorrect passphrase.`);
    }

    // If the decryption is successful, the vault is considered unlocked.
    await this.setStatus({ locked: false });
  }

  /**
   * Retrieves the Decentralized Identifier (DID) associated with the identity vault from the vault
   * store.
   *
   * This DID is encrypted in compact JWE format and needs to be decrypted after the vault is
   * unlocked. The method is intended to be used internally within the HdIdentityVault class to access
   * the encrypted PortableDid.
   *
   * @returns A promise that resolves to the encrypted DID stored in the vault as a compact JWE.
   * @throws Will throw an error if the DID cannot be retrieved from the vault.
   */
  private async getStoredDid(): Promise<string> {
    // Retrieve the DID record as a compact JWE from the data store.
    const didJwe = await this._store.get('did');

    if (!didJwe) {
      throw new Error(
        'HdIdentityVault: Unable to retrieve the DID record from the vault. Please check the ' +
        'vault status and if the problem persists consider re-initializing the vault and ' +
        'restoring the contents from a previous backup.'
      );
    }

    return didJwe;
  }

  /**
   * Retrieves the encrypted Content Encryption Key (CEK) from the vault's storage.
   *
   * This CEK is used for encrypting and decrypting the vault's contents. It is stored as a
   * compact JWE and should be decrypted with the user's passphrase to be used for further
   * cryptographic operations.
   *
   * @returns A promise that resolves to the stored CEK as a string in compact JWE format.
   * @throws Will throw an error if the CEK cannot be retrieved, indicating potential issues with
   *         the vault's integrity or state.
   */
  private async getStoredContentEncryptionKey(): Promise<string> {
    // Retrieve the content encryption key (CEK) record as a compact JWE from the data store.
    const cekJwe = await this._store.get('contentEncryptionKey');

    if (!cekJwe) {
      throw new Error(
        'HdIdentityVault: Unable to retrieve the Content Encryption Key record from the vault. ' +
        'Please check the vault status and if the problem persists consider re-initializing the ' +
        'vault and restoring the contents from a previous backup.'
      );
    }

    return cekJwe;
  }

  /**
   * Updates the status of the `HdIdentityVault`, reflecting changes in its initialization, lock
   * state, and the timestamps of the last backup and restore operations.
   *
   * This method directly manipulates the internal state stored in the vault's key-value store.
   *
   * @param params - The status properties to be updated.
   * @param params.initialized - Updates the initialization state of the vault.
   * @param params.locked - Updates the locked state of the vault.
   * @param params.lastBackup - Updates the timestamp of the last successful backup.
   * @param params.lastRestore - Updates the timestamp of the last successful restore.
   * @returns A promise that resolves to a boolean indicating successful status update.
   * @throws Will throw an error if the status cannot be updated in the key-value store.
   */
  private async setStatus({ initialized, locked, lastBackup, lastRestore }: Partial<IdentityVaultStatus>): Promise<boolean> {
    // Get the current status values from the store, if any.
    let vaultStatus = await this.getStatus();

    // Update the status properties with new values specified, if any.
    vaultStatus.initialized = initialized ?? vaultStatus.initialized;
    vaultStatus.locked = locked ?? vaultStatus.locked;
    vaultStatus.lastBackup = lastBackup ?? vaultStatus.lastBackup;
    vaultStatus.lastRestore = lastRestore ?? vaultStatus.lastRestore;

    // Write the changes to the store.
    await this._store.set('vaultStatus', JSON.stringify(vaultStatus));

    return true;
  }
}