import type { MessageEvent, RecordsReadReply, UnionMessageReply } from '@tbd54566975/dwn-sdk-js';

export interface SerializableDwnMessage {
  toJSON(): string;
}

export type DwnEventSubscriptionHandler = (event: MessageEvent) => void;

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
  subscriptionHandler?: DwnEventSubscriptionHandler;
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

export interface Web5Rpc extends DwnRpc, DidRpc {}