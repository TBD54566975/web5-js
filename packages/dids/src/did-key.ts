import type { DidMethodCreator, DidMethodResolver, DidState } from './types.js';

import { ed25519 } from '@tbd54566975/crypto';
import { DidKeyResolver } from '@tbd54566975/dwn-sdk-js';
import { createVerificationMethodWithPrivateKeyJwk, keyToMultibaseId } from './utils.js';

const didKeyResolver = new DidKeyResolver();

export type DidKeyOptions = never;

//! i know dwn-sdk-js has a resolver that includes both creation and resolving. but they're slightly different and we really
//! need to settle on what the normalized result of did creation is.

export class DidKeyApi implements DidMethodResolver, DidMethodCreator {
  get methodName() {
    return 'key';
  }

  async create(_options: any = {}): Promise<DidState> {
    // Generate new sign key pair.
    const verificationKeyPair = ed25519.generateKeyPair();
    const keyAgreementKeyPair = ed25519.deriveX25519KeyPair(verificationKeyPair);

    const verificationKeyId = keyToMultibaseId({ key: verificationKeyPair.publicKey, multicodecName: 'ed25519-pub' });
    const keyAgreementKeyId = keyToMultibaseId({ key: keyAgreementKeyPair.publicKey, multicodecName: 'x25519-pub' });

    const id = `did:key:${verificationKeyId}`;

    const verificationJwkPair = ed25519.keyPairToJwk(verificationKeyPair, verificationKeyId);
    const verificationKey = createVerificationMethodWithPrivateKeyJwk(id, verificationJwkPair);

    const keyAgreementJwkPair = ed25519.keyPairToJwk(keyAgreementKeyPair, keyAgreementKeyId, { crv: 'X25519' });
    const keyAgreementKey = createVerificationMethodWithPrivateKeyJwk(id, keyAgreementJwkPair);

    return {
      id,
      internalId : id,
      // didDocument : {},  //! TODO: Add DidDocument to object returned.
      keys       : [verificationKey, keyAgreementKey],
      methodData : {}
    };
  }

  resolve(did: string) {
    // TODO: Support resolutionOptions as defined in https://www.w3.org/TR/did-core/#did-resolution
    // TODO: move did:key resolving logic to this package. resolved Did Doc does **not** include keyAgreement
    return didKeyResolver.resolve(did);
  }
}

