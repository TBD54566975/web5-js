import { ed25519, utils } from '@tbd54566975/crypto';
import { DidKeyResolver } from '@tbd54566975/dwn-sdk-js';
import { InterestingVerificationMethod, createInterestingVerificationMethod } from './utils.js';
import { DidMethodResolver } from './types.js';

const didKeyResolver = new DidKeyResolver();

export type DidKeyOptions = never;

// TODO: discuss. need to normalize what's returned from `create`. DidIon.create and DidKey.create return different things.
export type DidState = {
  id: string;
  internalId: string;
  keys: InterestingVerificationMethod[]
}

export class DidKeyApi implements DidMethodResolver {
  get methodName() {
    return 'key';
  }

  create(): DidState {
    // Generate new sign key pair.
    const verificationKeyPair = ed25519.generateKeyPair();
    const keyAgreementKeyPair = ed25519.deriveX25519KeyPair(verificationKeyPair);

    const verificationKeyId = utils.bytesToBase58btcMultibase(utils.MULTICODEC_HEADERS.ED25519.PUB, verificationKeyPair.publicKey);
    const keyAgreementKeyId = utils.bytesToBase58btcMultibase(utils.MULTICODEC_HEADERS.X25519.PUB, keyAgreementKeyPair.publicKey);

    const id = `did:key:${verificationKeyId}`;

    const verificationJwkPair = ed25519.keyPairToJwk(verificationKeyPair, verificationKeyId);
    const verificationKey = createInterestingVerificationMethod(id, verificationJwkPair);

    const keyAgreementJwkPair = ed25519.keyPairToJwk(keyAgreementKeyPair, keyAgreementKeyId, { crv: 'X25519' });
    const keyAgreementKey = createInterestingVerificationMethod(id, keyAgreementJwkPair);

    return {
      id,
      internalId : id,
      keys       : [verificationKey, keyAgreementKey],
    };
  }

  resolve(did: string) {
    // TODO: move did:key resolving logic to this package. resolved Did Doc does **not** include keyAgreement
    return didKeyResolver.resolve(did);
  }
}

