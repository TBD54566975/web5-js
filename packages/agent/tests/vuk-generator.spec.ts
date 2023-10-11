import * as sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { sha512 } from '@noble/hashes/sha512';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';

chai.use(chaiAsPromised);

import {
  generateVaultUnlockKey,
  generateVaultUnlockKeyWithNodeCrypto,
  generateVaultUnlockKeyWithSubtleCrypto,
  dynamicImports,
} from '../src/vuk-generator.js';

const keyDerivationWorkFactor = 650_000;

describe('VUK Generator', () => {
  it('should use crypto subtle by default', async () => {
    const subtleImportKeySpy = sinon.spy(crypto.subtle, 'importKey');
    const subtleDeriveBitsSpy = sinon.spy(crypto.subtle, 'deriveBits');

    const passphrase = 'dumbbell-krakatoa-ditty';
    const salt = new Uint8Array(32);

    const vuk = await generateVaultUnlockKey({
      passphrase,
      salt,
      keyDerivationWorkFactor
    });

    expect(vuk.length).to.equal(32);

    expect(subtleImportKeySpy.called).to.be.true;
    expect(subtleDeriveBitsSpy.called).to.be.true;

    subtleImportKeySpy.restore();
    subtleDeriveBitsSpy.restore();
  });

  it('should fallback to node:crypto if subtle is not present', async () => {
    sinon.stub(crypto, 'subtle').value(null);
    const getNodeCrypto = sinon.spy(dynamicImports, 'getNodeCrypto');

    const passphrase = 'dumbbell-krakatoa-ditty';
    const salt = new Uint8Array(32);

    const vuk = await generateVaultUnlockKey({ passphrase, salt, keyDerivationWorkFactor });
    expect(vuk.length).to.equal(32);

    expect(getNodeCrypto.called).to.be.true;

    getNodeCrypto.restore();
    sinon.restore();
  });

  it('vuks are the same regardless of algorithm', async () => {
    const passphrase = 'dumbbell-krakatoa-ditty';
    const salt = new Uint8Array(32);
    const options = { passphrase, salt, keyDerivationWorkFactor: 10_000 };

    const subtleVuk = await generateVaultUnlockKeyWithNodeCrypto(options);
    const nodeCryptoVuk = await generateVaultUnlockKeyWithSubtleCrypto(options);
    expect(subtleVuk).to.deep.equal(nodeCryptoVuk);

    // asserts that the previously used noble algo matches too
    const nobleVuk = await pbkdf2Async(
      sha512,
      passphrase,
      salt,
      {
        c     : options.keyDerivationWorkFactor,
        dkLen : 32
      }
    );

    expect(nobleVuk).to.deep.equal(subtleVuk);
  });
});