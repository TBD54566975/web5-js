import type { Readable, RequireOnly } from '@web5/common';
import type {
  EventsGetReply,
  EventsGetOptions,
  EventsGetMessage,
  EventsQueryReply,
  MessagesGetReply,
  RecordsReadReply,
  RecordsQueryReply,
  EventsQueryMessage,
  EventsQueryOptions,
  MessagesGetMessage,
  MessagesGetOptions,
  RecordsReadMessage,
  RecordsReadOptions,
  GenericMessageReply,
  ProtocolsQueryReply,
  RecordsQueryMessage,
  RecordsQueryOptions,
  RecordsWriteMessage,
  RecordsWriteOptions,
  RecordsDeleteMessage,
  RecordsDeleteOptions,
  ProtocolsQueryMessage,
  ProtocolsQueryOptions,
  ProtocolsConfigureMessage,
  ProtocolsConfigureOptions,
  EventsSubscribeMessage,
  RecordsSubscribeMessage,
  EventsSubscribeOptions,
  RecordsSubscribeOptions,
  EventsSubscribeReply,
  RecordsSubscribeReply,
} from '@tbd54566975/dwn-sdk-js';

import {
  EventsGet,
  EventsSubscribe,
  MessagesGet,
  RecordsRead,
  RecordsQuery,
  RecordsSubscribe,
  RecordsWrite,
  DwnMethodName,
  RecordsDelete,
  ProtocolsQuery,
  DwnInterfaceName,
  ProtocolsConfigure,
  EventsQuery,
} from '@tbd54566975/dwn-sdk-js';

export enum DwnInterface {
  EventsGet          = DwnInterfaceName.Events + DwnMethodName.Get,
  EventsQuery        = DwnInterfaceName.Events + DwnMethodName.Query,
  EventsSubscribe    = DwnInterfaceName.Events + DwnMethodName.Subscribe,
  MessagesGet        = DwnInterfaceName.Messages + DwnMethodName.Get,
  ProtocolsConfigure = DwnInterfaceName.Protocols + DwnMethodName.Configure,
  ProtocolsQuery     = DwnInterfaceName.Protocols + DwnMethodName.Query,
  RecordsDelete      = DwnInterfaceName.Records + DwnMethodName.Delete,
  RecordsQuery       = DwnInterfaceName.Records + DwnMethodName.Query,
  RecordsRead        = DwnInterfaceName.Records + DwnMethodName.Read,
  RecordsSubscribe   = DwnInterfaceName.Records + DwnMethodName.Subscribe,
  RecordsWrite       = DwnInterfaceName.Records + DwnMethodName.Write
}

export interface DwnMessage {
  [DwnInterface.EventsGet]          : EventsGetMessage;
  [DwnInterface.EventsQuery]        : EventsQueryMessage;
  [DwnInterface.EventsSubscribe]    : EventsSubscribeMessage;
  [DwnInterface.MessagesGet]        : MessagesGetMessage;
  [DwnInterface.ProtocolsConfigure] : ProtocolsConfigureMessage;
  [DwnInterface.ProtocolsQuery]     : ProtocolsQueryMessage;
  [DwnInterface.RecordsDelete]      : RecordsDeleteMessage;
  [DwnInterface.RecordsQuery]       : RecordsQueryMessage;
  [DwnInterface.RecordsRead]        : RecordsReadMessage;
  [DwnInterface.RecordsSubscribe]   : RecordsSubscribeMessage;
  [DwnInterface.RecordsWrite]       : RecordsWriteMessage;
}

export interface DwnMessageParams {
  [DwnInterface.EventsGet]          : Partial<EventsGetOptions>;
  [DwnInterface.EventsQuery]        : RequireOnly<EventsQueryOptions, 'filters'>;
  [DwnInterface.EventsSubscribe]    : RequireOnly<EventsSubscribeOptions, 'filters'>;
  [DwnInterface.MessagesGet]        : RequireOnly<MessagesGetOptions, 'messageCids'>;
  [DwnInterface.ProtocolsConfigure] : RequireOnly<ProtocolsConfigureOptions, 'definition'>;
  [DwnInterface.ProtocolsQuery]     : ProtocolsQueryOptions;
  [DwnInterface.RecordsDelete]      : RequireOnly<RecordsDeleteOptions, 'recordId'>;
  [DwnInterface.RecordsQuery]       : RecordsQueryOptions;
  [DwnInterface.RecordsRead]        : RecordsReadOptions;
  [DwnInterface.RecordsSubscribe]   : RecordsSubscribeOptions;
  [DwnInterface.RecordsWrite]       : RecordsWriteOptions;
}

export interface DwnMessageReply {
  [DwnInterface.EventsGet]          : EventsGetReply;
  [DwnInterface.EventsQuery]        : EventsQueryReply;
  [DwnInterface.EventsSubscribe]    : EventsSubscribeReply;
  [DwnInterface.MessagesGet]        : MessagesGetReply;
  [DwnInterface.ProtocolsConfigure] : GenericMessageReply;
  [DwnInterface.ProtocolsQuery]     : ProtocolsQueryReply;
  [DwnInterface.RecordsDelete]      : GenericMessageReply;
  [DwnInterface.RecordsQuery]       : RecordsQueryReply;
  [DwnInterface.RecordsRead]        : RecordsReadReply;
  [DwnInterface.RecordsSubscribe]   : RecordsSubscribeReply;
  [DwnInterface.RecordsWrite]       : GenericMessageReply;
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
  messageCid: string;
  reply: DwnMessageReply[T];
}

export interface DwnMessageConstructor<T extends DwnInterface> {
  new (): DwnMessageInstance[T];
  create(options: DwnMessageParams[T]): Promise<DwnMessageInstance[T]>;
  parse(rawMessage: DwnMessage[T]): Promise<DwnMessageInstance[T]>;
}

export const dwnMessageConstructors: { [T in DwnInterface]: DwnMessageConstructor<T> } = {
  [DwnInterface.EventsGet]          : EventsGet as any,
  [DwnInterface.EventsQuery]        : EventsQuery as any,
  [DwnInterface.EventsSubscribe]    : EventsSubscribe as any,
  [DwnInterface.MessagesGet]        : MessagesGet as any,
  [DwnInterface.ProtocolsConfigure] : ProtocolsConfigure as any,
  [DwnInterface.ProtocolsQuery]     : ProtocolsQuery as any,
  [DwnInterface.RecordsDelete]      : RecordsDelete as any,
  [DwnInterface.RecordsQuery]       : RecordsQuery as any,
  [DwnInterface.RecordsSubscribe]   : RecordsSubscribe as any,
  [DwnInterface.RecordsRead]        : RecordsRead as any,
  [DwnInterface.RecordsWrite]       : RecordsWrite as any,
} as const;

export type DwnMessageConstructors = typeof dwnMessageConstructors;

export interface DwnMessageInstance  {
  [DwnInterface.EventsGet]          : EventsGet;
  [DwnInterface.EventsQuery]        : EventsQuery;
  [DwnInterface.EventsSubscribe]    : EventsSubscribe;
  [DwnInterface.MessagesGet]        : MessagesGet;
  [DwnInterface.ProtocolsConfigure] : ProtocolsConfigure;
  [DwnInterface.ProtocolsQuery]     : ProtocolsQuery;
  [DwnInterface.RecordsDelete]      : RecordsDelete;
  [DwnInterface.RecordsQuery]       : RecordsQuery;
  [DwnInterface.RecordsSubscribe]   : RecordsSubscribe;
  [DwnInterface.RecordsRead]        : RecordsRead;
  [DwnInterface.RecordsWrite]       : RecordsWrite;
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