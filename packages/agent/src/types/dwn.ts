import type { DidService } from '@web5/dids';
import type { Readable, RequireOnly } from '@web5/common';
import type {
  RecordsReadReply,
  RecordsQueryReply,
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
  RecordsSubscribeMessage,
  RecordsSubscribeOptions,
  RecordsSubscribeReply,
  MessageSubscriptionHandler,
  RecordSubscriptionHandler,
  MessagesQueryMessage,
  MessagesReadMessage,
  MessagesSubscribeMessage,
  MessagesQueryOptions,
  MessagesReadOptions,
  MessagesSubscribeOptions,
  MessagesQueryReply,
  MessagesReadReply,
  MessagesSubscribeReply,
} from '@tbd54566975/dwn-sdk-js';

import {
  RecordsRead,
  RecordsQuery,
  RecordsWrite,
  DwnMethodName,
  RecordsDelete,
  ProtocolsQuery,
  DwnInterfaceName,
  ProtocolsConfigure,
  RecordsSubscribe,
  MessagesQuery,
  MessagesRead,
  MessagesSubscribe,
} from '@tbd54566975/dwn-sdk-js';

/**
 * Represents a Decentralized Web Node (DWN) service in a DID Document.
 *
 * A DWN DID service is a specialized type of DID service with the `type` set to
 * `DecentralizedWebNode`. It includes specific properties `enc` and `sig` that are used to identify
 * the public keys that can be used to interact with the DID Subject. The values of these properties
 * are strings or arrays of strings containing one or more verification method `id` values present in
 * the same DID document. If the `enc` and/or `sig` properties are an array of strings, an entity
 * interacting with the DID subject is expected to use the verification methods in the order they
 * are listed.
 *
 * @example
 * ```ts
 * const service: DwnDidService = {
 *   id: 'did:example:123#dwn',
 *   type: 'DecentralizedWebNode',
 *   serviceEndpoint: 'https://dwn.tbddev.org/dwn0',
 *   enc: 'did:example:123#key-1',
 *   sig: 'did:example:123#key-2'
 * }
 * ```
 *
 * @see {@link https://identity.foundation/decentralized-web-node/spec/ | DIF Decentralized Web Node (DWN) Specification}
 */
export interface DwnDidService extends DidService {
  /**
   * One or more verification method `id` values that can be used to encrypt information
   * intended for the DID subject.
   */
  enc?: string | string[];

  /**
   * One or more verification method `id` values that will be used by the DID subject to sign data
   * or by another entity to verify signatures created by the DID subject.
   */
  sig: string | string[];
}

export enum DwnInterface {
  MessagesQuery       = DwnInterfaceName.Messages + DwnMethodName.Query,
  MessagesRead        = DwnInterfaceName.Messages + DwnMethodName.Read,
  MessagesSubscribe   = DwnInterfaceName.Messages + DwnMethodName.Subscribe,
  ProtocolsConfigure  = DwnInterfaceName.Protocols + DwnMethodName.Configure,
  ProtocolsQuery      = DwnInterfaceName.Protocols + DwnMethodName.Query,
  RecordsDelete       = DwnInterfaceName.Records + DwnMethodName.Delete,
  RecordsQuery        = DwnInterfaceName.Records + DwnMethodName.Query,
  RecordsRead         = DwnInterfaceName.Records + DwnMethodName.Read,
  RecordsSubscribe    = DwnInterfaceName.Records + DwnMethodName.Subscribe,
  RecordsWrite        = DwnInterfaceName.Records + DwnMethodName.Write
}

export interface DwnMessage {
  [DwnInterface.MessagesQuery]      : MessagesQueryMessage;
  [DwnInterface.MessagesRead]       : MessagesReadMessage;
  [DwnInterface.MessagesSubscribe]  : MessagesSubscribeMessage;
  [DwnInterface.ProtocolsConfigure] : ProtocolsConfigureMessage;
  [DwnInterface.ProtocolsQuery]     : ProtocolsQueryMessage;
  [DwnInterface.RecordsDelete]      : RecordsDeleteMessage;
  [DwnInterface.RecordsQuery]       : RecordsQueryMessage;
  [DwnInterface.RecordsRead]        : RecordsReadMessage;
  [DwnInterface.RecordsSubscribe]   : RecordsSubscribeMessage;
  [DwnInterface.RecordsWrite]       : RecordsWriteMessage;
}

export interface DwnMessageDescriptor {
  [DwnInterface.MessagesQuery]      : MessagesQueryMessage['descriptor'];
  [DwnInterface.MessagesRead]       : MessagesReadMessage['descriptor'];
  [DwnInterface.MessagesSubscribe]  : MessagesSubscribeMessage['descriptor'];
  [DwnInterface.ProtocolsConfigure] : ProtocolsConfigureMessage['descriptor'];
  [DwnInterface.ProtocolsQuery]     : ProtocolsQueryMessage['descriptor'];
  [DwnInterface.RecordsDelete]      : RecordsDeleteMessage['descriptor'];
  [DwnInterface.RecordsQuery]       : RecordsQueryMessage['descriptor'];
  [DwnInterface.RecordsRead]        : RecordsReadMessage['descriptor'];
  [DwnInterface.RecordsSubscribe]   : RecordsSubscribeMessage['descriptor'];
  [DwnInterface.RecordsWrite]       : RecordsWriteMessage['descriptor'];
}

export interface DwnMessageParams {
  [DwnInterface.MessagesQuery]      : RequireOnly<MessagesQueryOptions, 'filters'>;
  [DwnInterface.MessagesRead]       : RequireOnly<MessagesReadOptions, 'messageCid'>;
  [DwnInterface.MessagesSubscribe]  : Partial<MessagesSubscribeOptions>;
  [DwnInterface.ProtocolsConfigure] : RequireOnly<ProtocolsConfigureOptions, 'definition'>;
  [DwnInterface.ProtocolsQuery]     : ProtocolsQueryOptions;
  [DwnInterface.RecordsDelete]      : RequireOnly<RecordsDeleteOptions, 'recordId'>;
  [DwnInterface.RecordsQuery]       : RecordsQueryOptions;
  [DwnInterface.RecordsRead]        : RecordsReadOptions;
  [DwnInterface.RecordsSubscribe]   : RecordsSubscribeOptions;
  [DwnInterface.RecordsWrite]       : RecordsWriteOptions;
}

export interface DwnMessageReply {
  [DwnInterface.MessagesQuery]      : MessagesQueryReply;
  [DwnInterface.MessagesRead]       : MessagesReadReply;
  [DwnInterface.MessagesSubscribe]  : MessagesSubscribeReply;
  [DwnInterface.ProtocolsConfigure] : GenericMessageReply;
  [DwnInterface.ProtocolsQuery]     : ProtocolsQueryReply;
  [DwnInterface.RecordsDelete]      : GenericMessageReply;
  [DwnInterface.RecordsQuery]       : RecordsQueryReply;
  [DwnInterface.RecordsRead]        : RecordsReadReply;
  [DwnInterface.RecordsSubscribe]   : RecordsSubscribeReply;
  [DwnInterface.RecordsWrite]       : GenericMessageReply;
}

export interface MessageHandler {
  [DwnInterface.MessagesSubscribe]  : MessageSubscriptionHandler;
  [DwnInterface.RecordsSubscribe]   : RecordSubscriptionHandler;

  // define all of them individually as undefined
  [DwnInterface.MessagesQuery]      : undefined;
  [DwnInterface.MessagesRead]       : undefined;
  [DwnInterface.ProtocolsConfigure] : undefined;
  [DwnInterface.ProtocolsQuery]     : undefined;
  [DwnInterface.RecordsDelete]      : undefined;
  [DwnInterface.RecordsQuery]       : undefined;
  [DwnInterface.RecordsRead]        : undefined;
  [DwnInterface.RecordsWrite]       : undefined;
}

export type DwnRequest<T extends DwnInterface> = {
  author: string;
  target: string;
  messageType: T;
}

/**
 * Defines the structure for response status, including a status code and detail message.
 */
export type DwnResponseStatus = {
  /** Encapsulates the outcome of an operation, providing both a numeric status code and a descriptive message. */
  status: {
    /** Numeric status code representing the outcome of the operation. */
    code: number;

    /** Descriptive detail about the status or error. */
    detail: string;
  };
};

export type ProcessDwnRequest<T extends DwnInterface> = DwnRequest<T> & {
  dataStream?: Blob | ReadableStream | Readable;
  rawMessage?: DwnMessage[T];
  messageParams?: DwnMessageParams[T];
  store?: boolean;
  signAsOwner?: boolean;
  subscriptionHandler?: MessageHandler[T];
}

export type SendDwnRequest<T extends DwnInterface> = DwnRequest<T> & (ProcessDwnRequest<T> | { messageCid: string })

export type DwnResponse<T extends DwnInterface> = {
  message?: DwnMessage[T];
  messageCid: string;
  reply: DwnMessageReply[T];
}

export interface DwnMessageConstructor<T extends DwnInterface> {
  new (): DwnMessageInstance[T];
  create(params: DwnMessageParams[T]): Promise<DwnMessageInstance[T]>;
  parse(rawMessage: DwnMessage[T]): Promise<DwnMessageInstance[T]>;
}

export const dwnMessageConstructors: { [T in DwnInterface]: DwnMessageConstructor<T> } = {
  [DwnInterface.MessagesQuery]      : MessagesQuery as any,
  [DwnInterface.MessagesRead]       : MessagesRead as any,
  [DwnInterface.MessagesSubscribe]  : MessagesSubscribe as any,
  [DwnInterface.ProtocolsConfigure] : ProtocolsConfigure as any,
  [DwnInterface.ProtocolsQuery]     : ProtocolsQuery as any,
  [DwnInterface.RecordsDelete]      : RecordsDelete as any,
  [DwnInterface.RecordsQuery]       : RecordsQuery as any,
  [DwnInterface.RecordsRead]        : RecordsRead as any,
  [DwnInterface.RecordsSubscribe]   : RecordsSubscribe as any,
  [DwnInterface.RecordsWrite]       : RecordsWrite as any,
} as const;

export type DwnMessageConstructors = typeof dwnMessageConstructors;

export interface DwnMessageInstance {
  [DwnInterface.MessagesQuery]      : MessagesQuery;
  [DwnInterface.MessagesRead]       : MessagesRead;
  [DwnInterface.MessagesSubscribe]  : MessagesSubscribe;
  [DwnInterface.ProtocolsConfigure] : ProtocolsConfigure;
  [DwnInterface.ProtocolsQuery]     : ProtocolsQuery;
  [DwnInterface.RecordsDelete]      : RecordsDelete;
  [DwnInterface.RecordsQuery]       : RecordsQuery;
  [DwnInterface.RecordsRead]        : RecordsRead;
  [DwnInterface.RecordsSubscribe]   : RecordsSubscribe;
  [DwnInterface.RecordsWrite]       : RecordsWrite;
}

export type DwnMessageWithData<T extends DwnInterface> = {
  message: DwnMessage[T];
  dataStream?: Readable;
}

// The following types are exported by the DWN SDK and are re-exported here so that dependent
// packages do not need to import the DWN SDK directly. This ensures that downstream packages are
// always using the same version of the DWN SDK as the agent package.

export {
  DwnConstant,
  Signer as DwnSigner,
  DateSort as DwnDateSort,
  PublicJwk as DwnPublicKeyJwk, // TODO: Remove once DWN SDK switches to Jwk from @web5/crypto
  PaginationCursor as DwnPaginationCursor,
  MessageSubscriptionHandler as DwnMessageSubscriptionHandler,
  RecordSubscriptionHandler as DwnRecordSubscriptionHandler,
  MessageSubscription as DwnMessageSubscription,
  EncryptionAlgorithm as DwnEncryptionAlgorithm,
  KeyDerivationScheme as DwnKeyDerivationScheme,
  PermissionGrant as DwnPermissionGrant,
  PermissionRequest as DwnPermissionRequest,
  PermissionsProtocol as DwnPermissionsProtocol,
  ProtocolDefinition as DwnProtocolDefinition,
  RecordsPermissionScope as DwnRecordsPermissionScope,
} from '@tbd54566975/dwn-sdk-js';