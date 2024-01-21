import type { Web5Rpc, DidRequest, VcResponse, DidResponse, DwnResponse, SyncManager, AppDataStore, SendVcRequest, SendDwnRequest, ProcessVcRequest, Web5ManagedAgent, ProcessDwnRequest } from '@web5/agent';
import { DidResolver } from '@web5/dids';
import { DidManager, DwnManager, KeyManager, IdentityManager } from '@web5/agent';
export type Web5UserAgentOptions = {
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
export declare class Web5UserAgent implements Web5ManagedAgent {
    agentDid: string;
    appData: AppDataStore;
    didManager: DidManager;
    didResolver: DidResolver;
    dwnManager: DwnManager;
    identityManager: IdentityManager;
    keyManager: KeyManager;
    rpcClient: Web5Rpc;
    syncManager: SyncManager;
    constructor(options: Web5UserAgentOptions);
    static create(options?: Partial<Web5UserAgentOptions>): Promise<Web5UserAgent>;
    firstLaunch(): Promise<boolean>;
    /** Executed once the first time the Agent is launched.
     * The passphrase should be input by the end-user. */
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
//# sourceMappingURL=user-agent.d.ts.map