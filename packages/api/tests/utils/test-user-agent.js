var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Dwn, EventLogLevel, DataStoreLevel, MessageStoreLevel, } from '@tbd54566975/dwn-sdk-js';
import { DidResolver, DidKeyMethod, } from '@web5/dids';
import { LocalKms, DidManager, DidMessage, DwnManager, KeyManager, AppDataVault, Web5RpcClient, IdentityManager, SyncManagerLevel, } from '@web5/agent';
export class TestUserAgent {
    constructor(options) {
        this.appData = options.appData;
        this.didManager = options.didManager;
        this.didResolver = options.didResolver;
        this.dwnManager = options.dwnManager;
        this.identityManager = options.identityManager;
        this.keyManager = options.keyManager;
        this.rpcClient = options.rpcClient;
        this.syncManager = options.syncManager;
        // Set this agent to be the default agent for each component.
        this.didManager.agent = this;
        this.dwnManager.agent = this;
        this.identityManager.agent = this;
        this.keyManager.agent = this;
        this.syncManager.agent = this;
        // TestUserAgent-specific properties.
        this.dwn = options.dwn;
        this.dwnDataStore = options.dwnDataStore;
        this.dwnEventLog = options.dwnEventLog;
        this.dwnMessageStore = options.dwnMessageStore;
    }
    clearStorage() {
        return __awaiter(this, void 0, void 0, function* () {
            this.agentDid = undefined;
            yield this.dwnDataStore.clear();
            yield this.dwnEventLog.clear();
            yield this.dwnMessageStore.clear();
        });
    }
    closeStorage() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.dwnDataStore.close();
            yield this.dwnEventLog.close();
            yield this.dwnMessageStore.close();
        });
    }
    static create(options = {}) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const testDataLocation = (_a = options.testDataLocation) !== null && _a !== void 0 ? _a : '__TESTDATA__';
            const testDataPath = (path) => `${testDataLocation}/${path}`;
            // Instantiate custom stores to use with DWN instance.
            const dwnDataStore = new DataStoreLevel({ blockstoreLocation: testDataPath('DATASTORE') });
            const dwnEventLog = new EventLogLevel({ location: testDataPath('EVENTLOG') });
            const dwnMessageStore = new MessageStoreLevel({
                blockstoreLocation: testDataPath('MESSAGESTORE'),
                indexLocation: testDataPath('INDEX')
            });
            // Instantiate components with default in-memory stores.
            const appData = new AppDataVault({ keyDerivationWorkFactor: 1 });
            const didManager = new DidManager({ didMethods: [DidKeyMethod] });
            const identityManager = new IdentityManager();
            const kms = {
                memory: new LocalKms({ kmsName: 'memory' })
            };
            const keyManager = new KeyManager({ kms });
            // Instantiate DID resolver.
            const didMethodApis = [DidKeyMethod];
            const didResolver = new DidResolver({ didResolvers: didMethodApis });
            // Instantiate custom DWN instance.
            const dwn = yield Dwn.create({
                eventLog: dwnEventLog,
                dataStore: dwnDataStore,
                messageStore: dwnMessageStore
            });
            // Instantiate a DwnManager using the custom DWN instance.
            const dwnManager = new DwnManager({ dwn });
            // Instantiate an RPC Client.
            const rpcClient = new Web5RpcClient();
            // Instantiate a SyncManager.
            const syncManager = new SyncManagerLevel({ dataPath: testDataPath('SYNC_STORE') });
            return new TestUserAgent({
                appData,
                didManager,
                didResolver,
                dwn,
                dwnDataStore,
                dwnEventLog,
                dwnMessageStore,
                dwnManager,
                identityManager,
                keyManager,
                rpcClient,
                syncManager,
            });
        });
    }
    firstLaunch() {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Not implemented');
        });
    }
    initialize(_options) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Not implemented');
        });
    }
    processDidRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (request.messageType) {
                case DidMessage.Resolve: {
                    const { didUrl, resolutionOptions } = request.messageOptions;
                    const result = yield this.didResolver.resolve(didUrl, resolutionOptions);
                    return { result };
                }
                default: {
                    return this.didManager.processRequest(request);
                }
            }
        });
    }
    processDwnRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dwnManager.processRequest(request);
        });
    }
    processVcRequest(_request) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Not implemented');
        });
    }
    sendDidRequest(_request) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Not implemented');
        });
    }
    sendDwnRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dwnManager.sendRequest(request);
        });
    }
    sendVcRequest(_request) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Not implemented');
        });
    }
    start(_options) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Not implemented');
        });
    }
}
//# sourceMappingURL=test-user-agent.js.map