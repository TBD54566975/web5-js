import type { ProtocolsConfigure, SubscriptionRequest } from '@tbd54566975/dwn-sdk-js';

import type { Web5Agent } from '@web5/agent';

export type SubscriptionRequestMessage = SubscriptionRequest['message'];
type SubscriptionMetadata = {
  author: string;
  messageCid?: string;
};

export class Subscription {
  private _agent: Web5Agent;
  private _metadata: SubscriptionMetadata;
  private _subscriptionRequestMessage: SubscriptionRequestMessage;

  get definition() {
    return this._subscriptionRequestMessage.descriptor.definition;
  }

  constructor(agent: Web5Agent, subscriptionRequestMessage: SubscriptionRequestMessage, metadata: SubscriptionMetadata) {
    this._agent = agent;
    this._metadata = metadata;
    this._subscriptionRequestMessage = subscriptionRequestMessage;
  }

  toJSON() {
    return this._subscriptionRequestMessage;
  }

  async send(target: string) {
    const { reply } = await this._agent.sendDwnRequest({
      author      : this._metadata.author,
      messageCid  : this._metadata.messageCid,
      messageType : 'subscriptionRequest',
      target      : target,
    });

    return { status: reply.status };
  }
}