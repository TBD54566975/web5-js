import type { Jwk } from '@web5/crypto';

import { expect } from 'chai';

import type { Web5PlatformAgent } from '../../../../src/types/agent.js';

import { AgentCryptoApi } from '../../../../src/crypto-api.js';
import { LocalKeyManager } from '../../../../src/local-key-manager.js';
import { FlattenedJwe } from '../../../../src/prototyping/crypto/jose/jwe-flattened.js';

describe('FlattenedJwe', () => {
  let crypto = new AgentCryptoApi();
  let keyManager: LocalKeyManager;

  beforeEach(async () => {
    keyManager = new LocalKeyManager({ agent: {} as Web5PlatformAgent});
  });

  describe('decrypt()', () => {
    it('returns the expected result given a decryption JWK and Flattened JWE', async () => {
      const key: Jwk = {
        kty : 'oct',
        k   : 'x_6M0CwMITqmj0a-u1EggAmolpXWty6UxwlfWVtWgFs',
        alg : 'A256GCM',
        kid : '5CWawXBcFqty31Fb5vb5bABh-SbKpfFQAO596UfODRY',
      };

      const result = await FlattenedJwe.decrypt({
        jwe: {
          protected  : 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0',
          iv         : 'cCbtijzQbvD0p6ED',
          ciphertext : 'v1uDcQ',
          tag        : 'lksRf79sT-j3cRV6kSK08Q'
        },
        key,
        crypto,
        keyManager
      });

      expect(result.plaintext).to.be.instanceOf(Uint8Array);
      expect(result.plaintext).to.deep.equal(new Uint8Array([1, 2, 3, 4]));
      expect(result.protectedHeader).to.deep.equal({ alg: 'dir', enc: 'A256GCM' });
      expect(result.unprotectedHeader).to.be.undefined;
      expect(result.additionalAuthenticatedData).to.be.undefined;
      expect(result.sharedUnprotectedHeader).to.be.undefined;
    });

    it('returns the expected result given a decryption Key URI and Flattened JWE', async () => {
      const testKey: Jwk = {
        kty : 'oct',
        k   : 'x_6M0CwMITqmj0a-u1EggAmolpXWty6UxwlfWVtWgFs',
        alg : 'A256GCM',
        kid : '5CWawXBcFqty31Fb5vb5bABh-SbKpfFQAO596UfODRY',
      };

      const keyUri = await keyManager.importKey({ key: testKey });

      const result = await FlattenedJwe.decrypt({
        jwe: {
          protected  : 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0',
          iv         : 'cCbtijzQbvD0p6ED',
          ciphertext : 'v1uDcQ',
          tag        : 'lksRf79sT-j3cRV6kSK08Q'
        },
        key: keyUri,
        crypto,
        keyManager
      });

      expect(result.plaintext).to.be.instanceOf(Uint8Array);
      expect(result.plaintext).to.deep.equal(new Uint8Array([1, 2, 3, 4]));
      expect(result.protectedHeader).to.deep.equal({ alg: 'dir', enc: 'A256GCM' });
      expect(result.unprotectedHeader).to.be.undefined;
      expect(result.additionalAuthenticatedData).to.be.undefined;
      expect(result.sharedUnprotectedHeader).to.be.undefined;
    });
  });

  describe('encrypt()', () => {
    it('encrypts and returns a Flattened JWE given an encryption JWK', async () => {
      const key: Jwk = {
        kty : 'oct',
        k   : 'x_6M0CwMITqmj0a-u1EggAmolpXWty6UxwlfWVtWgFs',
        alg : 'A256GCM',
        kid : '5CWawXBcFqty31Fb5vb5bABh-SbKpfFQAO596UfODRY',
      };

      const flattenedJwe = await FlattenedJwe.encrypt({
        plaintext       : new Uint8Array([1, 2, 3, 4]),
        protectedHeader : { alg: 'dir', enc: 'A256GCM' },
        key,
        crypto,
        keyManager
      });

      expect(flattenedJwe.aad).to.be.undefined;
      expect(flattenedJwe.ciphertext).to.be.a('string');
      expect(flattenedJwe.iv).to.be.a('string');
      expect(flattenedJwe.protected).to.be.a('string');
      expect(flattenedJwe.tag).to.be.a('string');
      expect(flattenedJwe.unprotected).to.be.undefined;
      expect(flattenedJwe.header).to.be.undefined;
      expect(flattenedJwe.encrypted_key).to.be.undefined;
    });

    it('encrypts and returns a Flattened JWE given an encryption Key URI', async () => {
      const testKey: Jwk = {
        kty : 'oct',
        k   : 'x_6M0CwMITqmj0a-u1EggAmolpXWty6UxwlfWVtWgFs',
        alg : 'A256GCM',
        kid : '5CWawXBcFqty31Fb5vb5bABh-SbKpfFQAO596UfODRY',
      };

      const keyUri = await keyManager.importKey({ key: testKey });

      const flattenedJwe = await FlattenedJwe.encrypt({
        plaintext       : new Uint8Array([1, 2, 3, 4]),
        protectedHeader : { alg: 'dir', enc: 'A256GCM' },
        key             : keyUri,
        crypto,
        keyManager
      });

      expect(flattenedJwe.aad).to.be.undefined;
      expect(flattenedJwe.ciphertext).to.be.a('string');
      expect(flattenedJwe.iv).to.be.a('string');
      expect(flattenedJwe.protected).to.be.a('string');
      expect(flattenedJwe.tag).to.be.a('string');
      expect(flattenedJwe.unprotected).to.be.undefined;
      expect(flattenedJwe.header).to.be.undefined;
      expect(flattenedJwe.encrypted_key).to.be.undefined;
    });
  });
});