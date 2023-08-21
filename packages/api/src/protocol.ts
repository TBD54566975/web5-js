import type { Web5Agent } from '@web5/agent';
import type { ProtocolsConfigure } from '@tbd54566975/dwn-sdk-js';

// TODO: export ProtocolsConfigureMessage from dwn-sdk-js
export type ProtocolsConfigureMessage = ProtocolsConfigure['message'];
type ProtocolMetadata = {
  author: string;
  messageCid?: string;
};

export class Protocol {
  private _agent: Web5Agent;
  private _metadata: ProtocolMetadata;
  private _protocolsConfigureMessage: ProtocolsConfigureMessage;

  get definition() {
    return this._protocolsConfigureMessage.descriptor.definition;
  }

  constructor(agent: Web5Agent, protocolsConfigureMessage: ProtocolsConfigureMessage, metadata: ProtocolMetadata) {
    this._agent = agent;
    this._metadata = metadata;
    this._protocolsConfigureMessage = protocolsConfigureMessage;
  }

  toJSON() {
    return this._protocolsConfigureMessage;
  }

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