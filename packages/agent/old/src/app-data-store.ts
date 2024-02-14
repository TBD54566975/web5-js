import type { DidKeySet } from '@web5/dids';
import type { KeyValueStore } from '@web5/common';
import type { JweHeaderParams, PublicKeyJwk, Web5Crypto } from '@web5/crypto';

import { DidKeyMethod } from '@web5/dids';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { Convert, MemoryStore } from '@web5/common';
import { CryptoKey, Jose, Pbkdf2, utils as cryptoUtils, XChaCha20Poly1305 } from '@web5/crypto';

export type AppDataBackup = {
  /**
   * A timestamp to record when the backup was made.
   */
  dateCreated: string;

  /**
   * The size of the backup data.
   */
  size: number;

  /**
   * Encrypted vault contents.
   */
  data: string;
}

export type AppDataStatus = {
  /**
   * Boolean indicating whether the data was successful.
   */
  initialized: boolean;

  /**
   * The timestamp of the last backup.
   */
  lastBackup: string | undefined;

  /**
   * The timestamp of the last restore.
   */
  lastRestore: string | undefined;
}

export type AppData = {
  [key: string]: any;
}

export interface AppDataStore {
  /**
   * Returns a promise that resolves to a string, which is the App DID.
   */
  getDid(): Promise<string>

  /**
   * Returns a promise that resolves to a CryptoKey object, which
   * represents the public key associated with the App DID.
   */
  getPublicKey(): Promise<Web5Crypto.CryptoKey>

  /**
   * Returns a promise that resolves to a CryptoKey object, which
   * represents the private key associated with the App DID.
   */
  getPrivateKey(): Promise<Web5Crypto.CryptoKey>

  /**
   * Returns a promise that resolves to a AppDataStatus object, which
   * provides information about the current status of the AppData instance.
   */
  getStatus(): Promise<AppDataStatus>

  /**
   * Initializes the AppDataStore and returns a Promise that resolves
   * to a boolean indicating whether the operation was successful.
   */
  initialize(options: { passphrase: string, keyPair: Web5Crypto.CryptoKeyPair }): Promise<void>;

  /**
   * Creates an encrypted backup of the current state of `AppData` and
   * returns a Promise that resolves to an `AppDataBackup` object.
   */
  backup(options: { passphrase: string }): Promise<AppDataBackup>;

  /**
   * Restores `AppData` to the state in the provided `AppDataBackup` object.
   * It requires a passphrase to decrypt the backup and returns a Promise that
   * resolves to a boolean indicating whether the restore was successful.
   */
  restore(options: { backup: AppDataBackup, passphrase: string }): Promise<boolean>;

  /**
   * Locks the `AppDataStore`, secured by a passphrase
   * that must be entered to unlock.
   */
  lock(): Promise<void>;

  /**
   * Attempts to unlock the `AppDataStore` with the provided
   * passphrase.  It returns a Promise that resolves to a
   * boolean indicating whether the unlock was successful.
   */
  unlock(options: { passphrase: string }): Promise<boolean>;

  /**
   * Attempts to change the passphrase of the `AppDataStore`.
   * It requires the old passphrase for verification and returns
   * a Promise that resolves to a boolean indicating whether the
   * passphrase change was successful.
   */
  changePassphrase(options: { oldPassphrase: string, newPassphrase: string }): Promise<boolean>;
}

export type AppDataVaultOptions = {
  keyDerivationWorkFactor?: number;
  store?: KeyValueStore<string, any>;
}

export class AppDataVault implements AppDataStore {
  private _keyDerivationWorkFactor: number;
  private _store: KeyValueStore<string, any>;
  private _vaultUnlockKey = new Uint8Array();

  constructor(options?: AppDataVaultOptions) {
    this._keyDerivationWorkFactor = options?.keyDerivationWorkFactor ?? 650_000;
    this._store = options?.store ?? new MemoryStore();
  }

  async backup(_options: { passphrase: string }): Promise<AppDataBackup> {
    throw new Error ('Not implemented');
  }

  async changePassphrase(_options: { oldPassphrase: string, newPassphrase: string }): Promise<boolean> {
    throw new Error ('Not implemented');
  }

  private async generateVaultUnlockKey(options: {
    passphrase: string,
    salt: Uint8Array
  }): Promise<Uint8Array> {
    const { passphrase, salt } = options;

    /** The salt value derived in Step 3 and the passphrase entered by the
     * end-user are inputs to the PBKDF2 algorithm to derive a 32-byte secret
     * key that will be referred to as the Vault Unlock Key (VUK). */
    const vaultUnlockKey = await Pbkdf2.deriveKey({
      hash       : 'SHA-512',
      iterations : this._keyDerivationWorkFactor,
      length     : 256,
      password   : Convert.string(passphrase).toUint8Array(),
      salt       : salt
    });

    return vaultUnlockKey;
  }

  async getDid(): Promise<string> {
    // Get the Vault Key Set JWE from the data store.
    const vaultKeySet = await this._store.get('vaultKeySet');

    // Decode the Base64 URL encoded JWE protected header.
    let [protectedHeaderB64U] = vaultKeySet.split('.');
    const protectedHeader = Convert.base64Url(protectedHeaderB64U).toObject() as JweHeaderParams;

    // Extract the public key in JWK format.
    const publicKeyJwk = protectedHeader.wrappedKey as PublicKeyJwk;

    // Expand the public key to a did:key identifier.
    const keySet: DidKeySet = { verificationMethodKeys: [{ publicKeyJwk, relationships: ['authentication'] }]};
    const { did } = await DidKeyMethod.create({ keySet });

    return did;
  }

  async getPublicKey(): Promise<CryptoKey> {
    // Get the Vault Key Set JWE from the data store.
    const vaultKeySet = await this._store.get('vaultKeySet');

    // Decode the Base64 URL encoded JWE protected header.
    let [protectedHeaderB64U] = vaultKeySet.split('.');
    const protectedHeader = Convert.base64Url(protectedHeaderB64U).toObject() as JweHeaderParams;

    // Convert the public key in JWK format to crypto key.
    const publicKeyJwk = protectedHeader.wrappedKey as PublicKeyJwk;
    const cryptoKey = await Jose.jwkToCryptoKey({ key: publicKeyJwk });

    return cryptoKey;
  }

  async getPrivateKey(): Promise<Web5Crypto.CryptoKey> {
    // Get the Vault Key Set JWE from the data store.
    const vaultKeySet = await this._store.get('vaultKeySet');

    // Decode the Base64 URL encoded JWE content.
    let [protectedHeaderB64U, encryptedKeyB64U, nonceB64U, _, tagB64U] = vaultKeySet.split('.');
    const protectedHeader = Convert.base64Url(protectedHeaderB64U).toObject() as JweHeaderParams;
    const encryptedKey = Convert.base64Url(encryptedKeyB64U).toUint8Array();
    const nonce = Convert.base64Url(nonceB64U).toUint8Array();
    const tag = Convert.base64Url(tagB64U).toUint8Array();

    // Decrypt the Identity Agent's private key material.
    const privateKeyMaterial = await XChaCha20Poly1305.decrypt({
      additionalData : Convert.object(protectedHeader).toUint8Array(),
      data           : encryptedKey,
      key            : this._vaultUnlockKey,
      nonce          : nonce,
      tag            : tag
    });

    // Get the public key.
    const publicKey = await this.getPublicKey();

    // Create a private crypto key based off the parameters of the public key.
    const privateKey = new CryptoKey(
      publicKey.algorithm,
      publicKey.extractable,
      privateKeyMaterial,
      'private',
      ['sign']
    );

    return privateKey;
  }

  async getStatus(): Promise<AppDataStatus> {
    try {
      const appDataStatus = await this._store.get('appDataStatus');
      return JSON.parse(appDataStatus);
    } catch(error: any) {
      return {
        initialized : false,
        lastBackup  : undefined,
        lastRestore : undefined
      };
    }
  }

  async initialize(options: {
    keyPair: Web5Crypto.CryptoKeyPair,
    passphrase: string
  }): Promise<void> {
    const { keyPair, passphrase } = options;

    const appDataStatus = await this.getStatus();

    // Throw if the data vault was previously initialized.
    if (appDataStatus.initialized === true) {
      throw new Error(`Operation 'initialize' failed. Data vault already initialized.`);
    }

    /** A non-secret static info value is combined with the Identity Agent's
     * public key as input to a Hash-based Key Derivation Function (HKDF)
     * to derive a new 32-byte salt. */
    const publicKey = keyPair.publicKey.material;
    const saltInput = hkdf(
      sha256,              // hash function
      publicKey,           // input keying material
      undefined,           // no salt because public key is already random
      'vault_unlock_salt', // non-secret application specific information
      32                   // derived key length, in bytes
    );

    /**
     * Per RFC 7518, the salt value used with PBES2 should be of the format
     * (UTF8(Alg) || 0x00 || Salt Input), where Alg is the "alg" (algorithm)
     * Header Parameter value. This reduces the potential for a precomputed
     * dictionary attack (also known as a rainbow table attack).
     * @see {@link https://www.rfc-editor.org/rfc/rfc7518.html#section-4.8.1.1 | RFC 7518, Section 4.8.1.1}
     */
    const algorithm = Convert.string('PBES2-HS512+XC20PKW').toUint8Array();
    const salt = new Uint8Array([...algorithm, 0x00, ...saltInput]);

    /**
     * Generate a vault unlock key (VUK), which will be used as a
     * key encryption key (KEK) for wrapping the private key */
    this._vaultUnlockKey = await this.generateVaultUnlockKey({ passphrase, salt });

    /** Convert the public crypto key to JWK format to store within the JWE. */
    const wrappedKey = await Jose.cryptoKeyToJwk({ key: keyPair.publicKey });

    /** Construct the JWE header. */
    const protectedHeader: JweHeaderParams = {
      alg        : 'PBES2-HS512+XC20PKW',
      crit       : ['wrappedKey'],
      enc        : 'XC20P',
      p2c        : this._keyDerivationWorkFactor,
      p2s        : Convert.uint8Array(salt).toBase64Url(),
      wrappedKey : wrappedKey
    };

    /** 6. Encrypt the Identity Agent's private key with the derived VUK
     *  using XChaCha20-Poly1305 */
    const nonce = cryptoUtils.randomBytes(24);
    const privateKey = keyPair.privateKey.material;
    const {
      ciphertext: privateKeyCiphertext,
      tag: privateKeyTag } = await XChaCha20Poly1305.encrypt({
      additionalData : Convert.object(protectedHeader).toUint8Array(),
      data           : privateKey,
      key            : this._vaultUnlockKey,
      nonce          : nonce
    });

    /** 7. Serialize the Identity Agent's vault key set to a compact JWE, which
     * includes the VUK salt and encrypted VUK (nonce, tag, and ciphertext). */
    const vaultKeySet =
      Convert.object(protectedHeader).toBase64Url() + '.' +
      Convert.uint8Array(privateKeyCiphertext).toBase64Url() + '.' +
      Convert.uint8Array(nonce).toBase64Url() + '.' +
      Convert.string('unused').toBase64Url() + '.' +
      Convert.uint8Array(privateKeyTag).toBase64Url();

    /** Store the vault key set in the AppDataStore. */
    await this._store.set('vaultKeySet', vaultKeySet);

    /** Set the vault to initialized. */
    appDataStatus.initialized = true;
    await this.setStatus(appDataStatus);
  }

  async lock(): Promise<void> {
    this._vaultUnlockKey.fill(0);
    this._vaultUnlockKey = new Uint8Array();
  }

  async restore(_options: { backup: AppDataBackup, passphrase: string }): Promise<boolean> {
    throw new Error ('Not implemented');
  }

  async setStatus(options: Partial<AppDataStatus>): Promise<boolean> {
    // Get the current status values from the store, if any.
    const appDataStatus = await this.getStatus();

    // Update the status properties with new values specified, if any.
    appDataStatus.initialized = options.initialized ?? appDataStatus.initialized;
    appDataStatus.lastBackup = options.lastBackup ?? appDataStatus.lastBackup;
    appDataStatus.lastRestore = options.lastRestore ?? appDataStatus.lastRestore;

    // Write the changes to the store.
    await this._store.set('appDataStatus', JSON.stringify(appDataStatus));

    return true;
  }

  async unlock(options: { passphrase: string }): Promise<boolean> {
    const { passphrase } = options;

    // Get the vault key set from the store.
    const vaultKeySet: string = await this._store.get('vaultKeySet');

    // Decode the protected header.
    let [protectedHeaderString] = vaultKeySet.split('.');
    const protectedHeader = Convert.base64Url(protectedHeaderString).toObject() as JweHeaderParams;

    // Derive the Vault Unlock Key (VUK).
    if (protectedHeader.p2s !== undefined) {
      const salt = Convert.base64Url(protectedHeader.p2s).toUint8Array();
      this._vaultUnlockKey = await this.generateVaultUnlockKey({ passphrase, salt });
    }

    return true;
  }
}