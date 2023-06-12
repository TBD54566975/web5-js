import type { Web5Agent } from '@tbd54566975/web5-agent';

export class VcApi {
  #agent: Web5Agent;
  #connectedDid: string;

  constructor(agent: Web5Agent, connectedDid: string) {
    this.#agent = agent;
    this.#connectedDid = connectedDid;
  }

  async create() {
    // TODO: implement
    throw new Error('Not implemented.');
  }
}