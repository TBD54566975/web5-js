var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Level } from 'level';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import { LevelStore, MemoryStore } from '../src/stores.js';
describe('LevelStore', () => {
    let levelStore;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        levelStore = new LevelStore({ location: '__TESTDATA__' });
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield levelStore.close();
    }));
    describe('constructor', function () {
        it('should initialize with default parameters', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const store = new LevelStore();
                expect(store).to.be.an.instanceof(LevelStore);
                yield store.close();
            });
        });
        it('should initialize with a custom store location', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const store = new LevelStore({ location: '__TESTDATA__/customLocation' });
                expect(store).to.be.an.instanceof(LevelStore);
                yield store.close();
            });
        });
        it('should initialize with a custom database', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const db = new Level('__TESTDATA__/customLocation');
                const store = new LevelStore({ db });
                expect(store).to.be.an.instanceof(LevelStore);
                yield store.close();
            });
        });
    });
    describe('clear()', () => {
        it('should clear all key-value pairs', () => __awaiter(void 0, void 0, void 0, function* () {
            // Populate the store with some data.
            yield levelStore.set('key1', '1');
            yield levelStore.set('key2', '2');
            // Clear the store.
            yield levelStore.clear();
            // Validate that the store is empty.
            let value = yield levelStore.get('key1');
            expect(value).to.be.undefined;
            value = yield levelStore.get('key2');
            expect(value).to.be.undefined;
        }));
    });
    describe('close()', () => {
        it('should close the store', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create a new store.
            const store = new LevelStore({ location: '__TESTDATA__/customLocation' });
            // Close the store.
            yield expect(store.close()).to.be.fulfilled;
            // Try to set a value in the store and confirm it is no longer open.
            yield expect(store.set('key', 'value')).to.be.rejectedWith('Database is not open');
        }));
    });
    describe('delete()', () => {
        it('should delete a key-value pair', () => __awaiter(void 0, void 0, void 0, function* () {
            // Populate the store with some data.
            yield levelStore.set('key1', '1');
            yield levelStore.set('key2', '2');
            // Delete a key-value pair.
            yield levelStore.delete('key1');
            // Validate that the key-value pair was deleted.
            const value = yield levelStore.get('key1');
            expect(value).to.be.undefined;
        }));
        it('should not throw when deleting a non-existing key', () => __awaiter(void 0, void 0, void 0, function* () {
            // Delete a non-existent key-value pair.
            yield expect(levelStore.delete('non-existing')).to.eventually.be.fulfilled;
        }));
    });
    describe('get()', () => {
        it('should retrieve the value for an existing key', () => __awaiter(void 0, void 0, void 0, function* () {
            yield levelStore.set('key1', 'value1');
            const value = yield levelStore.get('key1');
            expect(value).to.equal('value1');
        }));
        it('should return undefined for a non-existing key', () => __awaiter(void 0, void 0, void 0, function* () {
            const value = yield levelStore.get('nonExistingKey');
            expect(value).to.be.undefined;
        }));
        it('should handle errors from the underlying store', () => __awaiter(void 0, void 0, void 0, function* () {
            // Close the store to force an error.
            yield levelStore.close();
            // Try to get a value from the store and confirm an error is thrown.
            yield expect(levelStore.get('key')).to.be.rejectedWith('Database is not open');
        }));
    });
    describe('set()', () => {
        it('should set a new key-value pair', () => __awaiter(void 0, void 0, void 0, function* () {
            yield levelStore.set('newKey', 'newValue');
            const value = yield levelStore.get('newKey');
            expect(value).to.equal('newValue');
        }));
        it('should overwrite an existing key-value pair', () => __awaiter(void 0, void 0, void 0, function* () {
            yield levelStore.set('existingKey', 'oldValue');
            yield levelStore.set('existingKey', 'newValue');
            const value = yield levelStore.get('existingKey');
            expect(value).to.equal('newValue');
        }));
    });
    describe('supported value types', () => {
        let store;
        afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
            yield store.clear();
            yield store.close();
        }));
        it('should handle string values', () => __awaiter(void 0, void 0, void 0, function* () {
            const db = new Level('__TESTDATA__/stringValues', { valueEncoding: 'utf8' });
            store = new LevelStore({ db });
            yield store.set('stringKey', 'stringValue');
            const value = yield store.get('stringKey');
            expect(value).to.equal('stringValue');
        }));
        it('should handle number values', () => __awaiter(void 0, void 0, void 0, function* () {
            const db = new Level('__TESTDATA__/stringValues', { valueEncoding: 'json' });
            store = new LevelStore({ db });
            yield store.set('numberKey', 123);
            const value = yield store.get('numberKey');
            expect(value).to.equal(123);
        }));
        it('should handle boolean values', () => __awaiter(void 0, void 0, void 0, function* () {
            const db = new Level('__TESTDATA__/stringValues', { valueEncoding: 'json' });
            store = new LevelStore({ db });
            yield store.set('booleanKey', true);
            const value = yield store.get('booleanKey');
            expect(value).to.be.true;
        }));
        it('should handle object values', () => __awaiter(void 0, void 0, void 0, function* () {
            const db = new Level('__TESTDATA__/objectValues', { valueEncoding: 'json' });
            store = new LevelStore({ db });
            const obj = { a: 1, b: 'test' };
            yield store.set('objectKey', obj);
            const value = yield store.get('objectKey');
            expect(value).to.deep.equal(obj);
        }));
        it('should handle array values', () => __awaiter(void 0, void 0, void 0, function* () {
            const db = new Level('__TESTDATA__/arrayValues', { valueEncoding: 'json' });
            store = new LevelStore({ db });
            const arr = ['one', 'two', 'three'];
            yield store.set('arrayKey', arr);
            const value = yield store.get('arrayKey');
            expect(value).to.deep.equal(arr);
        }));
        it('should handle Uint8Array values', () => __awaiter(void 0, void 0, void 0, function* () {
            const db = new Level('__TESTDATA__/uint8ArrayValues', { valueEncoding: 'binary' });
            store = new LevelStore({ db });
            const u8a = new Uint8Array([1, 2, 3]);
            yield store.set('uint8ArrayKey', u8a);
            const value = yield store.get('uint8ArrayKey');
            expect(value).to.deep.equal(u8a);
        }));
    });
});
describe('MemoryStore', () => {
    let memoryStore;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        memoryStore = new MemoryStore();
        yield memoryStore.set('key1', 1);
    }));
    describe('clear()', () => {
        it('should clear all key-value pairs', () => __awaiter(void 0, void 0, void 0, function* () {
            yield memoryStore.set('key2', 2);
            yield memoryStore.clear();
            let value = yield memoryStore.get('key1');
            expect(value).to.be.undefined;
            value = yield memoryStore.get('key2');
            expect(value).to.be.undefined;
        }));
    });
    describe('close()', () => {
        it('should no-op when trying to close the store', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(memoryStore.close()).to.be.fulfilled;
        }));
    });
    describe('delete()', () => {
        it('should delete a key-value pair', () => __awaiter(void 0, void 0, void 0, function* () {
            const wasDeleted = yield memoryStore.delete('key1');
            expect(wasDeleted).to.be.true;
            const value = yield memoryStore.get('key1');
            expect(value).to.be.undefined;
        }));
        it('should return false when deleting a non-existing key', () => __awaiter(void 0, void 0, void 0, function* () {
            const wasDeleted = yield memoryStore.delete('non-existing');
            expect(wasDeleted).to.be.false;
        }));
    });
    describe('get()', () => {
        it('should get a value', () => __awaiter(void 0, void 0, void 0, function* () {
            const value = yield memoryStore.get('key1');
            expect(value).to.equal(1);
        }));
        it('should return undefined for a non-existing key', () => __awaiter(void 0, void 0, void 0, function* () {
            const value = yield memoryStore.get('non-existing');
            expect(value).to.be.undefined;
        }));
    });
    describe('has()', () => {
        it('should check the presence of an entry by key correctly', () => __awaiter(void 0, void 0, void 0, function* () {
            const hasKey = yield memoryStore.has('key1');
            expect(hasKey).to.be.true;
        }));
        it('should return false when checking the presence of a non-existing key', () => __awaiter(void 0, void 0, void 0, function* () {
            const hasKey = yield memoryStore.has('non-existing');
            expect(hasKey).to.be.false;
        }));
    });
    describe('list()', () => {
        it('should list all values in the store correctly', () => __awaiter(void 0, void 0, void 0, function* () {
            yield memoryStore.set('key2', 2);
            const values = yield memoryStore.list();
            expect(values).to.have.members([1, 2]);
        }));
    });
    describe('set()', () => {
        it('should set a value', () => __awaiter(void 0, void 0, void 0, function* () {
            yield memoryStore.set('key99', 99);
            const value = yield memoryStore.get('key99');
            expect(value).to.equal(99);
        }));
    });
});
//# sourceMappingURL=stores.spec.js.map