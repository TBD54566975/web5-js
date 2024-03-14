import type { DidCreateParams, DidMessageResult, DidResolveParams, ResponseStatus, Web5Agent } from '@web5/agent';

import { DidInterface } from '@web5/agent';

/**
 * Parameters for creating a DID, specifying the method, options for the DID method, and whether to
 * store the DID.
 *
 * @typeParam method - The DID method to use for creating the DID.
 * @typeParam options - Method-specific options for creating the DID.
 * @typeParam store - Indicates whether the newly created DID should be stored.
 */
export type DidCreateRequest = Pick<DidCreateParams, 'method' | 'options' | 'store'>;

/**
 * The response from a DID creation request, including the operation's status and, if successful,
 * the created DID.
 */
export type DidCreateResponse = ResponseStatus & {
  /** The result of the DID creation operation, containing the newly created DID, if successful */
  did?: DidMessageResult[DidInterface.Create];
};

/**
 * The response from resolving a DID, containing the DID Resolution Result.
 *
 * This type directly maps to the result of a DID resolution operation, providing detailed
 * information about the DID document, including any DID document metadata and DID resolution
 * metadata,
 */
export type DidResolveResponse = DidMessageResult[DidInterface.Resolve];

/**
 * The DID API is used to resolve DIDs.
 *
 * @beta
 */
export class DidApi {
  /**
   * Holds the instance of a {@link Web5Agent} that represents the current execution context for
   * the `DidApi`. This agent is used to process DID requests.
   */
  private agent: Web5Agent;

  /** The DID of the tenant under which DID operations are being performed. */
  private connectedDid: string;

  constructor(options: { agent: Web5Agent, connectedDid: string }) {
    this.agent = options.agent;
    this.connectedDid = options.connectedDid;
  }

  /**
   * Initiates the creation of a Decentralized Identifier (DID) using the specified method, options,
   * and storage preference.
   *
   * This method sends a request to the Web5 Agent to create a new DID based on the provided method,
   * with method-specific options. It also specifies whether the newly created DID should be stored.
   *
   * @param request - The request parameters for creating a DID, including the method, options, and
   *                  storage flag.
   * @returns A promise that resolves to a `DidCreateResponse`, which includes the operation's
   *          status and, if successful, the newly created DID.
   */
  public async create(request: DidCreateRequest): Promise<DidCreateResponse> {
    const { result, ...status } = await this.agent.processDidRequest({
      messageType   : DidInterface.Create,
      messageParams : { ...request }
    });

    return { did: result, ...status };
  }

  /**
   * Resolves a DID to a DID Resolution Result.
   *
   * @param didUri - The DID or DID URL to resolve.
   * @returns A promise that resolves to the DID Resolution Result.
   */
  public async resolve(
    didUri: DidResolveParams['didUri'], options?: DidResolveParams['options']
  ): Promise<DidResolveResponse> {
    const { result: didResolutionResult } = await this.agent.processDidRequest({
      messageParams : { didUri, options },
      messageType   : DidInterface.Resolve
    });

    return didResolutionResult;
  }
}