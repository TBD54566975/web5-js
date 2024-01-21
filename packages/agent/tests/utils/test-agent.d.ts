import { Level } from 'level';
import { DidResolver } from '@web5/dids';
import { Dwn, DataStoreLevel, EventLogLevel, MessageStoreLevel } from '@tbd54566975/dwn-sdk-js';
import type { Web5Rpc } from '../../src/rpc-client.js';
import type { AppDataStore } from '../../src/app-data-store.js';
import type { DidRequest, VcResponse, DidResponse, DwnResponse, SendVcRequest, SendDwnRequest, ProcessVcRequest, Web5ManagedAgent, ProcessDwnRequest } from '../../src/types/agent.js';
import { DwnManager } from '../../src/dwn-manager.js';
import { KeyManager } from '../../src/key-manager.js';
import { IdentityManager } from '../../src/identity-manager.js';
import { DidManager } from '../../src/did-manager.js';
import { SyncManager } from '../../src/sync-manager.js';
type CreateMethodOptions = {
    testDataLocation?: string;
};
type TestAgentOptions = {
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
    syncStore: Level;
};
export declare class TestAgent implements Web5ManagedAgent {
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
     * Store-related properties.
     */
    dwn: Dwn;
    dwnDataStore: DataStoreLevel;
    dwnEventLog: EventLogLevel;
    dwnMessageStore: MessageStoreLevel;
    syncStore: Level;
    constructor(options: TestAgentOptions);
    clearStorage(): Promise<void>;
    closeStorage(): Promise<void>;
    static create(options?: CreateMethodOptions): Promise<TestAgent>;
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
//# sourceMappingURL=test-agent.d.ts.map