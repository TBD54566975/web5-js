import type {
  MessageReply,
  RecordsQueryMessage,
  ProtocolsQueryMessage,
  ProtocolsConfigureMessage,
  EventsGetMessage,
  MessagesGetMessage,
  RecordsWriteMessage,
  RecordsDeleteMessage
} from '@tbd54566975/dwn-sdk-js';

import type { JsonRpcResponse } from './json-rpc.js';
export interface Web5Agent {
  processDwnRequest(request: ProcessDwnRequest): Promise<ProcessDwnResponse>
  sendDwnRequest(request: ProcessDwnRequest): Promise<SendDwnResponse>;
}

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

/**
 * TODO: add JSDoc
 */
export type ProcessDwnRequest = {
  author: string;
  dataStream?: Blob | ReadableStream;
  messageType: string;
  messageOptions: unknown;
  target: string;
}

/**
 * TODO: add JSDoc
 */
export type ProcessDwnResponse = {
  reply: MessageReply;
  message?: unknown;
};

/**
 * TODO: add JSDoc
 */
export type SendDwnRequest = {
  messageCid: string;
  messageType: string;
  author: string;
  target: string;
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
  targetDid: string;
  dwnUrl: string;
  message: SerializableDwnMessage | any;
  data?: any;
}

/**
 * TODO: add jsdoc
 */
export type DwnRpcResponse = JsonRpcResponse & {
  dataStream?: ReadableStream
};