import type { Web5Agent } from '@web5/agent';
import type { ProtocolsConfigureMessage } from '@tbd54566975/dwn-sdk-js';

import { DwnInterface } from '@web5/agent';

/**
 * Represents metadata associated with a protocol, including the author and an optional message CID.
 */
export type ProtocolMetadata = {
  /** The author of the protocol. */
  author: string;

  /**
   * The Content Identifier (CID) of a ProtocolsConfigure message.
   *
   * This is an optional field, and is used by {@link Protocol.send}.
   */
  messageCid?: string;
};

/**
 * Encapsulates a DWN Protocol with its associated metadata and configuration.
 *
 * This class primarly exists to provide developers with a convenient way to configure/install
 * protocols on remote DWNs.
 */
export class Protocol {
  /** The Web5Agent instance used for network interactions. */
  private _agent: Web5Agent;

  /** The ProtocolsConfigureMessage containing the detailed configuration for the protocol. */
  private _metadata: ProtocolMetadata;

  /** Metadata associated with the protocol, including the author and optional message CID. */
  private _protocolsConfigureMessage: ProtocolsConfigureMessage;

  /**
   * Constructs a new instance of the Protocol class.
   *
   * @param agent - The Web5Agent instance used for network interactions.
   * @param protocolsConfigureMessage - The configuration message containing the protocol details.
   * @param metadata - Metadata associated with the protocol, including the author and optional message CID.
   */
  constructor(agent: Web5Agent, protocolsConfigureMessage: ProtocolsConfigureMessage, metadata: ProtocolMetadata) {
    this._agent = agent;
    this._metadata = metadata;
    this._protocolsConfigureMessage = protocolsConfigureMessage;
  }

  /**
   * Retrieves the protocol definition from the protocol's configuration message.
   * @returns The protocol definition.
   */
  get definition() {
    return this._protocolsConfigureMessage.descriptor.definition;
  }

  /**
   * Serializes the protocol's configuration message to JSON.
   * @returns The serialized JSON object of the protocol's configuration message.
   */
  toJSON() {
    return this._protocolsConfigureMessage;
  }

  /**
   * Sends the protocol configuration to a remote DWN identified by the target DID.
   *
   * @param target - The DID of the target DWN to which the protocol configuration will be installed.
   * @returns A promise that resolves to an object containing the status of the send operation.
   */
  async send(target: string) {
    const { reply } = await this._agent.sendDwnRequest({
      author      : this._metadata.author,
      messageCid  : this._metadata.messageCid,
      messageType : DwnInterface.ProtocolsConfigure,
      target      : target,
    });

    return { status: reply.status };
  }
}