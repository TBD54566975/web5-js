import { DID, generateKeyPair, sign, verify } from '@decentralized-identity/ion-tools';
import { DidIonResolver } from '@tbd54566975/dwn-sdk-js';

const didIonResolver = new DidIonResolver();

async function create(options = { }){
  options.keys ||= [
    {
      id: 'dwn',
      type: 'JsonWebKey2020',
      keyPair: await generateKeyPair(),
      purposes: ['authentication'],
    },
  ];

  const did = new DID({
    content: {
      publicKeys: options.keys.map(key => {
        let pubkey = Object.assign({ }, key);
        pubkey.publicKeyJwk = key.keyPair.publicJwk;
        delete pubkey.keyPair;
        return pubkey;
      }),
      ...(options.services && { services: options.services }),
    },
  });

  return {
    id: await did.getURI(),
    internalId: await did.getURI('short'),
    methodData: await did.getAllOperations(),
    keys: options.keys,
    services: options.services || [ ],
  };
}

async function resolve(did) {
  try {
    return await didIonResolver.resolve(did);
  } catch (error) {
    return {
      didDocument           : null,
      didDocumentMetadata   : {},
      didResolutionMetadata : {
        error: error.message,
      },
    };
  }
}

export {
  create,
  sign,
  verify,
  resolve,
};
