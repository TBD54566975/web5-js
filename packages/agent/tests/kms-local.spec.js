var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { LocalKms } from '../src/kms-local.js';
import { TestAgent } from './utils/test-agent.js';
import { KeyStoreMemory, PrivateKeyStoreMemory } from '../src/store-managed-key.js';
chai.use(chaiAsPromised);
describe('LocalKms', () => {
    let kms;
    let kmsKeyStore;
    let testAgent;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        testAgent = yield TestAgent.create();
    }));
    beforeEach(() => {
        kmsKeyStore = new KeyStoreMemory();
        kms = new LocalKms({ kmsName: 'memory', keyStore: kmsKeyStore, agent: testAgent });
    });
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield testAgent.clearStorage();
    }));
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        yield testAgent.closeStorage();
    }));
    describe('constructor', () => {
        it('uses in-memory stores by default if not specified', () => {
            expect(new LocalKms({ kmsName: 'test' })).to.not.throw;
        });
        it('uses keyStore instance, if given', () => {
            const keyStore = new KeyStoreMemory();
            expect(new LocalKms({ kmsName: 'test', keyStore })).to.not.throw;
        });
        it('uses privateKeyStore instance, if given', () => {
            const privateKeyStore = new PrivateKeyStoreMemory();
            expect(new LocalKms({ kmsName: 'test', privateKeyStore })).to.not.throw;
        });
    });
    describe('decrypt()', () => {
        let key;
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            key = yield kms.generateKey({
                algorithm: { name: 'AES-CTR', length: 128 },
                extractable: false,
                keyUsages: ['encrypt', 'decrypt']
            });
        }));
        it('decrypts data', () => __awaiter(void 0, void 0, void 0, function* () {
            const plaintext = yield kms.decrypt({
                algorithm: {
                    name: 'AES-CTR',
                    counter: new Uint8Array(16),
                    length: 128
                },
                keyRef: key.id,
                data: new Uint8Array([1, 2, 3, 4])
            });
            expect(plaintext).to.be.instanceOf(Uint8Array);
            expect(plaintext.byteLength).to.equal(4);
        }));
        it('accepts input data as Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            const algorithm = { name: 'AES-CTR', counter: new Uint8Array(16), length: 128 };
            const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
            let plaintext;
            // TypedArray - Uint8Array
            plaintext = yield kms.decrypt({ algorithm, keyRef: key.id, data: dataU8A });
            expect(plaintext).to.be.instanceOf(Uint8Array);
        }));
        it('decrypts data with AES-CTR', () => __awaiter(void 0, void 0, void 0, function* () {
            const plaintext = yield kms.decrypt({
                algorithm: {
                    name: 'AES-CTR',
                    counter: new Uint8Array(16),
                    length: 128
                },
                keyRef: key.id,
                data: new Uint8Array([1, 2, 3, 4])
            });
            expect(plaintext).to.be.instanceOf(Uint8Array);
            expect(plaintext.byteLength).to.equal(4);
        }));
        it('throws an error when key reference is not found', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(kms.decrypt({
                algorithm: {
                    name: 'AES-CTR',
                    counter: new Uint8Array(16),
                    length: 128
                },
                keyRef: 'non-existent-key',
                data: new Uint8Array([1, 2, 3, 4])
            })).to.eventually.be.rejectedWith(Error, 'Key not found');
        }));
    });
    describe('deriveBites()', () => {
        let otherPartyPublicKey;
        let otherPartyPublicCryptoKey;
        let ownPrivateKey;
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            const otherPartyKeyPair = yield kms.generateKey({
                algorithm: { name: 'ECDH', namedCurve: 'secp256k1' },
                extractable: false,
                keyUsages: ['deriveBits']
            });
            otherPartyPublicKey = otherPartyKeyPair.publicKey;
            otherPartyPublicCryptoKey = {
                algorithm: otherPartyPublicKey.algorithm,
                extractable: otherPartyPublicKey.extractable,
                material: otherPartyPublicKey.material,
                type: otherPartyPublicKey.type,
                usages: otherPartyPublicKey.usages
            };
            const ownKeyPair = yield kms.generateKey({
                algorithm: { name: 'ECDH', namedCurve: 'secp256k1' },
                extractable: false,
                keyUsages: ['deriveBits']
            });
            ownPrivateKey = ownKeyPair.privateKey;
        }));
        it('generates shared secrets', () => __awaiter(void 0, void 0, void 0, function* () {
            const sharedSecret = yield kms.deriveBits({
                algorithm: { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
                baseKeyRef: ownPrivateKey.id
            });
            expect(sharedSecret).to.be.an('Uint8Array');
            expect(sharedSecret.byteLength).to.equal(32);
        }));
        it('returns shared secrets with maximum bit length when length is null', () => __awaiter(void 0, void 0, void 0, function* () {
            const sharedSecret = yield kms.deriveBits({
                algorithm: { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
                baseKeyRef: ownPrivateKey.id
            });
            expect(sharedSecret).to.be.an('Uint8Array');
            expect(sharedSecret.byteLength).to.equal(32);
        }));
        it('returns shared secrets with specified length, if possible', () => __awaiter(void 0, void 0, void 0, function* () {
            const sharedSecret = yield kms.deriveBits({
                algorithm: { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
                baseKeyRef: ownPrivateKey.id,
                length: 64
            });
            expect(sharedSecret).to.be.an('Uint8Array');
            expect(sharedSecret.byteLength).to.equal(64 / 8);
        }));
        it(`accepts 'id' as a baseKey reference`, () => __awaiter(void 0, void 0, void 0, function* () {
            const sharedSecret = yield kms.deriveBits({
                algorithm: { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
                baseKeyRef: ownPrivateKey.id
            });
            expect(sharedSecret).to.be.an('Uint8Array');
            expect(sharedSecret.byteLength).to.equal(32);
        }));
        it('generates ECDH secp256k1 shared secrets', () => __awaiter(void 0, void 0, void 0, function* () {
            const sharedSecret = yield kms.deriveBits({
                algorithm: { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
                baseKeyRef: ownPrivateKey.id
            });
            expect(sharedSecret).to.be.an('Uint8Array');
            expect(sharedSecret.byteLength).to.equal(32);
        }));
        it('generates ECDH X25519 shared secrets', () => __awaiter(void 0, void 0, void 0, function* () {
            const otherPartyKeyPair = yield kms.generateKey({
                algorithm: { name: 'ECDH', namedCurve: 'X25519' },
                extractable: false,
                keyUsages: ['deriveBits']
            });
            otherPartyPublicKey = otherPartyKeyPair.publicKey;
            otherPartyPublicCryptoKey = {
                algorithm: otherPartyPublicKey.algorithm,
                extractable: otherPartyPublicKey.extractable,
                material: otherPartyPublicKey.material,
                type: otherPartyPublicKey.type,
                usages: otherPartyPublicKey.usages
            };
            const ownKeyPair = yield kms.generateKey({
                algorithm: { name: 'ECDH', namedCurve: 'X25519' },
                extractable: false,
                keyUsages: ['deriveBits']
            });
            ownPrivateKey = ownKeyPair.privateKey;
            const sharedSecret = yield kms.deriveBits({
                algorithm: { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
                baseKeyRef: ownPrivateKey.id
            });
            expect(sharedSecret.byteLength).to.equal(32);
        }));
        it('throws an error when baseKey reference is not found', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(kms.deriveBits({
                algorithm: { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
                baseKeyRef: 'non-existent-id'
            })).to.eventually.be.rejectedWith(Error, 'Key not found');
        }));
    });
    describe('encrypt()', () => {
        let key;
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            key = yield kms.generateKey({
                algorithm: { name: 'AES-CTR', length: 128 },
                extractable: false,
                keyUsages: ['encrypt', 'decrypt']
            });
        }));
        it('encrypts data', () => __awaiter(void 0, void 0, void 0, function* () {
            const ciphertext = yield kms.encrypt({
                algorithm: {
                    name: 'AES-CTR',
                    counter: new Uint8Array(16),
                    length: 128
                },
                keyRef: key.id,
                data: new Uint8Array([1, 2, 3, 4])
            });
            expect(ciphertext).to.be.instanceOf(Uint8Array);
            expect(ciphertext.byteLength).to.equal(4);
        }));
        it('accepts input data as Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            const algorithm = { name: 'AES-CTR', counter: new Uint8Array(16), length: 128 };
            const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
            let ciphertext;
            // TypedArray - Uint8Array
            ciphertext = yield kms.encrypt({ algorithm, keyRef: key.id, data: dataU8A });
            expect(ciphertext).to.be.instanceOf(Uint8Array);
        }));
        it('encrypts data with AES-CTR', () => __awaiter(void 0, void 0, void 0, function* () {
            const ciphertext = yield kms.encrypt({
                algorithm: {
                    name: 'AES-CTR',
                    counter: new Uint8Array(16),
                    length: 128
                },
                keyRef: key.id,
                data: new Uint8Array([1, 2, 3, 4])
            });
            expect(ciphertext).to.be.instanceOf(Uint8Array);
            expect(ciphertext.byteLength).to.equal(4);
        }));
        it('throws an error when key reference is not found', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(kms.encrypt({
                algorithm: {
                    name: 'AES-CTR',
                    counter: new Uint8Array(16),
                    length: 128
                },
                keyRef: 'non-existent-key',
                data: new Uint8Array([1, 2, 3, 4])
            })).to.eventually.be.rejectedWith(Error, 'Key not found');
        }));
    });
    describe('generateKey()', () => {
        it('creates valid key pairs', () => __awaiter(void 0, void 0, void 0, function* () {
            const keys = yield kms.generateKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                keyUsages: ['sign', 'verify']
            });
            expect(keys).to.have.property('privateKey');
            expect(keys).to.have.property('publicKey');
            expect(keys.privateKey.id).to.equal(keys.publicKey.id);
            // Check values that are identical for both keys in the pair.
            expect(keys.privateKey.algorithm.name).to.equal('ECDSA');
            expect(keys.publicKey.algorithm.name).to.equal('ECDSA');
            expect(keys.privateKey.kms).to.equal('memory');
            expect(keys.publicKey.kms).to.equal('memory');
            expect(keys.privateKey.spec).to.be.undefined;
            expect(keys.publicKey.spec).to.be.undefined;
            expect(keys.privateKey.state).to.equal('Enabled');
            expect(keys.publicKey.state).to.equal('Enabled');
            // Check values unique to the private key.
            expect(keys.privateKey.material).to.be.undefined;
            expect(keys.privateKey.type).to.equal('private');
            expect(keys.privateKey.usages).to.deep.equal(['sign']);
            // Check values unique to the public key.
            expect(keys.publicKey.material).to.be.an.instanceOf(Uint8Array);
            expect(keys.publicKey.type).to.equal('public');
            expect(keys.publicKey.usages).to.deep.equal(['verify']);
        }));
        it('creates ECDH secp256k1 key pairs with compressed public keys, by default', () => __awaiter(void 0, void 0, void 0, function* () {
            const keys = yield kms.generateKey({
                algorithm: { name: 'ECDH', namedCurve: 'secp256k1' },
                keyUsages: ['deriveBits', 'deriveKey']
            });
            // Check values that are identical for both keys in the pair.
            expect(keys.privateKey.algorithm.name).to.equal('ECDH');
            expect(keys.publicKey.algorithm.name).to.equal('ECDH');
            if (!('namedCurve' in keys.privateKey.algorithm))
                throw new Error; // type guard
            if (!('namedCurve' in keys.publicKey.algorithm))
                throw new Error; // type guard
            expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
            expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
            // Check values unique to the public key.
            if (!keys.publicKey.material)
                throw new Error; // type guard
            expect(keys.publicKey.material.byteLength).to.equal(33);
        }));
        it('creates ECDH secp256k1 key pairs with uncompressed public keys, if specified', () => __awaiter(void 0, void 0, void 0, function* () {
            const keys = yield kms.generateKey({
                algorithm: { name: 'ECDH', namedCurve: 'secp256k1', compressedPublicKey: false },
                keyUsages: ['deriveBits', 'deriveKey']
            });
            // Check values unique to the public key.
            if (!keys.publicKey.material)
                throw new Error; // type guard
            expect(keys.publicKey.material.byteLength).to.equal(65);
        }));
        it('creates ECDSA secp256k1 key pairs with compressed public keys, by default', () => __awaiter(void 0, void 0, void 0, function* () {
            const keys = yield kms.generateKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                keyUsages: ['sign', 'verify']
            });
            // Check values that are identical for both keys in the pair.
            expect(keys.privateKey.algorithm.name).to.equal('ECDSA');
            expect(keys.publicKey.algorithm.name).to.equal('ECDSA');
            if (!('namedCurve' in keys.privateKey.algorithm))
                throw new Error; // type guard
            if (!('namedCurve' in keys.publicKey.algorithm))
                throw new Error; // type guard
            expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
            expect(keys.publicKey.algorithm.namedCurve).to.equal('secp256k1');
            if (!('compressedPublicKey' in keys.privateKey.algorithm))
                throw new Error; // type guard
            if (!('compressedPublicKey' in keys.publicKey.algorithm))
                throw new Error; // type guard
            expect(keys.privateKey.algorithm.compressedPublicKey).to.be.true;
            expect(keys.publicKey.algorithm.compressedPublicKey).to.be.true;
            // Check values unique to the public key.
            if (!keys.publicKey.material)
                throw new Error; // type guard
            expect(keys.publicKey.material.byteLength).to.equal(33);
        }));
        it('creates ECDSA secp256k1 key pairs with uncompressed public keys, if specified', () => __awaiter(void 0, void 0, void 0, function* () {
            const keys = yield kms.generateKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1', compressedPublicKey: false },
                keyUsages: ['sign', 'verify']
            });
            // Check values unique to the public key.
            if (!keys.publicKey.material)
                throw new Error; // type guard
            expect(keys.publicKey.material.byteLength).to.equal(65);
        }));
        it('creates EdDSA Ed25519 key pairs', () => __awaiter(void 0, void 0, void 0, function* () {
            const keys = yield kms.generateKey({
                algorithm: { name: 'EdDSA', namedCurve: 'Ed25519' },
                keyUsages: ['sign', 'verify']
            });
            // Check values that are identical for both keys in the pair.
            expect(keys.privateKey.algorithm.name).to.equal('EdDSA');
            expect(keys.publicKey.algorithm.name).to.equal('EdDSA');
            if (!('namedCurve' in keys.privateKey.algorithm))
                throw new Error; // type guard
            if (!('namedCurve' in keys.publicKey.algorithm))
                throw new Error; // type guard
            expect(keys.privateKey.algorithm.namedCurve).to.equal('Ed25519');
            expect(keys.publicKey.algorithm.namedCurve).to.equal('Ed25519');
            // Check values unique to the public key.
            if (!keys.publicKey.material)
                throw new Error; // type guard
            expect(keys.publicKey.material.byteLength).to.equal(32);
        }));
        it('ignores case of algorithm name', () => {
            let keys;
            ['eCdSa', 'ecdsa'].forEach((algorithmName) => __awaiter(void 0, void 0, void 0, function* () {
                keys = (yield kms.generateKey({
                    algorithm: { name: algorithmName, namedCurve: 'secp256k1' },
                    keyUsages: ['sign', 'verify'],
                    extractable: true,
                }));
                expect(keys.privateKey.algorithm.name).to.equal('ECDSA');
                expect(keys.publicKey.algorithm.name).to.equal('ECDSA');
                if (!('namedCurve' in keys.privateKey.algorithm))
                    throw new Error; // type guard
                expect(keys.privateKey.algorithm.namedCurve).to.equal('secp256k1');
            }));
        });
    });
    describe('importKey()', () => {
        it('imports asymmetric key pairs', () => __awaiter(void 0, void 0, void 0, function* () {
            const testKeyBase = {
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: true,
                kms: 'testKms',
            };
            // Test importing the key and validate the result.
            const importedKeyPair = yield kms.importKey({
                privateKey: Object.assign(Object.assign({}, testKeyBase), { material: new Uint8Array([1, 2, 3, 4]), type: 'private', usages: ['sign'] }),
                publicKey: Object.assign(Object.assign({}, testKeyBase), { material: new Uint8Array([1, 2, 3, 4]), type: 'public', usages: ['verify'] })
            });
            expect(importedKeyPair).to.exist;
            // Verify the key is present in the key store.
            const storedKeyPair = yield kms.getKey({ keyRef: importedKeyPair.privateKey.id });
            expect(storedKeyPair).to.deep.equal(importedKeyPair);
            expect(storedKeyPair).to.have.property('privateKey');
            expect(storedKeyPair).to.have.property('publicKey');
            expect(storedKeyPair.privateKey.id).to.equal(storedKeyPair.publicKey.id);
            // Check values that are identical for both storedKeyPair in the pair.
            expect(storedKeyPair.privateKey.algorithm.name).to.equal('ECDSA');
            expect(storedKeyPair.publicKey.algorithm.name).to.equal('ECDSA');
            expect(storedKeyPair.privateKey.id).to.not.equal('');
            expect(storedKeyPair.publicKey.id).to.not.equal('');
            expect(storedKeyPair.privateKey.kms).to.equal('memory');
            expect(storedKeyPair.publicKey.kms).to.equal('memory');
            expect(storedKeyPair.privateKey.spec).to.be.undefined;
            expect(storedKeyPair.publicKey.spec).to.be.undefined;
            expect(storedKeyPair.privateKey.state).to.equal('Enabled');
            expect(storedKeyPair.publicKey.state).to.equal('Enabled');
            // Check values unique to the private key.
            expect(storedKeyPair.privateKey.material).to.be.undefined;
            expect(storedKeyPair.privateKey.type).to.equal('private');
            expect(storedKeyPair.privateKey.usages).to.deep.equal(['sign']);
            // Check values unique to the public key.
            expect(storedKeyPair.publicKey.material).to.be.an.instanceOf(Uint8Array);
            expect(storedKeyPair.publicKey.type).to.equal('public');
            expect(storedKeyPair.publicKey.usages).to.deep.equal(['verify']);
        }));
        it('imports asymmetric private keys', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test importing the key and validate the result.
            const importedPrivateKey = yield kms.importKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: true,
                kms: 'testKms',
                material: new Uint8Array([1, 2, 3, 4]),
                type: 'private',
                usages: ['sign'],
            });
            expect(importedPrivateKey.kms).to.equal('memory');
            expect(importedPrivateKey).to.exist;
            // Verify the key is present in the key store.
            const storedPrivateKey = yield kms.getKey({ keyRef: importedPrivateKey.id });
            expect(storedPrivateKey).to.deep.equal(importedPrivateKey);
            // Validate the expected values.
            expect(storedPrivateKey.algorithm.name).to.equal('ECDSA');
            expect(storedPrivateKey.id).to.not.equal('');
            expect(storedPrivateKey.kms).to.equal('memory');
            expect(storedPrivateKey.spec).to.be.undefined;
            expect(storedPrivateKey.state).to.equal('Enabled');
            expect(storedPrivateKey.material).to.be.undefined;
            expect(storedPrivateKey.type).to.equal('private');
            expect(storedPrivateKey.usages).to.deep.equal(['sign']);
        }));
        it('imports asymmetric public keys', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test importing the key and validate the result.
            const importedPublicKey = yield kms.importKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: true,
                kms: 'testKms',
                material: new Uint8Array([1, 2, 3, 4]),
                type: 'public',
                usages: ['verify'],
            });
            expect(importedPublicKey.kms).to.equal('memory');
            expect(importedPublicKey).to.exist;
            // Verify the key is present in the key store.
            const storedPublicKey = yield kms.getKey({ keyRef: importedPublicKey.id });
            expect(storedPublicKey).to.deep.equal(importedPublicKey);
            // Validate the expected values.
            expect(storedPublicKey.algorithm.name).to.equal('ECDSA');
            expect(storedPublicKey.id).to.not.equal('');
            expect(storedPublicKey.kms).to.equal('memory');
            expect(storedPublicKey.spec).to.be.undefined;
            expect(storedPublicKey.state).to.equal('Enabled');
            expect(storedPublicKey.material).to.be.an.instanceOf(Uint8Array);
            expect(storedPublicKey.type).to.equal('public');
            expect(storedPublicKey.usages).to.deep.equal(['verify']);
        }));
        it('imports symmetric keys', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test importing the key and validate the result.
            const importedSecretKey = yield kms.importKey({
                algorithm: { name: 'AES-CTR', length: 128 },
                extractable: true,
                kms: 'memory',
                material: new Uint8Array([1, 2, 3, 4]),
                type: 'secret',
                usages: ['encrypt', 'decrypt'],
            });
            expect(importedSecretKey.kms).to.equal('memory');
            expect(importedSecretKey).to.exist;
            // Verify the key is present in the key store.
            const storedSecretKey = yield kms.getKey({ keyRef: importedSecretKey.id });
            expect(storedSecretKey).to.deep.equal(importedSecretKey);
            // Validate the expected values.
            expect(storedSecretKey.algorithm.name).to.equal('AES-CTR');
            expect(storedSecretKey.kms).to.equal('memory');
            expect(storedSecretKey.spec).to.be.undefined;
            expect(storedSecretKey.state).to.equal('Enabled');
            expect(storedSecretKey.material).to.be.undefined;
            expect(storedSecretKey.type).to.equal('secret');
            expect(storedSecretKey.usages).to.deep.equal(['encrypt', 'decrypt']);
        }));
        xit('imports HMAC keys');
        it(`ignores the 'kms' property and overwrites with configured value`, () => __awaiter(void 0, void 0, void 0, function* () {
            // Test importing the key and validate the result.
            const importedPrivateKey = yield kms.importKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: true,
                kms: 'incorrect-kms-name',
                material: new Uint8Array([1, 2, 3, 4]),
                type: 'private',
                usages: ['sign'],
            });
            expect(importedPrivateKey.kms).to.equal('memory');
        }));
        it(`ignores the 'id' property and overwrites with internally generated unique identifier`, () => __awaiter(void 0, void 0, void 0, function* () {
            // Test importing a private key and validate the result.
            // @ts-expect-error because an 'id' property is being specified even though it should not be.
            const importedPrivateKey = yield kms.importKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: true,
                id: '1234',
                kms: 'testKms',
                material: new Uint8Array([1, 2, 3, 4]),
                type: 'private',
                usages: ['sign'],
            });
            expect(importedPrivateKey.id).to.be.a.string;
            expect(importedPrivateKey.id).to.not.equal('1234');
            // Test importing a public key and validate the result.
            // @ts-expect-error because an 'id' property is being specified even though it should not be.
            const importedPublicKey = yield kms.importKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: true,
                id: '1234',
                kms: 'testKms',
                material: new Uint8Array([1, 2, 3, 4]),
                type: 'public',
                usages: ['sign'],
            });
            expect(importedPublicKey.id).to.be.a.string;
            expect(importedPublicKey.id).to.not.equal('1234');
            // Test importing the asymmetric key pair and validate the result.
            const importedKeyPair = yield kms.importKey({
                // @ts-expect-error because an 'id' property is being specified even though it should not be.
                privateKey: {
                    algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                    extractable: true,
                    id: '1234',
                    kms: 'testKms',
                    material: new Uint8Array([1, 2, 3, 4]),
                    type: 'private',
                    usages: ['sign'],
                },
                publicKey: {
                    algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                    extractable: true,
                    id: '1234',
                    kms: 'testKms',
                    material: new Uint8Array([1, 2, 3, 4]),
                    type: 'public',
                    usages: ['verify'],
                }
            });
            expect(importedKeyPair.privateKey.id).to.be.a.string;
            expect(importedKeyPair.privateKey.id).to.not.equal('1234');
            expect(importedKeyPair.publicKey.id).to.be.a.string;
            expect(importedKeyPair.publicKey.id).to.not.equal('1234');
        }));
        it('never returns key material for private keys', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test importing the key and validate the result.
            const importedPrivateKey = yield kms.importKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: true,
                kms: 'testKms',
                material: new Uint8Array([1, 2, 3, 4]),
                type: 'private',
                usages: ['sign'],
            });
            expect(importedPrivateKey.material).to.not.exist;
        }));
        it('returns key material for public keys', () => __awaiter(void 0, void 0, void 0, function* () {
            // Test importing the key and validate the result.
            const importedPrivateKey = yield kms.importKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: true,
                kms: 'testKms',
                material: new Uint8Array([1, 2, 3, 4]),
                type: 'public',
                usages: ['verify'],
            });
            expect(importedPrivateKey.material).to.exist;
            expect(importedPrivateKey.material).to.be.an.instanceOf(Uint8Array);
        }));
        it('throws an error if public and private keys are swapped', () => __awaiter(void 0, void 0, void 0, function* () {
            const testKeyBase = {
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: true,
                kms: 'testKms',
            };
            // Test importing the key and validate the result.
            yield expect(kms.importKey({
                privateKey: Object.assign(Object.assign({}, testKeyBase), { material: new Uint8Array([1, 2, 3, 4]), type: 'public', usages: ['verify'] }),
                publicKey: Object.assign(Object.assign({}, testKeyBase), { material: new Uint8Array([1, 2, 3, 4]), type: 'private', usages: ['sign'] })
            })).to.eventually.be.rejectedWith(Error, 'failed due to private and public key mismatch');
        }));
        it(`throws an error if key pair types are not 'private, public'`, () => __awaiter(void 0, void 0, void 0, function* () {
            const testKeyBase = {
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: true,
                kms: 'testKms',
            };
            // Test importing the key and validate the result.
            yield expect(kms.importKey({
                privateKey: Object.assign(Object.assign({}, testKeyBase), { material: new Uint8Array([1, 2, 3, 4]), type: 'secret', usages: ['verify'] }),
                publicKey: Object.assign(Object.assign({}, testKeyBase), { material: new Uint8Array([1, 2, 3, 4]), type: 'public', usages: ['sign'] })
            })).to.eventually.be.rejectedWith(Error, `Must be 'private, public'`);
        }));
        it(`throws an error if key type is not 'public', 'private', or 'secret'`, () => __awaiter(void 0, void 0, void 0, function* () {
            // Test importing the key and validate the result.
            // @ts-expect-error because `type` is being intentionally set to an invalid value to trigger an error.
            yield expect(kms.importKey({
                algorithm: { name: 'AES-CTR', length: 128 },
                extractable: true,
                kms: 'memory',
                material: new Uint8Array([1, 2, 3, 4]),
                type: 'invalid',
                usages: ['encrypt', 'decrypt'],
            })).to.eventually.be.rejectedWith(Error, `Must be one of 'private, public, secret'`);
        }));
    });
    describe('sign()', () => {
        it('generates signatures', () => __awaiter(void 0, void 0, void 0, function* () {
            const keyPair = yield kms.generateKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: false,
                keyUsages: ['sign', 'verify']
            });
            const signature = yield kms.sign({
                algorithm: { name: 'ECDSA', hash: 'SHA-256' },
                keyRef: keyPair.privateKey.id,
                data: new Uint8Array([51, 52, 53]),
            });
            expect(signature).to.be.instanceOf(Uint8Array);
            expect(signature.byteLength).to.equal(64);
        }));
        it('accepts input data as Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            const algorithm = { name: 'ECDSA', hash: 'SHA-256' };
            const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
            const keyPair = yield kms.generateKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: false,
                keyUsages: ['sign', 'verify']
            });
            const key = keyPair.privateKey;
            let signature;
            // TypedArray - Uint8Array
            signature = yield kms.sign({ algorithm, keyRef: key.id, data: dataU8A });
            expect(signature).to.be.instanceOf(Uint8Array);
        }));
        it('generates ECDSA secp256k1 signatures', () => __awaiter(void 0, void 0, void 0, function* () {
            const keyPair = yield kms.generateKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: false,
                keyUsages: ['sign', 'verify']
            });
            const signature = yield kms.sign({
                algorithm: { name: 'ECDSA', hash: 'SHA-256' },
                keyRef: keyPair.privateKey.id,
                data: new Uint8Array([51, 52, 53]),
            });
            expect(signature).to.be.instanceOf(Uint8Array);
            expect(signature.byteLength).to.equal(64);
        }));
        it('generates EdDSA Ed25519 signatures', () => __awaiter(void 0, void 0, void 0, function* () {
            const keyPair = yield kms.generateKey({
                algorithm: { name: 'EdDSA', namedCurve: 'Ed25519' },
                extractable: false,
                keyUsages: ['sign', 'verify']
            });
            const signature = yield kms.sign({
                algorithm: { name: 'EdDSA' },
                keyRef: keyPair.privateKey.id,
                data: new Uint8Array([51, 52, 53]),
            });
            expect(signature).to.be.instanceOf(Uint8Array);
            expect(signature.byteLength).to.equal(64);
        }));
        it('throws an error when key reference is not found', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(kms.sign({
                algorithm: { name: 'ECDSA', hash: 'SHA-256' },
                keyRef: 'non-existent-key',
                data: new Uint8Array([51, 52, 53])
            })).to.eventually.be.rejectedWith(Error, 'Key not found');
        }));
    });
    describe('updateKey()', () => {
        let testKey;
        let testKeyPair;
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            testKey = yield kms.generateKey({
                algorithm: { name: 'AES-CTR', length: 128 },
                alias: 'test-key',
                extractable: false,
                keyUsages: ['encrypt', 'decrypt'],
                metadata: { foo: 'bar' }
            });
            testKeyPair = yield kms.generateKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                alias: 'test-key-pair',
                extractable: false,
                keyUsages: ['sign', 'verify'],
                metadata: { foo: 'bar' }
            });
        }));
        it('should update a key by ID', () => __awaiter(void 0, void 0, void 0, function* () {
            // Attempt to update the key's alias.
            const newAlias = 'did:method:new';
            const updateResult = yield kms.updateKey({ keyRef: testKey.id, alias: newAlias });
            // Verify that the alias property was updated.
            expect(updateResult).to.be.true;
            const storedKey = yield kms.getKey({ keyRef: testKey.id });
            expect(storedKey).to.have.property('alias', newAlias);
        }));
        it('should update a key pair by ID', () => __awaiter(void 0, void 0, void 0, function* () {
            // Attempt to update the key's alias.
            const newAlias = 'did:method:new';
            const updateResult = yield kms.updateKey({ keyRef: testKeyPair.publicKey.id, alias: newAlias });
            // Verify that the alias property was updated.
            expect(updateResult).to.be.true;
            const storedKey = yield kms.getKey({ keyRef: testKeyPair.publicKey.id });
            if (!('privateKey' in storedKey))
                throw new Error('Expected ManagedKeyPair and not ManagedKey');
            expect(storedKey.publicKey).to.have.property('alias', newAlias);
        }));
        it('throws an error when key reference is not found', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(kms.updateKey({ keyRef: 'non-existent', alias: 'new-alias' })).to.eventually.be.rejectedWith(Error, 'Key not found');
        }));
        it('returns false if the update operation failed', () => __awaiter(void 0, void 0, void 0, function* () {
            /** Stub the `updateKey()` method of the kmsKeyStore instance of
             * KeyStoreMemory to simulate a failed update. */
            sinon.stub(kmsKeyStore, 'updateKey').returns(Promise.resolve(false));
            // Attempt to update the key's alias.
            const updateResult = yield kms.updateKey({ keyRef: testKey.id, alias: '' });
            // Remove the instance method stub.
            sinon.restore();
            // Verify that the update failed.
            expect(updateResult).to.be.false;
            const storedKey = yield kms.getKey({ keyRef: testKey.id });
            expect(storedKey).to.deep.equal(testKey);
        }));
    });
    describe('verify()', () => {
        it('returns a boolean result', () => __awaiter(void 0, void 0, void 0, function* () {
            const dataU8A = new Uint8Array([51, 52, 53]);
            const keyPair = yield kms.generateKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: false,
                keyUsages: ['sign', 'verify']
            });
            const signature = yield kms.sign({
                algorithm: { name: 'ECDSA', hash: 'SHA-256' },
                keyRef: keyPair.privateKey.id,
                data: dataU8A,
            });
            const isValid = yield kms.verify({
                algorithm: { name: 'ECDSA', hash: 'SHA-256' },
                keyRef: keyPair.publicKey.id,
                signature: signature,
                data: dataU8A
            });
            expect(isValid).to.exist;
            expect(isValid).to.be.true;
        }));
        it('accepts input data as Uint8Array', () => __awaiter(void 0, void 0, void 0, function* () {
            const algorithm = { name: 'ECDSA', hash: 'SHA-256' };
            const dataU8A = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
            const keyPair = yield kms.generateKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: false,
                keyUsages: ['sign', 'verify']
            });
            let signature;
            let isValid;
            // TypedArray - Uint8Array
            signature = yield kms.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU8A });
            isValid = yield kms.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU8A });
            expect(isValid).to.be.true;
        }));
        it('verifies ECDSA secp256k1 signatures', () => __awaiter(void 0, void 0, void 0, function* () {
            const keyPair = yield kms.generateKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: false,
                keyUsages: ['sign', 'verify']
            });
            const algorithm = { name: 'ECDSA', hash: 'SHA-256' };
            const dataU8A = new Uint8Array([51, 52, 53]);
            const signature = yield kms.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU8A });
            const isValid = yield kms.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU8A });
            expect(isValid).to.be.true;
        }));
        it('verifies EdDSA Ed25519 signatures', () => __awaiter(void 0, void 0, void 0, function* () {
            const keyPair = yield kms.generateKey({
                algorithm: { name: 'EdDSA', namedCurve: 'Ed25519' },
                extractable: false,
                keyUsages: ['sign', 'verify']
            });
            const algorithm = { name: 'EdDSA' };
            const dataU8A = new Uint8Array([51, 52, 53]);
            const signature = yield kms.sign({ algorithm, keyRef: keyPair.privateKey.id, data: dataU8A });
            const isValid = yield kms.verify({ algorithm, keyRef: keyPair.publicKey.id, signature, data: dataU8A });
            expect(isValid).to.be.true;
        }));
        it('throws an error when key reference is not found', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(kms.verify({
                algorithm: { name: 'ECDSA', hash: 'SHA-256' },
                keyRef: 'non-existent-key',
                signature: (new Uint8Array([51, 52, 53])),
                data: new Uint8Array([51, 52, 53])
            })).to.eventually.be.rejectedWith(Error, 'Key not found');
        }));
        it('throws error when public key material is missing', () => __awaiter(void 0, void 0, void 0, function* () {
            let getKeyStub;
            let kms;
            let kmsKeyStore;
            kmsKeyStore = new KeyStoreMemory();
            kms = new LocalKms({ kmsName: 'memory', keyStore: kmsKeyStore, agent: testAgent });
            const keyPair = yield kms.generateKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                extractable: false,
                keyUsages: ['sign', 'verify']
            });
            getKeyStub = sinon.stub(kmsKeyStore, 'getKey');
            getKeyStub.returns(Promise.resolve({ privateKey: {}, publicKey: {} }));
            yield expect(kms.verify({
                algorithm: { name: 'ECDSA', hash: 'SHA-256' },
                keyRef: keyPair.publicKey.id,
                signature: new Uint8Array(64),
                data: new Uint8Array([51, 52, 53])
            })).to.eventually.be.rejectedWith(Error, `Required property missing: 'material'`);
            // Restore the original KmsKeyStore getKey() method after each test.
            getKeyStub.restore();
        }));
    });
    describe('getAlgorithm', function () {
        /**
           * We can't directly test private methods, but we can indirectly
           * test their behavior through the methods that use them. Since
           * #getAlgorithm() is used in the generateKey() method, we can
           * test this methods with known algorithm names.
           */
        it('does not throw an error when a supported algorithm is specified', () => __awaiter(this, void 0, void 0, function* () {
            yield expect(kms.generateKey({
                algorithm: { name: 'ECDSA', namedCurve: 'secp256k1' },
                keyUsages: ['sign', 'verify']
            })).to.eventually.be.fulfilled;
        }));
        it('throws error when an unsupported algorithm is specified', () => __awaiter(this, void 0, void 0, function* () {
            yield expect(kms.generateKey({
                algorithm: { name: 'not-valid' },
                keyUsages: []
            })).to.eventually.be.rejectedWith(Error, 'is not supported');
        }));
    });
});
//# sourceMappingURL=kms-local.spec.js.map