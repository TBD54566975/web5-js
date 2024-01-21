import type { Web5Rpc, DidRequest, VcResponse, DidResponse, DwnResponse, SyncManager, AppDataStore, SendVcRequest, SendDwnRequest, ProcessVcRequest, Web5ManagedAgent, ProcessDwnRequest } from '@web5/agent';
import { DidResolver } from '@web5/dids';
import { DidManager, DwnManager, KeyManager, IdentityManager } from '@web5/agent';
export type IdentityAgentOptions = {
    agentDid: string;
    appData: AppDataStore;
    didManager: DidManager;
    didResolver: DidResolver;
    dwnManager: DwnManager;
    identityManager: IdentityManager;
    keyManager: KeyManager;
    rpcClient: Web5Rpc;
    syncManager: SyncManager;
};
export declare class IdentityAgent implements Web5ManagedAgent {
    agentDid: string;
    appData: AppDataStore;
    didManager: DidManager;
    didResolver: DidResolver;
    dwnManager: DwnManager;
    identityManager: IdentityManager;
    keyManager: KeyManager;
    rpcClient: Web5Rpc;
    syncManager: SyncManager;
    constructor(options: IdentityAgentOptions);
    static create(options?: Partial<IdentityAgentOptions>): Promise<IdentityAgent>;
    firstLaunch(): Promise<boolean>;
    /**
     * Executed once the first time the Identity Agent is launched.
     * The passphrase should be input by the end-user.
     */
    initialize(options: {
        passphrase: string;
    }): Promise<void>;
    processDidRequest(request: DidRequest): Promise<DidResponse>;
    processDwnRequest(request: ProcessDwnRequest): Promise<DwnResponse>;
    processVcRequest(_request: ProcessVcRequest): Promise<VcResponse>;
    sendDidRequest(_request: DidRequest): Promise<DidResponse>;
    sendDwnRequest(request: SendDwnRequest): Promise<DwnResponse>;
    sendVcRequest(_request: SendVcRequest): Promise<VcResponse>;
    start(options: {
        passphrase: string;
    }): Promise<void>;
}
//# sourceMappingURL=identity-agent.d.ts.map