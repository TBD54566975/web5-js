import type { Readable } from '@web5/common';
import type { RecordsReadMessage } from '../temp/dwn-types.js';
import type {
  // EventsGetMessage,
  RecordsReadReply,
  RecordsQueryReply,
  // MessagesGetMessage,
  RecordsReadOptions,
  GenericMessageReply,
  RecordsQueryMessage,
  RecordsQueryOptions,
  RecordsWriteMessage,
  RecordsWriteOptions,
  RecordsDeleteMessage,
  RecordsDeleteOptions,
  // ProtocolsQueryMessage,
  // ProtocolsConfigureMessage,
} from '@tbd54566975/dwn-sdk-js';

import {
  RecordsRead,
  RecordsQuery,
  RecordsWrite,
  DwnMethodName,
  DwnInterfaceName,
  RecordsDelete,
} from '@tbd54566975/dwn-sdk-js';

export enum DwnInterface {
  RecordsDelete = DwnInterfaceName.Records + DwnMethodName.Delete,
  RecordsQuery = DwnInterfaceName.Records + DwnMethodName.Query,
  RecordsRead = DwnInterfaceName.Records + DwnMethodName.Read,
  RecordsWrite = DwnInterfaceName.Records + DwnMethodName.Write
}

export interface DwnMessage {
  [DwnInterface.RecordsDelete]: RecordsDeleteMessage;
  [DwnInterface.RecordsQuery]: RecordsQueryMessage;
  [DwnInterface.RecordsRead]: RecordsReadMessage;
  [DwnInterface.RecordsWrite]: RecordsWriteMessage;
}

export interface DwnMessageParams {
  [DwnInterface.RecordsDelete]: RecordsDeleteOptions;
  [DwnInterface.RecordsQuery]: RecordsQueryOptions;
  [DwnInterface.RecordsRead]: RecordsReadOptions;
  [DwnInterface.RecordsWrite]: RecordsWriteOptions;
}

export interface DwnMessageReply {
  [DwnInterface.RecordsDelete]: GenericMessageReply;
  [DwnInterface.RecordsQuery]: RecordsQueryReply;
  [DwnInterface.RecordsRead]: RecordsReadReply;
  [DwnInterface.RecordsWrite]: GenericMessageReply;
}

export type DwnRequest<T extends DwnInterface> = {
  author: string;
  target: string;
  messageType: T;
}

export type ProcessDwnRequest<T extends DwnInterface> = DwnRequest<T> & {
  dataStream?: Blob | ReadableStream | Readable;
  rawMessage?: DwnMessage[T];
  messageParams?: DwnMessageParams[T];
  store?: boolean;
  signAsOwner?: boolean;
}

export type SendDwnRequest<T extends DwnInterface> = DwnRequest<T> & (ProcessDwnRequest<T> | { messageCid: string })

export type DwnResponse<T extends DwnInterface> = {
  message?: DwnMessage[T];
  messageCid?: string;
  reply: DwnMessageReply[T];
}

export interface DwnMessageConstructor<T extends DwnInterface> {
  new (): DwnMessageInstance[T];
  create(options: DwnMessageParams[T]): Promise<DwnMessageInstance[T]>;
  parse(rawMessage: DwnMessage[T]): Promise<DwnMessageInstance[T]>;
}

export const dwnMessageConstructors: { [T in DwnInterface]: DwnMessageConstructor<T> } = {
  [DwnInterface.RecordsDelete] : RecordsDelete as any,
  [DwnInterface.RecordsQuery]  : RecordsQuery as any,
  [DwnInterface.RecordsRead]   : RecordsRead as any,
  [DwnInterface.RecordsWrite]  : RecordsWrite as any,
} as const;

export type DwnMessageConstructors = typeof dwnMessageConstructors;

export interface DwnMessageInstance  {
  [DwnInterface.RecordsDelete] : RecordsDelete,
  [DwnInterface.RecordsQuery] : RecordsQuery,
  [DwnInterface.RecordsRead]  : RecordsRead,
  [DwnInterface.RecordsWrite] : RecordsWrite,
}

export type DwnMessageWithData<T extends DwnInterface> = {
  message: DwnMessage[T];
  dataStream?: Readable;
}

/**
 * TODO: add JSDoc
 */
// export type SendDwnResponse = DwnRpcResponse;

export interface SerializableDwnMessage {
  toJSON(): string;
}