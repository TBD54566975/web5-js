import type { Readable } from 'readable-stream';
import type { MessageReply } from '@tbd54566975/dwn-sdk-js';

export interface Web5Agent {
  processDwnRequest(message: DwnRequest): Promise<DwnResponse>
}

export type DwnRequest = {
  author: string;
  dataStream?: Readable;
  messageType: string;
  messageOptions: unknown;
  target: string;
}

export type DwnResponse = {
  reply: MessageReply;
  message?: unknown;
};