import type { Web5Agent } from '@web5/agent';
import type { ProtocolsConfigure } from '@tbd54566975/dwn-sdk-js';

// TODO: export ProtocolsConfigureMessage from dwn-sdk-js
/**
 * The protocol configure message carries the protocol definition and is used
 * to setup the protocol.
 *
 * @beta
 */
export type ProtocolsConfigureMessage = ProtocolsConfigure['message'];

/**
 * Metadata of the protocol
 *
 * @beta
 */
type ProtocolMetadata = {
  author: string;
  messageCid?: string;
};

/**
 * The Protocol API abstraction class. It's used to represent and retrieve a protocol and
 * also to install (send) protocols to other DIDs.
 *
 * @beta
 */
export class Protocol {
  private _agent: Web5Agent;
  private _metadata: ProtocolMetadata;
  private _protocolsConfigureMessage: ProtocolsConfigureMessage;

  /**
   * The protocol definition: types, structure and publish status
   */
  get definition() {
    return this._protocolsConfigureMessage.descriptor.definition;
  }

  constructor(agent: Web5Agent, protocolsConfigureMessage: ProtocolsConfigureMessage, metadata: ProtocolMetadata) {
    this._agent = agent;
    this._metadata = metadata;
    this._protocolsConfigureMessage = protocolsConfigureMessage;
  }

  /**
   * Returns the protocol as a JSON object.
   */
  toJSON() {
    return this._protocolsConfigureMessage;
  }

  /**
   * Sends the protocol to a remote DWN by specifying their DID
   * @param target - the DID to send the protocol to
   * @returns the status of the send protocols request
   */
  async send(target: string) {
    const { reply } = await this._agent.sendDwnRequest({
      author      : this._metadata.author,
      messageCid  : this._metadata.messageCid,
      messageType : 'ProtocolsConfigure',
      target      : target,
    });

    return { status: reply.status };
  }
}