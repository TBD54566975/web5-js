import type { Web5Agent } from '@web5/agent';

/**
 * The VC API is used to issue, present and verify VCs
 *
 * @beta
 */
export class VcApi {
  /**
   * Holds the instance of a {@link Web5Agent} that represents the current execution context for
   * the `VcApi`. This agent is used to process VC requests.
   */
  private agent: Web5Agent;

  /** The DID of the tenant under which DID operations are being performed. */
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