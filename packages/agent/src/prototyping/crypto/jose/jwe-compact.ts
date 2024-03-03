import type { Jwk, KeyIdentifier } from '@web5/crypto';

import { LocalKeyManager } from '@web5/crypto';

import type { CryptoApi } from '../types/crypto-api.js';
import type { KeyManager } from '../types/key-manager.js';
import type { JweDecryptOptions, JweEncryptOptions, JweHeaderParams } from './jwe.js';

import { isValidJweHeader } from './jwe.js';
import { FlattenedJwe } from './jwe-flattened.js';
import { AgentCryptoApi } from '../../../crypto-api.js';
import { CryptoError, CryptoErrorCode } from '../crypto-error.js';

export interface CompactJweDecryptParams<TKeyManager, TCrypto> {
  jwe: string;

  key: KeyIdentifier | Jwk | Uint8Array;

  keyManager?: TKeyManager;

  crypto?: TCrypto;

  options?: JweDecryptOptions;
}

export interface CompactJweDecryptResult {
  /** Plaintext as a byte array. */
  plaintext: Uint8Array

  /** JWE Protected Header. */
  protectedHeader: JweHeaderParams
}

export interface CompactJweEncryptParams<TKeyManager, TCrypto> {
  plaintext: Uint8Array;

  protectedHeader: JweHeaderParams;

  key: KeyIdentifier | Jwk | Uint8Array;

  keyManager?: TKeyManager;

  crypto?: TCrypto;

  options?: JweEncryptOptions;
}

export class CompactJwe {
  public static async decrypt<
    TKeyManager extends KeyManager | undefined = KeyManager,
    TCrypto extends CryptoApi | undefined = CryptoApi
  >({
    jwe,
    key,
    keyManager = new LocalKeyManager(),
    crypto = new AgentCryptoApi(),
    options = {}
  }: CompactJweDecryptParams<TKeyManager, TCrypto>
  ): Promise<CompactJweDecryptResult> {
    if (typeof jwe !== 'string') {
      throw new CryptoError(CryptoErrorCode.InvalidJwe, 'Invalid JWE format. JWE must be a string.');
    }

    // Split the JWE into its constituent parts.
    const {
      0: protectedHeader,
      1: encryptedKey,
      2: initializationVector,
      3: ciphertext,
      4: authenticationTag,
      length,
    } = jwe.split('.');

    // Ensure that the JWE has the required number of parts.
    if (length !== 5) {
      throw new CryptoError(CryptoErrorCode.InvalidJwe, 'Invalid JWE format. JWE must have 5 parts.');
    }

    // Decrypt the JWE using the provided Key URI.
    const flattenedJwe = await FlattenedJwe.decrypt({
      jwe: {
        ciphertext,
        encrypted_key : encryptedKey || undefined,
        iv            : initializationVector || undefined,
        protected     : protectedHeader,
        tag           : authenticationTag || undefined,
      },
      key,
      keyManager,
      crypto,
      options
    });

    if (!isValidJweHeader(flattenedJwe.protectedHeader)) {
      throw new CryptoError(CryptoErrorCode.InvalidJwe, 'Decrypt operation failed due to missing or malformed JWE Protected Header');
    }

    return { plaintext: flattenedJwe.plaintext, protectedHeader: flattenedJwe.protectedHeader };
  }

  public static async encrypt<
    TKeyManager extends KeyManager | undefined = KeyManager,
    TCrypto extends CryptoApi | undefined = CryptoApi
  >({
    plaintext,
    protectedHeader,
    key,
    keyManager = new LocalKeyManager(),
    crypto = new AgentCryptoApi(),
    options = {}
  }: CompactJweEncryptParams<TKeyManager, TCrypto>
  ): Promise<string> {
    const jwe = await FlattenedJwe.encrypt({ plaintext, protectedHeader, key, keyManager, crypto, options });

    // Create the Compact Serialization, which is the string BASE64URL(UTF8(JWE Protected Header))
    // || '.' || BASE64URL(JWE Encrypted Key) || '.' || BASE64URL(JWE Initialization Vector)
    // || '.' || BASE64URL(JWE Ciphertext) || '.' || BASE64URL(JWE Authentication Tag).
    return [jwe.protected, jwe.encrypted_key, jwe.iv, jwe.ciphertext, jwe.tag].join('.');
  }
}