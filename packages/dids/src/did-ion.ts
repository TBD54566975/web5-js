import type { PublicJwk, PrivateJwk } from '@tbd54566975/crypto';
import type { DidResolutionResult, DidMethodResolver, DidMethodCreator, DidState } from './types.js';

import { DID, generateKeyPair } from '@decentralized-identity/ion-tools';

export type DidIonCreateOptions = {
  keys?: KeyOption[];
  services?: ServiceOption[];
};

export type ServiceOption = {
  id: string;
  type: string;
  serviceEndpoint: string;
}

export type KeyOption = {
  id: string;
  type: string;
  keyPair: {
    publicJwk: PublicJwk;
    privateJwk: PrivateJwk;
  },
  purposes: string[];
}

export class DidIonApi implements DidMethodResolver, DidMethodCreator {
  /**
   * @param resolutionEndpoint optional custom URL to send DID resolution request to
   */
  constructor (private resolutionEndpoint: string = 'https://discover.did.msidentity.com/1.0/identifiers/') {}

  get methodName() {
    return 'ion';
  }

  // TODO: discuss. need to normalize what's returned from `create`. DidIon.create and DidKey.create return different things.
  async create(options: DidIonCreateOptions = {}): Promise<DidState> {
    options.keys ||= [
      {
        id       : 'dwn',
        type     : 'JsonWebKey2020',
        keyPair  : await generateKeyPair(),
        purposes : ['authentication'],
      },
    ];

    const didOptions: any = { publicKeys: [] };
    if (options.services) {
      didOptions.services = options.services;
    }

    for (let key of options.keys) {
      const publicKey: any = { ...key };

      publicKey.publicKeyJwk = key.keyPair.publicJwk;
      delete publicKey.keyPair;

      didOptions.publicKeys.push(publicKey);
    }

    const did = new DID({ content: didOptions });
    const didState = {
      id         : await did.getURI(),
      internalId : await did.getURI('short'),
      methodData : await did.getAllOperations(),
      services   : options.services || [ ],
    };

    const keys = [];
    for (let keyOption of options.keys) {
      const key = {
        id            : `${didState.id}#${keyOption.id}`,
        type          : keyOption.type,
        controller    : didState.id,
        publicKeyJwk  : keyOption.keyPair.publicJwk,
        privateKeyJwk : keyOption.keyPair.privateJwk
      };

      keys.push(key);
    }

    return {
      id         : await did.getURI(),
      internalId : await did.getURI('short'),
      methodData : await did.getAllOperations(),
      keys       : keys,
      services   : options.services || [ ],
    };
  }

  async resolve(did: string): Promise<DidResolutionResult> {
    // using `URL` constructor to handle both existence and absence of trailing slash '/' in resolution endpoint
    // appending './' to DID so 'did' in 'did:ion:abc' doesn't get interpreted as a URL scheme (e.g. like 'http') due to the colon
    const resolutionUrl = new URL('./' + did, this.resolutionEndpoint).toString();
    const response = await fetch(resolutionUrl);

    if (response.status !== 200) {
      throw new Error(`unable to resolve ${did}, got http status ${response.status}`);
    }

    const didResolutionResult = await response.json();
    return didResolutionResult;
  }
}