import type { Web5Rpc, DidRequest, VcResponse, DidResponse, DwnResponse, AppDataStore, SendVcRequest, SendDwnRequest, ProcessVcRequest, Web5ManagedAgent, ProcessDwnRequest, SyncManager } from '@web5/agent';
import { Dwn, EventLogLevel, DataStoreLevel, MessageStoreLevel } from '@tbd54566975/dwn-sdk-js';
import { DidResolver } from '@web5/dids';
import { DidManager, DwnManager, KeyManager, IdentityManager } from '@web5/agent';
type CreateMethodOptions = {
    testDataLocation?: string;
};
type TestUserAgentOptions = {
    appData: AppDataStore;
    didManager: DidManager;
    didResolver: DidResolver;
    dwnManager: DwnManager;
    identityManager: IdentityManager;
    keyManager: KeyManager;
    rpcClient: Web5Rpc;
    syncManager: SyncManager;
    dwn: Dwn;
    dwnDataStore: DataStoreLevel;
    dwnEventLog: EventLogLevel;
    dwnMessageStore: MessageStoreLevel;
};
export declare class TestUserAgent implements Web5ManagedAgent {
    agentDid: string | undefined;
    appData: AppDataStore;
    didManager: DidManager;
    didResolver: DidResolver;
    dwnManager: DwnManager;
    identityManager: IdentityManager;
    keyManager: KeyManager;
    rpcClient: Web5Rpc;
    syncManager: SyncManager;
    /**
     * DWN-related properties.
     */
    dwn: Dwn;
    dwnDataStore: DataStoreLevel;
    dwnEventLog: EventLogLevel;
    dwnMessageStore: MessageStoreLevel;
    constructor(options: TestUserAgentOptions);
    clearStorage(): Promise<void>;
    closeStorage(): Promise<void>;
    static create(options?: CreateMethodOptions): Promise<TestUserAgent>;
    firstLaunch(): Promise<boolean>;
    initialize(_options: {
        passphrase: string;
    }): Promise<void>;
    processDidRequest(request: DidRequest): Promise<DidResponse>;
    processDwnRequest(request: ProcessDwnRequest): Promise<DwnResponse>;
    processVcRequest(_request: ProcessVcRequest): Promise<VcResponse>;
    sendDidRequest(_request: DidRequest): Promise<DidResponse>;
    sendDwnRequest(request: SendDwnRequest): Promise<DwnResponse>;
    sendVcRequest(_request: SendVcRequest): Promise<VcResponse>;
    start(_options: {
        passphrase: string;
    }): Promise<void>;
}
export {};
//# sourceMappingURL=test-user-agent.d.ts.map