
import { DID, generateKeyPair, resolve, sign, verify } from '@decentralized-identity/ion-tools';

async function create(options = {}){
  options.keys = options.keys || [{
    id: 'key-1',
    type: 'JsonWebKey2020',
    keypair: await generateKeyPair(),
    purposes: ['authentication']
  }]

  const did = new DID({
    content: {
      publicKeys: options.keys.map(key => {
        let pubkey = Object.assign({}, key);
        pubkey.publicKeyJwk = key.keypair.publicJwk;
        delete pubkey.keypair;
        return pubkey;
      }),
      ...(options.services && { services: options.services })
    }
  });

  return {
    id: await did.getURI(),
    internalId: await did.getURI('short'),
    methodData: await did.getAllOperations(),
    keys: options.keys,
    services: options.services || []
  }
}

export {
  create,
  sign,
  verify,
  resolve
}
