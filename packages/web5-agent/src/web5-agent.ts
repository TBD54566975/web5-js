import type { Readable } from 'readable-stream';
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

export interface Web5Agent {
  processDwnRequest(request: ProcessDwnRequest): Promise<ProcessDwnResponse>
  sendDwnRequest(request: SendDwnRequest): Promise<any>;
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

export type ProcessDwnRequest = {
  author: string;
  dataStream?: Readable;
  messageType: string;
  messageOptions: unknown;
  target: string;
}

export type ProcessDwnResponse = {
  reply: MessageReply;
  message?: unknown;
};

export type SendDwnRequest = {
  messageCid: string;
  messageType: string;
  author: string;
};

// TODO: fill out
// export type SendDwnResponse = {};