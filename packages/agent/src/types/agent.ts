import type { Readable } from 'readable-stream';
import type { DidResolutionOptions, DidResolutionResult, PortableDid } from '@web5/dids';
import type {
  EventsGetMessage,
  RecordsReadReply,
  UnionMessageReply,
  MessagesGetMessage,
  RecordsQueryMessage,
  RecordsWriteMessage,
  RecordsDeleteMessage,
  ProtocolsQueryMessage,
  ProtocolsConfigureMessage,
} from '@tbd54566975/dwn-sdk-js';

import { DidResolver } from '@web5/dids';

import type { SyncManager } from '../sync-manager.js';
import type { AppDataStore } from '../app-data-store.js';
import type { DwnRpcResponse, Web5Rpc } from '../rpc-client.js';

import { DidManager, DidMessage } from '../did-manager.js';
import { DwnManager } from '../dwn-manager.js';
import { KeyManager } from '../key-manager.js';
import { IdentityManager } from '../identity-manager.js';

/**
 * DID Types
 */

export type DidMessageType = keyof typeof DidMessage;

export type DidRequest = {
  messageType: DidMessageType;
  messageOptions: any;
  store?: boolean;
}

export type DidCreateMessage = {
  didMethod: string;
  didOptions?: any;
}

export type DidResolveMessage = {
  didUrl: string;
  resolutionOptions?: DidResolutionOptions;
}

export type DidResponse = {
  result?: DidResolutionResult | PortableDid
};

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
  reply: UnionMessageReply & RecordsReadReply;
};

/**
 * TODO: add JSDoc
 */
export type SendDwnResponse = DwnRpcResponse;

export interface SerializableDwnMessage {
  toJSON(): string;
}

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

  processDidRequest(request: DidRequest): Promise<DidResponse>
  sendDidRequest(request: DidRequest): Promise<DidResponse>;
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
  rpcClient: Web5Rpc;
  syncManager: SyncManager;

  firstLaunch(): Promise<boolean>;
  initialize(options: { passphrase: string }): Promise<void>;
  start(options: { passphrase: string }): Promise<void>;
}