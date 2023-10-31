import type { Web5Agent } from '@web5/agent';

/**
 * The VC API is used to issue, present and verify VCs
 *
 * @beta
 */
export class VcApi {
  private agent: Web5Agent;
  private connectedDid: string;

  constructor(options: { agent: Web5Agent, connectedDid: string }) {
    this.agent = options.agent;
    this.connectedDid = options.connectedDid;
  }

  /**
   * Issues a VC (Not implemented yet)
   */
  async create() {
    // TODO: implement
    throw new Error('Not implemented.');
  }
}