import type { Web5Agent } from '@tbd54566975/web5-agent';
import type { ProtocolsConfigure } from '@tbd54566975/dwn-sdk-js';

// TODO: export ProtocolsConfigureMessage from dwn-sdk-js
export type ProtocolsConfigureMessage = ProtocolsConfigure['message'];
type ProtocolMetadata = {
  author: string;
  messageCid: string;
};

export class Protocol {
  #metadata: ProtocolMetadata;
  #web5Agent: Web5Agent;
  #protocolsConfigureMessage: ProtocolsConfigureMessage;

  constructor(web5Agent: Web5Agent, protocolsConfigureMessage: ProtocolsConfigureMessage, metadata: ProtocolMetadata) {
    this.#metadata = metadata;
    this.#web5Agent = web5Agent;
    this.#protocolsConfigureMessage = protocolsConfigureMessage;
  }

  toJSON() {
    return this.#protocolsConfigureMessage;
  }

  async send() {
    const { reply } = await this.#web5Agent.sendDwnRequest({
      messageType : 'ProtocolsConfigure',
      author      : this.#metadata.author,
      target      : this.#metadata.author,
      messageCid  : this.#metadata.messageCid
    });

    return { status: reply.status };
  }
}