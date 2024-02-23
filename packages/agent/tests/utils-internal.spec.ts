import { expect } from 'chai';

import { DeterministicKeyGenerator } from '../src/utils-internal.js';
import { EdDsaAlgorithm } from '@web5/crypto';

describe('Internal Utils', () => {
  describe('DeterministicKeyGenerator', () => {
    let keyGenerator: DeterministicKeyGenerator;

    beforeEach(() => {
      keyGenerator = new DeterministicKeyGenerator();
    });

    it('returns the expected pre-defined keys', async () => {
      const ecdsa = new EdDsaAlgorithm();

      const identityPrivateKey = await ecdsa.generateKey({
        algorithm: 'Ed25519'
      });

      const signingPrivateKey = await ecdsa.generateKey({
        algorithm: 'Ed25519'
      });

      await keyGenerator.addPredefinedKeys({
        privateKeys: [ identityPrivateKey, signingPrivateKey]
      });

      const firstKeyUri = await keyGenerator.generateKey({ algorithm: 'Ed25519' });
      expect(firstKeyUri).to.include(identityPrivateKey.kid);

      const secondKeyUri = await keyGenerator.generateKey({ algorithm: 'Ed25519' });
      expect(secondKeyUri).to.include(signingPrivateKey.kid);
    });
  });
});