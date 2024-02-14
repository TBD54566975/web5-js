import type { CryptoApi } from '@web5/crypto';
import type { BearerDid } from '@web5/dids';

import type { AgentCryptoApi } from '../crypto-api.js';

import { AgentDwnApi } from '../dwn-api.js';
import { AgentDidApi, DidInterface, DidRequest, DidResponse } from '../did-api.js';
import { DwnInterface, DwnResponse, ProcessDwnRequest, SendDwnRequest } from './agent-dwn.js';
import { ProcessVcRequest, SendVcRequest, VcResponse } from './agent-vc.js';

/**
 * Status code and detailed message for a response.
 */
export type ResponseStatus = {
  ok: boolean;

  status: {
    code: number;
    detail: string;
  };
};

/**
 * Web5 Agent Types
 */
export interface Web5Agent {
  agentDid?: BearerDid;

  processDidRequest(request: DidRequest<DidInterface>): Promise<DidResponse<DidInterface>>
  sendDidRequest(request: DidRequest<DidInterface>): Promise<DidResponse<DidInterface>>;
  processDwnRequest<T extends DwnInterface>(request: ProcessDwnRequest<T>): Promise<DwnResponse<T>>
  sendDwnRequest<T extends DwnInterface>(request: SendDwnRequest<T>): Promise<DwnResponse<T>>;
  processVcRequest(request: ProcessVcRequest): Promise<VcResponse>
  sendVcRequest(request: SendVcRequest): Promise<VcResponse>;
}

export interface Web5ManagedAgent<TCrypto extends CryptoApi = AgentCryptoApi> extends Web5Agent {
  crypto: TCrypto;
  did: AgentDidApi<TCrypto>;
  dwn: AgentDwnApi;

  firstLaunch(): Promise<boolean>;
  initialize(params: { passphrase: string }): Promise<void>;
  start(params: { passphrase: string }): Promise<void>;
}