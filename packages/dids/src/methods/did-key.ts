import type { CryptoApi, InferKeyGeneratorAlgorithm, Jwk } from '@web5/crypto';

import { universalTypeOf } from '@web5/common';
import {
  Jose,
  Ed25519,
  utils as cryptoUtils,
  LocalKeyManager,
} from '@web5/crypto';

import type { Did, DidCreateOptions, DidCreateVerificationMethod, PortableDid } from './did-method.js';
import type { DidDocument, DidResolutionOptions, DidResolutionResult, DidVerificationMethod } from '../types/did-core.js';

import { DidMethod } from './did-method.js';
import { getVerificationMethodTypes } from '../utils.js';





/**
 * Defines the set of options available when creating a new Decentralized Identifier (DID) with the
 * 'did:key' method.
 *
 * Either the `algorithm` or `verificationMethods` option can be specified, but not both.
 * - A new key will be generated using the algorithm identifier specified in either the `algorithm`
 *   property or the `verificationMethods` object's `algorithm` property.
 * - If `verificationMethods` is given, it must contain exactly one entry since DID Key only
 *   supports a single verification method.
 * - If neither is given, the default is to generate a new Ed25519 key.
 *
 * @example
 * ```ts
  * // By default, when no options are given, a new Ed25519 key will be generated.
 * const did = await DidKey.create();
 *
 * // The algorithm to use for key generation can be specified as a top-level option.
 * const did = await DidKey.create({
 *   options: { algorithm = 'secp256k1' }
 * });
 *
 * // Or, alternatively as a property of the verification method.
 * const did = await DidKey.create({
 *   options: {
 *     verificationMethods: [{ algorithm = 'secp256k1' }]
 *   }
 * });
 * ```
 */
export interface DidKeyCreateOptions<TKms> extends DidCreateOptions<TKms> {
  /**
   * Optionally specify the algorithm to be used for key generation.
   */
  algorithm?: TKms extends CryptoApi
    ? InferKeyGeneratorAlgorithm<TKms>
    : InferKeyGeneratorAlgorithm<LocalKeyManager>;

  /**
   * Optionally enable encryption key derivation during DID creation.
   *
   * By default, this option is set to `false`, which means encryption key derivation is not
   * performed unless explicitly enabled.
   *
   * When set to `true`, an `X25519` key will be derived from the `Ed25519` public key used to
   * create the DID. This feature enables the same DID to be used for encrypted communication, in
   * addition to signature verification.
   *
   * Notes:
   * - This option is ONLY applicable when the `algorithm` of the DID's public key is `Ed25519`.
   * - Enabling this introduces specific cryptographic considerations that should be understood
   *   before using the same key pair for digital signatures and encrypted communication. See the following for more information:
   */
  enableEncryptionKeyDerivation?: boolean;

  /**
   * Optionally specify the format of the public key to be used for DID creation.
   */
  publicKeyFormat?: keyof typeof DidKey.VERIFICATION_METHOD_TYPES;

  /**
   * Alternatively, specify the algorithm to be used for key generation of the single verification
   * method in the DID Document.
   */
  verificationMethods?: [DidCreateVerificationMethod<TKms>];
}

/**
 * The `DidKey` class provides an implementation of the 'did:key' DID method.
 *
 * !TODO: Add the rest of the class documentation.
 *
 * @remarks
 * The `did:key` DID method uses a single public key to generate a DID and does not rely
 * on any external system such as a blockchain or centralized database. This characteristic makes
 * it suitable for use cases where a assertions about a DID Subject can be self-verifiable by
 * third parties.
 *
 * The method-specific identifier is formed by
 * {@link https://datatracker.ietf.org/doc/html/draft-multiformats-multibase#name-base-58-bitcoin-encoding | Multibase base58-btc}
 * encoding the concatenation of the
 * {@link https://github.com/multiformats/multicodec/blob/master/README.md | Multicodec} identifier
 * for the public key type and the raw public key bytes. To form the DID URI, the method-specific
 * identifier is prefixed with the string 'did:key:'.
 *
 * This method can optionally derive an encryption key from the public key used to create the DID
 * if and only if the public key algorithm is `Ed25519`. This feature enables the same DID to be
 * used for encrypted communication, in addition to signature verification. To enable this
 * feature when calling {@link DidKey.create | `DidKey.create()`}, first specify an `algorithm` of
 * `Ed25519` or provide a `keySet` referencing an `Ed25519` key and then set the
 * `enableEncryptionKeyDerivation` option to `true`.
 *
 * Note:
 * - The authors of the DID Key specification have indicated that use of this method for long-lived
 *   use cases is only recommended when accompanied with high confidence that private keys are
 *   securely protected by software or hardware isolation.
 *
 * @see {@link https://w3c-ccg.github.io/did-method-key/ | DID Key Specification}
 *
 * @example
 * !TODO: Add examples.
 */
export class DidKey extends DidMethod {

  /**
   * Name of the DID method, as defined in the DID Key specification.
   */
  public static methodName = 'key';

  public static readonly VERIFICATION_METHOD_TYPES = {
    'Ed25519VerificationKey2020' : 'https://w3id.org/security/suites/ed25519-2020/v1',
    'JsonWebKey2020'             : 'https://w3id.org/security/suites/jws-2020/v1',
    'X25519KeyAgreementKey2020'  : 'https://w3id.org/security/suites/x25519-2020/v1',
  } as const;

  /**
   * Creates a new DID using the `did:key` method formed from either a newly generated key or an
   * existing key set.
   *
   * @remarks
   * The DID URI is formed by
   * {@link https://datatracker.ietf.org/doc/html/draft-multiformats-multibase#name-base-58-bitcoin-encoding | Multibase base58-btc}
   * encoding the
   * {@link https://github.com/multiformats/multicodec/blob/master/README.md | Multicodec}-encoded
   * public key and prefixing with `did:key:`.
   *
   * This method can optionally derive an encryption key from the public key used to create the DID
   * if and only if the public key algorithm is `Ed25519`. This feature enables the same DID to be
   * used for encrypted communication, in addition to signature verification. To enable this
   * feature, first specify an `algorithm` of `Ed25519` or provide a `keySet` referencing an
   * `Ed25519` key and then set the `enableEncryptionKeyDerivation` option to `true`.
   *
   * Notes:
   * - If no `options` are given, by default a new Ed25519 key will be generated.
   * - The `algorithm` and `keySet` options are mutually exclusive. If both are given, an
   *   error will be thrown.
   * - If a `keySet` is given, it must contain exactly one key.
   *
   * @param params - The parameters for the create operation.
   * @param params.keyManager - Key Management System (KMS) used to generate keys and sign data.
   * @param params.options - Optional parameters that can be specified when creating a new DID.
   * @returns A Promise resolving to a {@link Did} object representing the new DID.
   * @throws `TypeError` if both `algorithm` and `keySet` options are provided, as they
   *         are mutually exclusive.
   */
  public static async create<TKms extends CryptoApi | undefined = undefined>({
    keyManager = new LocalKeyManager(),
    options = {}
  }: {
    keyManager?: TKms;
    options?: DidKeyCreateOptions<TKms>;
  } = {}): Promise<Did> {
    if (options.algorithm && options.verificationMethods) {
      throw new Error(`The 'algorithm' and 'verificationMethods' options are mutually exclusive`);
    }

    let {
      // Default to not deriving an encryption key.
      enableEncryptionKeyDerivation = false,
    } = options;

    // Default to Ed25519 key generation if an algorithm is not given.
    const algorithm = options.algorithm ?? options.verificationMethods?.[0]?.algorithm ?? 'Ed25519';

    return null as any;
  }
}






























