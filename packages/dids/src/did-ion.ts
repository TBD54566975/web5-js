import type { PublicKeyJwk, PrivateKeyJwk } from '@tbd54566975/crypto';
import type { DidResolutionResult, DidMethodResolver, DidMethodCreator, DidState, DwnServiceEndpoint, DidDocument } from './types.js';

import { DID, generateKeyPair } from '@decentralized-identity/ion-tools';

export type DidIonCreateOptions = {
  keys?: KeyOption[];
  services?: ServiceOption[];
};

export type ServiceOption = {
  id: string;
  type: string;
  serviceEndpoint: string | DwnServiceEndpoint;
}

export type KeyOption = {
  id: string;
  type: string;
  keyPair: {
    publicJwk: PublicKeyJwk;
    privateJwk: PrivateKeyJwk;
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
    };

    // TODO: Migrate this to a utility function that generates a DID document given DidState.
    // TODO: Add tests to DID Document generation function to ensure that it produces results identical to DidResolver.
    // TODO: Ensure both DID ION and KEY do this consistently.
    const didDocument: DidDocument = {
      '@context'         : 'https://www.w3.org/ns/did/v1',
      id                 : didState.id,
      verificationMethod : [],
    };

    for (let key of didState.methodData[0].content.publicKeys) {
      const verificationMethod = {
        id           : `#${key.id}`,
        controller   : didState.id,
        type         : key.type,
        publicKeyJwk : key.publicKeyJwk
      };
      didDocument.verificationMethod.push(verificationMethod);

      for (let purpose of key.purposes) {
        if (didDocument[purpose]) {
          didDocument[purpose].push(key.id);
        } else {
          didDocument[purpose] = [`#${key.id}`];
        }
      }
    }

    for (let service of didState.methodData[0]?.content?.services || []) {
      const serviceEntry = {
        id              : `#${service.id}`,
        type            : service.type,
        serviceEndpoint : { ...service.serviceEndpoint }
      };
      if (didDocument.service) {
        didDocument.service.push(serviceEntry);
      } else {
        didDocument.service = [serviceEntry];
      }
    }

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
      id          : didState.id,
      internalId  : didState.internalId,
      didDocument : didDocument,
      methodData  : didState.methodData,
      keys        : keys  // TODO: Remove keys once KeyManager/KeyStore implemented since everything BUT privateKeyJwk is already in the returned didDocument.
    };
  }

  async resolve(did: string): Promise<DidResolutionResult> {
    // TODO: Support resolutionOptions as defined in https://www.w3.org/TR/did-core/#did-resolution
    // using `URL` constructor to handle both existence and absence of trailing slash '/' in resolution endpoint
    // appending './' to DID so 'did' in 'did:ion:abc' doesn't get interpreted as a URL scheme (e.g. like 'http') due to the colon
    // TODO: Add tests to ensure that the scenarios this contemplated are checked.
    const resolutionUrl = new URL('./' + did, this.resolutionEndpoint).toString();
    const response = await fetch(resolutionUrl);

    // TODO: Replace with check of resonse.ok to catch other 2XX codes.
    if (response.status !== 200) {
      throw new Error(`unable to resolve ${did}, got http status ${response.status}`);
    }

    const didResolutionResult = await response.json();
    return didResolutionResult;
  }

  /**
   * generates three key pairs used for attestation, authorization and encryption purposes
   * when interfacing with DWNs. the ids of these keys are referenced in the service object
   *  that includes the dwnUrls provided.
   */
  async generateDwnConfiguration(dwnUrls: string[]): Promise<DidIonCreateOptions> {
    return DidIonApi.generateDwnConfiguration(dwnUrls);
  }

  /**
   * generates three key pairs used for attestation, authorization and encryption purposes
   * when interfacing with DWNs. the ids of these keys are referenced in the service object
   *  that includes the dwnUrls provided.
   */
  static async generateDwnConfiguration(dwnUrls: string[]): Promise<DidIonCreateOptions> {
    const keys = [{
      id       : 'attest',
      type     : 'JsonWebKey2020',
      keyPair  : await generateKeyPair('secp256k1'),
      purposes : ['authentication'],
    }, {
      id       : 'authz',
      type     : 'JsonWebKey2020',
      keyPair  : await generateKeyPair('secp256k1'),
      purposes : ['authentication'],
    }, {
      id       : 'encr',
      type     : 'JsonWebKey2020',
      keyPair  : await generateKeyPair('secp256k1'),
      purposes : ['keyAgreement'],
    }];

    const services = [{
      'id'              : 'dwn',
      'type'            : 'DecentralizedWebNode',
      'serviceEndpoint' : {
        'nodes'                    : dwnUrls,
        'messageAttestationKeys'   : ['#attest'],
        'messageAuthorizationKeys' : ['#authz'],
        'recordEncryptionKeys'     : ['#encr']
      }
    }];

    return { keys, services };
  }
}