import type { Web5Crypto } from '@web5/crypto';

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { LevelStore, MemoryStore } from '@web5/common';
import { CryptoKey, EdDsaAlgorithm } from '@web5/crypto';

import { AppDataVault } from '../src/app-data-store.js';

chai.use(chaiAsPromised);

const testConfigurations = [
  {
    name      : 'MemoryStore',
    dataStore : new MemoryStore()
  },
  {
    name      : 'LevelStore',
    dataStore : new LevelStore()
  }
];

describe('AppDataVault', () => {
  testConfigurations.forEach((test) => {
    describe(`with ${test.name}`, () => {

      let dataVault: AppDataVault;
      let dataStore = test.dataStore;

      before(() => {
        dataVault = new AppDataVault({ store: dataStore, keyDerivationWorkFactor: 1 });
      });

      beforeEach(() => {
        dataStore.clear();
      });

      afterEach(() => {
        dataStore.clear();
      });

      after(() => {
        dataStore.close();
      });

      describe('getPrivateKey()', () => {
        let keyPair: Web5Crypto.CryptoKeyPair;

        beforeEach(async () => {
          // Initialize and pre-populate the app data vault with a key pair.
          const passphrase = 'dumbbell-krakatoa-ditty';
          keyPair = await EdDsaAlgorithm.create().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });
          await dataVault.initialize({ keyPair, passphrase });
        });

        it('returns a private CryptoKey', async () => {
          const privateKey = await dataVault.getPrivateKey();
          expect(privateKey).to.have.keys(['algorithm', 'extractable', 'type', 'usages']);
          expect(privateKey).to.have.property('type', 'private');
          expect(privateKey.material).to.deep.equal(keyPair.privateKey.material);
        });
      });

      describe('getPublicKey()', () => {
        let keyPair: Web5Crypto.CryptoKeyPair;

        beforeEach(async () => {
          // Initialize and pre-populate the app data vault with a key pair.
          const passphrase = 'dumbbell-krakatoa-ditty';
          keyPair = await EdDsaAlgorithm.create().generateKey({
            algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
            extractable : true,
            keyUsages   : ['sign', 'verify']
          });
          await dataVault.initialize({ keyPair, passphrase });
        });

        it('returns a public CryptoKey', async () => {
          const publicKey = await dataVault.getPublicKey();
          expect(publicKey).to.have.keys(['algorithm', 'extractable', 'type', 'usages']);
          expect(publicKey).to.have.property('type', 'public');
          expect(publicKey.material).to.deep.equal(keyPair.publicKey.material);
        });
      });

      describe('getStatus()', () => {
        it('should return initialized=false when first instantiated', async () => {
          const vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
          expect(vaultStatus.lastBackup).to.be.undefined;
          expect(vaultStatus.lastRestore).to.be.undefined;
        });

        it('should return initialized=true after initialization', async () => {
          // Mock initialization having been completed.
          dataStore.set('appDataStatus', { initialized: true });

          const vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;
          expect(vaultStatus.lastBackup).to.be.undefined;
          expect(vaultStatus.lastRestore).to.be.undefined;
        });
      });

      describe('initialize()', () => {
        let keyPair = {
          privateKey : new CryptoKey({ name: 'EdDSA', namedCurve: 'Ed25519' }, true, new Uint8Array(32), 'private', ['sign']),
          publicKey  : new CryptoKey({ name: 'EdDSA', namedCurve: 'Ed25519' }, true, new Uint8Array(32), 'public', ['verify'])
        };

        it('should initialize data vault when first instantiated', async () => {
          let vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;

          const passphrase = 'dumbbell-krakatoa-ditty';
          await dataVault.initialize({ keyPair, passphrase });
          vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.true;
        });

        it('should throw if attempted on initialized data vault', async () => {
          const vaultStatus = await dataVault.getStatus();
          expect(vaultStatus.initialized).to.be.false;

          const passphrase = 'dumbbell-krakatoa-ditty';
          await dataVault.initialize({ keyPair, passphrase });

          await expect(
            dataVault.initialize({ keyPair, passphrase })
          ).to.eventually.be.rejectedWith(Error, 'vault already initialized');
        });
      });
    });
  });
});