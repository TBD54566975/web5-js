var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { LevelStore, MemoryStore } from '@web5/common';
import { CryptoKey, EdDsaAlgorithm } from '@web5/crypto';
import { AppDataVault } from '../src/app-data-store.js';
chai.use(chaiAsPromised);
const testConfigurations = [
    {
        name: 'MemoryStore',
        dataStore: new MemoryStore()
    },
    {
        name: 'LevelStore',
        dataStore: new LevelStore()
    }
];
describe('AppDataVault', () => {
    testConfigurations.forEach((test) => {
        describe(`with ${test.name}`, () => {
            let dataVault;
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
                let keyPair;
                beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
                    // Initialize and pre-populate the app data vault with a key pair.
                    const passphrase = 'dumbbell-krakatoa-ditty';
                    keyPair = yield EdDsaAlgorithm.create().generateKey({
                        algorithm: { name: 'EdDSA', namedCurve: 'Ed25519' },
                        extractable: true,
                        keyUsages: ['sign', 'verify']
                    });
                    yield dataVault.initialize({ keyPair, passphrase });
                }));
                it('returns a private CryptoKey', () => __awaiter(void 0, void 0, void 0, function* () {
                    const privateKey = yield dataVault.getPrivateKey();
                    expect(privateKey).to.have.keys(['algorithm', 'extractable', 'type', 'usages']);
                    expect(privateKey).to.have.property('type', 'private');
                    expect(privateKey.material).to.deep.equal(keyPair.privateKey.material);
                }));
            });
            describe('getPublicKey()', () => {
                let keyPair;
                beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
                    // Initialize and pre-populate the app data vault with a key pair.
                    const passphrase = 'dumbbell-krakatoa-ditty';
                    keyPair = yield EdDsaAlgorithm.create().generateKey({
                        algorithm: { name: 'EdDSA', namedCurve: 'Ed25519' },
                        extractable: true,
                        keyUsages: ['sign', 'verify']
                    });
                    yield dataVault.initialize({ keyPair, passphrase });
                }));
                it('returns a public CryptoKey', () => __awaiter(void 0, void 0, void 0, function* () {
                    const publicKey = yield dataVault.getPublicKey();
                    expect(publicKey).to.have.keys(['algorithm', 'extractable', 'type', 'usages']);
                    expect(publicKey).to.have.property('type', 'public');
                    expect(publicKey.material).to.deep.equal(keyPair.publicKey.material);
                }));
            });
            describe('getStatus()', () => {
                it('should return initialized=false when first instantiated', () => __awaiter(void 0, void 0, void 0, function* () {
                    const vaultStatus = yield dataVault.getStatus();
                    expect(vaultStatus.initialized).to.be.false;
                    expect(vaultStatus.lastBackup).to.be.undefined;
                    expect(vaultStatus.lastRestore).to.be.undefined;
                }));
                it('should return initialized=true after initialization', () => __awaiter(void 0, void 0, void 0, function* () {
                    // Mock initialization having been completed.
                    dataStore.set('appDataStatus', { initialized: true });
                    const vaultStatus = yield dataVault.getStatus();
                    expect(vaultStatus.initialized).to.be.false;
                    expect(vaultStatus.lastBackup).to.be.undefined;
                    expect(vaultStatus.lastRestore).to.be.undefined;
                }));
            });
            describe('initialize()', () => {
                let keyPair = {
                    privateKey: new CryptoKey({ name: 'EdDSA', namedCurve: 'Ed25519' }, true, new Uint8Array(32), 'private', ['sign']),
                    publicKey: new CryptoKey({ name: 'EdDSA', namedCurve: 'Ed25519' }, true, new Uint8Array(32), 'public', ['verify'])
                };
                it('should initialize data vault when first instantiated', () => __awaiter(void 0, void 0, void 0, function* () {
                    let vaultStatus = yield dataVault.getStatus();
                    expect(vaultStatus.initialized).to.be.false;
                    const passphrase = 'dumbbell-krakatoa-ditty';
                    yield dataVault.initialize({ keyPair, passphrase });
                    vaultStatus = yield dataVault.getStatus();
                    expect(vaultStatus.initialized).to.be.true;
                }));
                it('should throw if attempted on initialized data vault', () => __awaiter(void 0, void 0, void 0, function* () {
                    const vaultStatus = yield dataVault.getStatus();
                    expect(vaultStatus.initialized).to.be.false;
                    const passphrase = 'dumbbell-krakatoa-ditty';
                    yield dataVault.initialize({ keyPair, passphrase });
                    yield expect(dataVault.initialize({ keyPair, passphrase })).to.eventually.be.rejectedWith(Error, 'vault already initialized');
                }));
            });
        });
    });
});
//# sourceMappingURL=app-data-vault.spec.js.map