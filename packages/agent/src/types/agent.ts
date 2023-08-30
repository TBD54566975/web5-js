import type { Readable } from 'readable-stream';
import type {
  EventsGetMessage,
  UnionMessageReply,
  MessagesGetMessage,
  RecordsQueryMessage,
  RecordsWriteMessage,
  RecordsDeleteMessage,
  ProtocolsQueryMessage,
  ProtocolsConfigureMessage,
} from '@tbd54566975/dwn-sdk-js';

import { DidResolver } from '@web5/dids';

import { DidManager } from '../did-manager.js';
import { DwnManager } from '../dwn-manager.js';
import { KeyManager } from '../key-manager.js';
import { SyncManager } from '../sync-manager.js';
import { AppDataStore } from '../app-data-store.js';
import { IdentityManager } from '../identity-manager.js';

/**
 * DID Types
 */

export type ProcessDidRequest = { /** empty */ }
export type SendDidRequest = { /** empty */ }
export type DidResponse = { /** empty */ }

/**
 * DWN Types
 */
export type DwnMessages = {
  'EventsGet': EventsGetMessage;
  'MessagesGet': MessagesGetMessage;
  'RecordsWrite': RecordsWriteMessage;
  'RecordsQuery': RecordsQueryMessage;
  'RecordsDelete': RecordsDeleteMessage;
  'ProtocolsQuery': ProtocolsQueryMessage;
  'ProtocolsConfigure': ProtocolsConfigureMessage;
};

export type DwnMessageType = keyof DwnMessages;

export type DwnRequest = {
  author: string;
  target: string;
  messageType: string;
}

/**
 * TODO: add JSDoc
 */
export type ProcessDwnRequest = DwnRequest & {
  dataStream?: Blob | ReadableStream | Readable;
  messageOptions: unknown;
  store?: boolean;
};

export type SendDwnRequest = DwnRequest & (ProcessDwnRequest | { messageCid: string })

/**
 * TODO: add JSDoc
 */
export type DwnResponse = {
  message?: unknown;
  messageCid?: string;
  reply: UnionMessageReply;
};

/**
 * TODO: add JSDoc
 */
export type SendDwnResponse = DwnRpcResponse;

export interface SerializableDwnMessage {
  toJSON(): string;
}


// TODO: move what's below to dwn-server repo. i wrote this here for expediency

/**
 * interface that can be implemented to communicate with Dwn Servers
 */
export interface DwnRpc {
  /**
   * TODO: add jsdoc
   */
  get transportProtocols(): string[]

  /**
   * TODO: add jsdoc
   * @param request
   */
  sendDwnRequest(request: DwnRpcRequest): Promise<DwnRpcResponse>
}

/**
 * TODO: add jsdoc
 */
export type DwnRpcRequest = {
  data?: any;
  dwnUrl: string;
  message: SerializableDwnMessage | any;
  targetDid: string;
}

/**
 * TODO: add jsdoc
 */
export type DwnRpcResponse = UnionMessageReply;


/**
 * Verifiable Credential Types
 */

export type ProcessVcRequest = { /** empty */ }
export type SendVcRequest = { /** empty */ }
export type VcResponse = { /** empty */ }

/**
 * Web5 Agent Types
 */
export interface Web5Agent {
  agentDid: string | undefined;

  processDidRequest(request: ProcessDidRequest): Promise<DidResponse>
  sendDidRequest(request: SendDidRequest): Promise<DidResponse>;
  processDwnRequest(request: ProcessDwnRequest): Promise<DwnResponse>
  sendDwnRequest(request: SendDwnRequest): Promise<DwnResponse>;
  processVcRequest(request: ProcessVcRequest): Promise<VcResponse>
  sendVcRequest(request: SendVcRequest): Promise<VcResponse>;
}

export interface Web5ManagedAgent extends Web5Agent {
  appData: AppDataStore;
  didManager: DidManager;
  didResolver: DidResolver;
  dwnManager: DwnManager;
  identityManager: IdentityManager;
  keyManager: KeyManager;
  rpcClient: DwnRpc;
  syncManager: SyncManager;

  firstLaunch(): Promise<boolean>;
  initialize(options: { passphrase: string }): Promise<void>;
  start(options: { passphrase: string }): Promise<void>;
}