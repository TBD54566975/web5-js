import type { Web5Agent } from '@web5/agent';

export class VcApi {
  private agent: Web5Agent;
  private connectedDid: string;

  constructor(options: { agent: Web5Agent, connectedDid: string }) {
    this.agent = options.agent;
    this.connectedDid = options.connectedDid;
  }

  async create() {
    // TODO: implement
    throw new Error('Not implemented.');
  }
}