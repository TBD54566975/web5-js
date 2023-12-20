import { expect } from 'chai';

import { LocalKmsCrypto } from '../../src/kms-local/api.js';

describe('LocalKmsCrypto', () => {
  let kms: LocalKmsCrypto;

  beforeEach(() => {
    kms = new LocalKmsCrypto();
  });

  describe('generateKey', () => {
    it('generates a key and returns a key URI', async () => {
      const keyUri = await kms.generateKey({ algorithm: 'ES256K' });
      expect(keyUri).to.exist;
      expect(keyUri).to.be.a.string;
      expect(keyUri.indexOf('urn:jwk:')).to.equal(0);
    });
  });

  describe('computePublicKey()', () => {
    it('should compute a public key', async () => {
      const keyUri = await kms.generateKey({ algorithm: 'ES256K' });
      const publicKey = await kms.computePublicKey({ keyUri });
      expect(publicKey).to.exist;
      console.log(publicKey);
    });
  });
});