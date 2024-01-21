var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Web5 } from '@web5/api';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { TestManagedAgent } from '@web5/agent';
import { IdentityAgent } from '../src/identity-agent.js';
chai.use(chaiAsPromised);
// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto)
    globalThis.crypto = webcrypto;
describe('Managing Identities', () => {
    const agentStoreTypes = ['dwn', 'memory'];
    agentStoreTypes.forEach((agentStoreType) => {
        describe(`with ${agentStoreType} data stores`, () => {
            let testAgent;
            before(() => __awaiter(void 0, void 0, void 0, function* () {
                testAgent = yield TestManagedAgent.create({
                    agentClass: IdentityAgent,
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
            describe('initial identity creation', () => {
                it('can create three identities', () => __awaiter(void 0, void 0, void 0, function* () {
                    // Start agent for the first time.
                    yield testAgent.agent.start({ passphrase: 'test' });
                    // Create three identities, each of which is stored in a new tenant.
                    const careerIdentity = yield testAgent.agent.identityManager.create({
                        name: 'Social',
                        didMethod: 'key',
                        kms: 'local'
                    });
                    const familyIdentity = yield testAgent.agent.identityManager.create({
                        name: 'Social',
                        didMethod: 'key',
                        kms: 'local'
                    });
                    const socialIdentity = yield testAgent.agent.identityManager.create({
                        name: 'Social',
                        didMethod: 'key',
                        kms: 'local'
                    });
                    // Verify the Identities were stored in each new Identity's tenant.
                    const storedCareerIdentity = yield testAgent.agent.identityManager.get({ did: careerIdentity.did, context: careerIdentity.did });
                    const storedFamilyIdentity = yield testAgent.agent.identityManager.get({ did: familyIdentity.did, context: familyIdentity.did });
                    const storedSocialIdentity = yield testAgent.agent.identityManager.get({ did: socialIdentity.did, context: socialIdentity.did });
                    expect(storedCareerIdentity).to.have.property('did', careerIdentity.did);
                    expect(storedFamilyIdentity).to.have.property('did', familyIdentity.did);
                    expect(storedSocialIdentity).to.have.property('did', socialIdentity.did);
                })).timeout(30000);
                // Tests that should only run for DWN-backed stores that provide multi-tenancy.
                if (agentStoreType === 'dwn') {
                    it('supports tenant isolation between Identity Agent and Identities under management', () => __awaiter(void 0, void 0, void 0, function* () {
                        var _a, _b, _c;
                        // Start agent for the first time.
                        yield testAgent.agent.start({ passphrase: 'test' });
                        // Create three identities, each of which is stored in a new tenant.
                        const careerIdentity = yield testAgent.agent.identityManager.create({
                            name: 'Career',
                            didMethod: 'key',
                            kms: 'local'
                        });
                        const familyIdentity = yield testAgent.agent.identityManager.create({
                            name: 'Family',
                            didMethod: 'key',
                            kms: 'local'
                        });
                        const socialIdentity = yield testAgent.agent.identityManager.create({
                            name: 'Social',
                            didMethod: 'key',
                            kms: 'local'
                        });
                        // Import just the Identity metadata for the new identities to the Identity Agent's tenant.
                        yield testAgent.agent.identityManager.import({ identity: careerIdentity, context: testAgent.agent.agentDid });
                        yield testAgent.agent.identityManager.import({ identity: familyIdentity, context: testAgent.agent.agentDid });
                        yield testAgent.agent.identityManager.import({ identity: socialIdentity, context: testAgent.agent.agentDid });
                        // Verify the Identities were stored in each new Identity's tenant.
                        const storedCareerIdentity = yield testAgent.agent.identityManager.get({ did: careerIdentity.did, context: careerIdentity.did });
                        const storedFamilyIdentity = yield testAgent.agent.identityManager.get({ did: familyIdentity.did, context: familyIdentity.did });
                        const storedSocialIdentity = yield testAgent.agent.identityManager.get({ did: socialIdentity.did, context: socialIdentity.did });
                        expect(storedCareerIdentity).to.have.property('did', careerIdentity.did);
                        expect(storedFamilyIdentity).to.have.property('did', familyIdentity.did);
                        expect(storedSocialIdentity).to.have.property('did', socialIdentity.did);
                        // Verify the Identities were ALSO stored in the Identity Agent's tenant.
                        const storedIdentities = yield testAgent.agent.identityManager.list();
                        expect(storedIdentities).to.have.length(3);
                        // Verify the DIDs were only stored in the new Identity's tenant.
                        let storedCareerDid = yield testAgent.agent.didManager.get({ didRef: careerIdentity.did, context: careerIdentity.did });
                        expect(storedCareerDid).to.exist;
                        storedCareerDid = yield testAgent.agent.didManager.get({ didRef: careerIdentity.did });
                        expect(storedCareerDid).to.not.exist;
                        let storedFamilyDid = yield testAgent.agent.didManager.get({ didRef: familyIdentity.did, context: familyIdentity.did });
                        expect(storedFamilyDid).to.exist;
                        storedFamilyDid = yield testAgent.agent.didManager.get({ didRef: familyIdentity.did });
                        expect(storedFamilyDid).to.not.exist;
                        let storedSocialDid = yield testAgent.agent.didManager.get({ didRef: socialIdentity.did, context: socialIdentity.did });
                        expect(storedSocialDid).to.exist;
                        storedSocialDid = yield testAgent.agent.didManager.get({ didRef: socialIdentity.did });
                        expect(storedSocialDid).to.not.exist;
                        // Verify keys were stored in Identity Agent's DWN.
                        const careerKey = yield testAgent.agent.keyManager.getKey({
                            keyRef: (_a = yield testAgent.agent.didManager.getDefaultSigningKey({ did: careerIdentity.did })) !== null && _a !== void 0 ? _a : '' // Type guard.
                        });
                        expect(careerKey).to.exist;
                        const familyKey = yield testAgent.agent.keyManager.getKey({
                            keyRef: (_b = yield testAgent.agent.didManager.getDefaultSigningKey({ did: familyIdentity.did })) !== null && _b !== void 0 ? _b : '' // Type guard.
                        });
                        expect(familyKey).to.exist;
                        const socialKey = yield testAgent.agent.keyManager.getKey({
                            keyRef: (_c = yield testAgent.agent.didManager.getDefaultSigningKey({ did: socialIdentity.did })) !== null && _c !== void 0 ? _c : '' // Type guard.
                        });
                        expect(socialKey).to.exist;
                    })).timeout(30000);
                }
            });
            describe('Using Web5 API', () => __awaiter(void 0, void 0, void 0, function* () {
                it('should instantiate Web5 API with provided Web5Agent and DID', () => __awaiter(void 0, void 0, void 0, function* () {
                    // Start agent for the first time.
                    yield testAgent.agent.start({ passphrase: 'test' });
                    // Create two identities, each of which is stored in a new tenant.
                    const careerIdentity = yield testAgent.agent.identityManager.create({
                        name: 'Career',
                        didMethod: 'key',
                        kms: 'local'
                    });
                    const socialIdentity = yield testAgent.agent.identityManager.create({
                        name: 'Social',
                        didMethod: 'key',
                        kms: 'local'
                    });
                    // Instantiate a Web5 instance with the "Career" Identity, write a record, and verify the result.
                    const web5Career = new Web5({ agent: testAgent.agent, connectedDid: careerIdentity.did });
                    expect(web5Career).to.exist;
                    // Instantiate a Web5 instance with the "Social" Identity, write a record, and verify the result.
                    const web5Social = new Web5({ agent: testAgent.agent, connectedDid: socialIdentity.did });
                    expect(web5Social).to.exist;
                })).timeout(30000);
                it('Can write records using an Identity under management', () => __awaiter(void 0, void 0, void 0, function* () {
                    var _a, _b, _c, _d;
                    // Start agent for the first time.
                    yield testAgent.agent.start({ passphrase: 'test' });
                    // Create two identities, each of which is stored in a new tenant.
                    const careerIdentity = yield testAgent.agent.identityManager.create({
                        name: 'Social',
                        didMethod: 'key',
                        kms: 'local'
                    });
                    const socialIdentity = yield testAgent.agent.identityManager.create({
                        name: 'Social',
                        didMethod: 'key',
                        kms: 'local'
                    });
                    // Instantiate a Web5 instance with the "Career" Identity, write a record, and verify the result.
                    const web5Career = new Web5({ agent: testAgent.agent, connectedDid: careerIdentity.did });
                    const careerResult = yield web5Career.dwn.records.write({
                        data: 'Hello, world!',
                        message: {
                            schema: 'foo/bar',
                            dataFormat: 'text/plain'
                        }
                    });
                    expect(careerResult.status.code).to.equal(202);
                    expect(careerResult.record).to.exist;
                    expect((_a = careerResult.record) === null || _a === void 0 ? void 0 : _a.author).to.equal(careerIdentity.did);
                    expect(yield ((_b = careerResult.record) === null || _b === void 0 ? void 0 : _b.data.text())).to.equal('Hello, world!');
                    // Instantiate a Web5 instance with the "Social" Identity, write a record, and verify the result.
                    const web5Social = new Web5({ agent: testAgent.agent, connectedDid: socialIdentity.did });
                    const socialResult = yield web5Social.dwn.records.write({
                        data: 'Hello, everyone!',
                        message: {
                            schema: 'foo/bar',
                            dataFormat: 'text/plain'
                        }
                    });
                    expect(socialResult.status.code).to.equal(202);
                    expect(socialResult.record).to.exist;
                    expect((_c = socialResult.record) === null || _c === void 0 ? void 0 : _c.author).to.equal(socialIdentity.did);
                    expect(yield ((_d = socialResult.record) === null || _d === void 0 ? void 0 : _d.data.text())).to.equal('Hello, everyone!');
                })).timeout(30000);
            }));
        });
    });
});
//# sourceMappingURL=managing-identities.spec.js.map