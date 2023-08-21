import { DID, generateKeyPair } from '@decentralized-identity/ion-tools';
import { DidIonResolver } from '@tbd54566975/dwn-sdk-js';

export { sign, verify } from '@decentralized-identity/ion-tools';

const didIonResolver = new DidIonResolver();

export async function create(options = { }){
  options.keys ||= [
    {
      id: 'dwn',
      type: 'JsonWebKey2020',
      keyPair: await generateKeyPair(),
      purposes: ['authentication'],
    },
  ];

  console.log(JSON.stringify({
    content: {
      publicKeys: options.keys.map(key => {
        let pubkey = Object.assign({ }, key);
        pubkey.publicKeyJwk = key.keyPair.publicJwk;
        delete pubkey.keyPair;
        return pubkey;
      }),
      ...(options.services && { services: options.services }),
    },
  }, null, 2));

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

export async function resolve(did) {
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
