import type {
  Jwk,
  Signer,
  CryptoApi,
  KeyIdentifier,
  EnclosedSignParams,
  KmsExportKeyParams,
  KmsImportKeyParams,
  KeyImporterExporter,
  EnclosedVerifyParams,
} from '@web5/crypto';

import { LocalKeyManager, utils as cryptoUtils } from '@web5/crypto';

import type { DidDocument } from './types/did-core.js';
import type { DidMetadata, PortableDid } from './types/portable-did.js';

import { DidError, DidErrorCode } from './did-error.js';
import { extractDidFragment, getVerificationMethods } from './utils.js';

/**
 * A `BearerDidSigner` extends the {@link Signer} interface to include specific properties for
 * signing with a Decentralized Identifier (DID). It encapsulates the algorithm and key identifier,
 * which are often needed when signing JWTs, JWSs, JWEs, and other data structures.
 *
 * Typically, the algorithm and key identifier are used to populate the `alg` and `kid` fields of a
 * JWT or JWS header.
 */
export interface BearerDidSigner extends Signer {
  /**
   * The cryptographic algorithm identifier used for signing operations.
   *
   * Typically, this value is used to populate the `alg` field of a JWT or JWS header. The
   * registered algorithm names are defined in the
   * {@link https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms | IANA JSON Web Signature and Encryption Algorithms registry}.
   *
   * @example
   * "ES256" // ECDSA using P-256 and SHA-256
   */
  algorithm: string;

  /**
   * The unique identifier of the key within the DID document that is used for signing and
   * verification operations.
   *
   * This identifier must be a DID URI with a fragment (e.g., did:method:123#key-0) that references
   * a specific verification method in the DID document. It allows users of a `BearerDidSigner` to
   * determine the DID and key that will be used for signing and verification operations.
   *
   * @example
   * "did:dht:123#key-1" // A fragment identifier referring to a key in the DID document
   */
  keyId: string;
}

/**
 * Represents a Decentralized Identifier (DID) along with its DID document, key manager, metadata,
 * and convenience functions.
 */
export class BearerDid {
  /** {@inheritDoc Did#uri} */
  uri: string;

  /**
   * The DID document associated with this DID.
   *
   * @see {@link https://www.w3.org/TR/did-core/#dfn-diddocument | DID Core Specification, § DID Document}
   */
  document: DidDocument;

  /** {@inheritDoc DidMetadata} */
  metadata: DidMetadata;

  /**
   * Key Management System (KMS) used to manage the DIDs keys and sign data.
   *
   * Each DID method requires at least one key be present in the provided `keyManager`.
   */
  keyManager: CryptoApi;

  constructor({ uri, document, metadata, keyManager }: {
    uri: string,
    document: DidDocument,
    metadata: DidMetadata,
    keyManager: CryptoApi
  }) {
    this.uri = uri;
    this.document = document;
    this.metadata = metadata;
    this.keyManager = keyManager;
  }

  /**
   * Converts a `BearerDid` object to a portable format containing the URI and verification methods
   * associated with the DID.
   *
   * This method is useful when you need to represent the key material and metadata associated with
   * a DID in format that can be used independently of the specific DID method implementation. It
   * extracts both public and private keys from the DID's key manager and organizes them into a
   * `PortableDid` structure.
   *
   * @remarks
   * If the DID's key manager does not allow private keys to be exported, the `PortableDid` returned
   * will not contain a `privateKeys` property. This enables the importing and exporting DIDs that
   * use the same underlying KMS even if the KMS does not support exporting private keys. Examples
   * include hardware security modules (HSMs) and cloud-based KMS services like AWS KMS.
   *
   * If the DID's key manager does support exporting private keys, the resulting `PortableDid` will
   * include a `privateKeys` property which contains the same number of entries as there are
   * verification methods as the DID document, each with its associated private key and the
   * purpose(s) for which the key can be used (e.g., `authentication`, `assertionMethod`, etc.).
   *
   * @example
   * ```ts
   * // Assuming `did` is an instance of BearerDid
   * const portableDid = await did.export();
   * // portableDid now contains the DID URI, document, metadata, and optionally, private keys.
   * ```
   *
   * @returns A `PortableDid` containing the URI, DID document, metadata, and optionally private
   *          keys associated with the `BearerDid`.
   * @throws An error if the DID document does not contain any verification methods or the keys for
   *         any verification method are missing in the key manager.
   */
  public async export(): Promise<PortableDid> {
    // Verify the DID document contains at least one verification method.
    if (!(Array.isArray(this.document.verificationMethod) && this.document.verificationMethod.length > 0)) {
      throw new Error(`DID document for '${this.uri}' is missing verification methods`);
    }

    // Create a new `PortableDid` object to store the exported data.
    let portableDid: PortableDid = {
      uri      : this.uri,
      document : this.document,
      metadata : this.metadata
    };

    // If the BearerDid's key manager supports exporting private keys, add them to the portable DID.
    if ('exportKey' in this.keyManager && typeof this.keyManager.exportKey === 'function') {
      const privateKeys: Jwk[] = [];
      for (let vm of this.document.verificationMethod) {
        if (!vm.publicKeyJwk) {
          throw new Error(`Verification method '${vm.id}' does not contain a public key in JWK format`);
        }

        // Compute the key URI of the verification method's public key.
        const keyUri = await this.keyManager.getKeyUri({ key: vm.publicKeyJwk });

        // Retrieve the private key from the key manager.
        const privateKey = await this.keyManager.exportKey({ keyUri }) as Jwk;

        // Add the verification method to the key set.
        privateKeys.push({ ...privateKey });
      }
      portableDid.privateKeys = privateKeys;
    }

    return portableDid;
  }

  /**
   * Return a {@link Signer} that can be used to sign messages, credentials, or arbitrary data.
   *
   * If given, the `methodId` parameter is used to select a key from the verification methods
   * present in the DID Document.
   *
   * If `methodID` is not given, the first verification method intended for signing claims is used.
   *
   * @param params - The parameters for the `getSigner` operation.
   * @param params.methodId - ID of the verification method key that will be used for sign and
   *                          verify operations. Optional.
   * @returns An instantiated {@link Signer} that can be used to sign and verify data.
   */
  public async getSigner(params?: { methodId: string }): Promise<BearerDidSigner> {
    // Attempt to find a verification method that matches the given method ID, or if not given,
    // find the first verification method intended for signing claims.
    const verificationMethod = this.document.verificationMethod?.find(
      vm => extractDidFragment(vm.id) === (extractDidFragment(params?.methodId) ?? extractDidFragment(this.document.assertionMethod?.[0]))
    );

    if (!(verificationMethod && verificationMethod.publicKeyJwk)) {
      throw new DidError(DidErrorCode.InternalError, 'A verification method intended for signing could not be determined from the DID Document');
    }

    // Compute the expected key URI of the signing key.
    const keyUri = await this.keyManager.getKeyUri({ key: verificationMethod.publicKeyJwk });

    // Get the public key to be used for verify operations, which also verifies that the key is
    // present in the key manager's store.
    const publicKey = await this.keyManager.getPublicKey({ keyUri });

    // Bind the DID's key manager to the signer.
    const keyManager = this.keyManager;

    // Determine the signing algorithm.
    const algorithm = cryptoUtils.getJoseSignatureAlgorithmFromPublicKey(publicKey);

    return {
      algorithm : algorithm,
      keyId     : verificationMethod.id,

      async sign({ data }: EnclosedSignParams): Promise<Uint8Array> {
        const signature = await keyManager.sign({ data, keyUri: keyUri! }); // `keyUri` is guaranteed to be defined at this point.
        return signature;
      },

      async verify({ data, signature }: EnclosedVerifyParams): Promise<boolean> {
        const isValid = await keyManager.verify({ data, key: publicKey!, signature }); // `publicKey` is guaranteed to be defined at this point.
        return isValid;
      }
    };
  }

  /**
   * Instantiates a {@link BearerDid} object from a given {@link PortableDid}.
   *
   * This method allows for the creation of a `BearerDid` object using a previously created DID's
   * key material, DID document, and metadata.
   *
   * @example
   * ```ts
   * // Export an existing BearerDid to PortableDid format.
   * const portableDid = await did.export();
   * // Reconstruct a BearerDid object from the PortableDid.
   * const did = await BearerDid.import({ portableDid });
   * ```
   *
   * @param params - The parameters for the import operation.
   * @param params.portableDid - The PortableDid object to import.
   * @param params.keyManager - Optionally specify an external Key Management System (KMS) used to
   *                            generate keys and sign data. If not given, a new
   *                            {@link LocalKeyManager} instance will be created and
   *                            used.
   * @returns A Promise resolving to a `BearerDid` object representing the DID formed from the
   *          provided PortableDid.
   * @throws An error if the PortableDid document does not contain any verification methods or the
   *         keys for any verification method are missing in the key manager.
   */
  public static async import({ portableDid, keyManager = new LocalKeyManager() }: {
    keyManager?: CryptoApi & KeyImporterExporter<KmsImportKeyParams, KeyIdentifier, KmsExportKeyParams>;
    portableDid: PortableDid;
  }): Promise<BearerDid> {
    // Get all verification methods from the given DID document, including embedded methods.
    const verificationMethods = getVerificationMethods({ didDocument: portableDid.document });

    // Validate that the DID document contains at least one verification method.
    if (verificationMethods.length === 0) {
      throw new DidError(DidErrorCode.InvalidDidDocument, `At least one verification method is required but 0 were given`);
    }

    // If given, import the private key material into the key manager.
    for (let key of portableDid.privateKeys ?? []) {
      await keyManager.importKey({ key });
    }

    // Validate that the key material for every verification method in the DID document is present
    // in the key manager.
    for (let vm of verificationMethods) {
      if (!vm.publicKeyJwk) {
        throw new Error(`Verification method '${vm.id}' does not contain a public key in JWK format`);
      }

      // Compute the key URI of the verification method's public key.
      const keyUri = await keyManager.getKeyUri({ key: vm.publicKeyJwk });

      // Verify that the key is present in the key manager. If not, an error is thrown.
      await keyManager.getPublicKey({ keyUri });
    }

    // Use the given PortableDid to construct the BearerDid object.
    const did = new BearerDid({
      uri      : portableDid.uri,
      document : portableDid.document,
      metadata : portableDid.metadata,
      keyManager
    });

    return did;
  }
}