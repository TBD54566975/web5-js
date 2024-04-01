import type { EventSubscriptionHandler, RecordsReadReply, UnionMessageReply } from '@tbd54566975/dwn-sdk-js';
import { KeyValueStore } from '@web5/common';

export interface SerializableDwnMessage {
  toJSON(): string;
}

/**
 * Interface that can be implemented to communicate with {@link Web5Agent | Web5 Agent}
 * implementations via JSON-RPC.
 */
export interface DidRpc {
  get transportProtocols(): string[]
  sendDidRequest(request: DidRpcRequest): Promise<DidRpcResponse>
}

export enum DidRpcMethod {
  Create = 'did.create',
  Resolve = 'did.resolve'
}

export type DidRpcRequest = {
  data: string;
  method: DidRpcMethod;
  url: string;
}

export type DidRpcResponse = {
  data?: string;
  ok: boolean;
  status: RpcStatus;
}

/**
 * Interface that can be implemented to communicate with
 * {@link https://github.com/TBD54566975/dwn-server | DWN Servers} via JSON-RPC.
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
  subscriptionHandler?: EventSubscriptionHandler;
  dwnUrl: string;
  message: SerializableDwnMessage | any;
  targetDid: string;
}

/**
 * TODO: add jsdoc
 */
export type DwnRpcResponse = UnionMessageReply & RecordsReadReply;

export type RpcStatus = {
  code: number;
  message: string;
}

export type ServerInfo = {
  /** the maximum file size the user can request to store */
  maxFileSize: number,
  /**
   * an array of strings representing the server's registration requirements.
   *
   * ie. ['proof-of-work-sha256-v0', 'terms-of-service']
   * */
  registrationRequirements: string[],
  /** whether web socket support is enabled on this server */
  webSocketSupport: boolean,
}

export interface DwnServerInfoCache extends KeyValueStore<string, ServerInfo| void> {}

export interface DwnServerInfo {
  getServerInfo(url: string): Promise<ServerInfo>;
}

export interface Web5Rpc extends DwnRpc, DidRpc, DwnServerInfo {}