import type { Jwk } from '@web5/crypto';

import { expect } from 'chai';

import type { Web5PlatformAgent } from '../../../../src/types/agent.js';

import { AgentCryptoApi } from '../../../../src/crypto-api.js';
import { LocalKeyManager } from '../../../../src/local-key-manager.js';
import { CompactJwe } from '../../../../src/prototyping/crypto/jose/jwe-compact.js';

describe('CompactJwe', () => {
  let crypto = new AgentCryptoApi();
  let keyManager: LocalKeyManager;

  beforeEach(async () => {
    keyManager = new LocalKeyManager({ agent: {} as Web5PlatformAgent});
  });

  describe('decrypt()', () => {
    it('returns the protected header and decrypted payload given a decryption JWK', async () => {
      const key: Jwk = {
        kty : 'oct',
        k   : 'x_6M0CwMITqmj0a-u1EggAmolpXWty6UxwlfWVtWgFs',
        alg : 'A256GCM',
        kid : '5CWawXBcFqty31Fb5vb5bABh-SbKpfFQAO596UfODRY',
      };

      const { plaintext, protectedHeader } = await CompactJwe.decrypt({
        jwe: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..cCbtijzQbvD0p6ED.v1uDcQ.lksRf79sT-j3cRV6kSK08Q',
        key,
        crypto,
        keyManager
      });

      expect(plaintext).to.be.instanceOf(Uint8Array);
      expect(protectedHeader).to.deep.equal({ alg: 'dir', enc: 'A256GCM' });
    });

    it('returns the protected header and decrypted payload given a decryption Key URI', async () => {
      const testKey: Jwk = {
        kty : 'oct',
        k   : 'x_6M0CwMITqmj0a-u1EggAmolpXWty6UxwlfWVtWgFs',
        alg : 'A256GCM',
        kid : '5CWawXBcFqty31Fb5vb5bABh-SbKpfFQAO596UfODRY',
      };

      const keyUri = await keyManager.importKey({ key: testKey });

      const { plaintext, protectedHeader } = await CompactJwe.decrypt({
        jwe : 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..cCbtijzQbvD0p6ED.v1uDcQ.lksRf79sT-j3cRV6kSK08Q',
        key : keyUri,
        crypto,
        keyManager
      });

      expect(plaintext).to.be.instanceOf(Uint8Array);
      expect(protectedHeader).to.deep.equal({ alg: 'dir', enc: 'A256GCM' });
    });
  });

  describe('encrypt()', () => {
    it('encrypts and returns a Compact JWE given an encryption JWK', async () => {
      const key: Jwk = {
        kty : 'oct',
        k   : 'x_6M0CwMITqmj0a-u1EggAmolpXWty6UxwlfWVtWgFs',
        alg : 'A256GCM',
        kid : '5CWawXBcFqty31Fb5vb5bABh-SbKpfFQAO596UfODRY',
      };

      const jwe = await CompactJwe.encrypt({
        plaintext       : new Uint8Array([1, 2, 3, 4]),
        protectedHeader : { alg: 'dir', enc: 'A256GCM' },
        key,
        crypto,
        keyManager
      });

      expect(jwe).to.be.a('string');
      expect(jwe.split('.')).to.have.length(5);
    });

    it('encrypts and returns a Compact JWE given an encryption Key URI', async () => {
      const testKey: Jwk = {
        kty : 'oct',
        k   : 'x_6M0CwMITqmj0a-u1EggAmolpXWty6UxwlfWVtWgFs',
        alg : 'A256GCM',
        kid : '5CWawXBcFqty31Fb5vb5bABh-SbKpfFQAO596UfODRY',
      };

      const keyUri = await keyManager.importKey({ key: testKey });

      const jwe = await CompactJwe.encrypt({
        plaintext       : new Uint8Array([1, 2, 3, 4]),
        protectedHeader : { alg: 'dir', enc: 'A256GCM' },
        key             : keyUri,
        crypto,
        keyManager
      });

      expect(jwe).to.be.a('string');
      expect(jwe.split('.')).to.have.length(5);
    });
  });
});