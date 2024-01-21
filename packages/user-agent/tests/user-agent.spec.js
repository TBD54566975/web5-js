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
import { TestManagedAgent } from '@web5/agent';
import { Web5UserAgent } from '../src/user-agent.js';
chai.use(chaiAsPromised);
// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto)
    globalThis.crypto = webcrypto;
describe('Web5UserAgent', () => {
    const agentStoreTypes = ['dwn', 'memory'];
    agentStoreTypes.forEach((agentStoreType) => {
        describe(`with ${agentStoreType} data stores`, () => {
            let testAgent;
            before(() => __awaiter(void 0, void 0, void 0, function* () {
                testAgent = yield TestManagedAgent.create({
                    agentClass: Web5UserAgent,
                    agentStores: agentStoreType
                });
            }));
            beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield testAgent.clearStorage();
            }));
            after(() => __awaiter(void 0, void 0, void 0, function* () {
                yield testAgent.clearStorage();
                yield testAgent.closeStorage();
            }));
            describe('firstLaunch()', () => {
                it('returns true the first time the Identity Agent runs', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield expect(testAgent.agent.firstLaunch()).to.eventually.be.true;
                }));
                it('returns false after Identity Agent initialization', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield expect(testAgent.agent.firstLaunch()).to.eventually.be.true;
                    yield testAgent.agent.initialize({ passphrase: 'test' });
                    yield expect(testAgent.agent.firstLaunch()).to.eventually.be.false;
                }));
            });
            if (agentStoreType === 'dwn') {
                describe('subsequent launches', () => {
                    it('can access stored identifiers after second launch', () => __awaiter(void 0, void 0, void 0, function* () {
                        // First launch and initialization.
                        yield testAgent.agent.start({ passphrase: 'test' });
                        // Create and persist a new Identity (with DID and Keys).
                        const socialIdentity = yield testAgent.agent.identityManager.create({
                            name: 'Social',
                            didMethod: 'key',
                            kms: 'local'
                        });
                        // Simulate terminating and restarting an app.
                        yield testAgent.closeStorage();
                        testAgent = yield TestManagedAgent.create({
                            agentClass: Web5UserAgent,
                            agentStores: 'dwn'
                        });
                        yield testAgent.agent.start({ passphrase: 'test' });
                        // Try to get the identity and verify it exists.
                        const storedIdentity = yield testAgent.agent.identityManager.get({
                            did: socialIdentity.did,
                            context: socialIdentity.did
                        });
                        expect(storedIdentity).to.have.property('did', socialIdentity.did);
                    }));
                });
            }
        });
    });
});
//# sourceMappingURL=user-agent.spec.js.map