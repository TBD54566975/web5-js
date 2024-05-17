import type { RecordsReadReply, UnionMessageReply, EventSubscriptionHandler, RecordSubscriptionHandler } from '@tbd54566975/dwn-sdk-js';

export interface SerializableDwnMessage {
  toJSON(): string;
}

export type DwnSubscriptionHandler = EventSubscriptionHandler | RecordSubscriptionHandler;

/**
 * Interface for communicating with {@link https://github.com/TBD54566975/dwn-server | DWN Servers}
 * via JSON-RPC, supporting operations like sending DWN requests.
 */
export interface DwnRpc {
  /**
   * Lists the transport protocols supported by the DWN RPC client, such as HTTP or HTTPS.
   * @returns An array of strings representing the supported transport protocols.
   */
  get transportProtocols(): string[]

  /**
   * Sends a request to a DWN Server using the specified DWN RPC request parameters.
   *
   * @param request - The DWN RPC request containing the URL, target DID, message, and optional data.
   * @returns A promise that resolves to the response from the DWN server.
   */
  sendDwnRequest(request: DwnRpcRequest): Promise<DwnRpcResponse>
}


/**
 * Represents a JSON RPC request to a DWN server, including the URL, target DID, the message to be
 * processed, and optional data.
 */
export type DwnRpcRequest = {
  /** Optional data to be sent with the request. */
  data?: any;

  /** The URL of the DWN server to which the request is sent. */
  dwnUrl: string;

  /** The message to be processed by the DWN server, which can be a serializable DWN message. */
  message: SerializableDwnMessage | any;

  /** The DID of the target to which the message is addressed. */
  targetDid: string;

  /** Optional subscription handler for DWN events. */
  subscriptionHandler?: DwnSubscriptionHandler;
}

/**
 * Represents the JSON RPC response from a DWN server to a request, combining the results of various
 * DWN operations.
 */
export type DwnRpcResponse = UnionMessageReply & RecordsReadReply;