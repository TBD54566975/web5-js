import type { Web5Agent } from '@web5/agent';
import type { DidResolutionOptions, DidResolutionResult } from '@web5/dids';

import { DidMessage } from '@web5/agent';

/**
 * The DID API is used to resolve DIDs.
 *
 * @beta
 */
export class DidApi {
  private agent: Web5Agent;
  private connectedDid: string;

  constructor(options: { agent: Web5Agent, connectedDid: string }) {
    this.agent = options.agent;
    this.connectedDid = options.connectedDid;
  }

  /**
   * Resolves a DID to a DID Resolution Result.
   *
   * @param didUrl - The DID or DID URL to resolve.
   * @returns A promise that resolves to the DID Resolution Result.
   */
  async resolve(didUrl: string, resolutionOptions?: DidResolutionOptions): Promise<DidResolutionResult> {
    const agentResponse = await this.agent.processDidRequest({
      messageOptions : { didUrl, resolutionOptions },
      messageType    : DidMessage.Resolve
    });

    const { result } = agentResponse;

    return result as DidResolutionResult;
  }
}