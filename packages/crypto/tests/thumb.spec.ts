import { EcdsaAlgorithm } from '../src/crypto-algorithms/index.js';

import { Jose } from '../src/jose.js';

describe.only('thing', () => {
  it('', async () => {
    const alg = EcdsaAlgorithm.create();
    const key = await alg.generateKey({ algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' }, extractable: true, keyUsages: ['sign', 'verify'] });
    const jwk = await Jose.cryptoKeyToJwk({ key: key.publicKey });
    console.log(jwk);
    const thumbprint = await Jose.jwkThumbprint({ key: jwk});
    console.log(thumbprint);
  });

  // it('', async () => {
  //   const alg = AesCtrAlgorithm.create();
  //   const key = await alg.generateKey({ algorithm: { name: 'AES-CTR', length: 256 }, extractable: true, keyUsages: ['encrypt', 'decrypt'] });
  //   const jwk = await Jose.cryptoKeyToJwk({ key });
  //   console.log(jwk);
  //   const thumbprint = await Jose.jwkThumbprint({ key: jwk});
  //   console.log(thumbprint);
  // });
});