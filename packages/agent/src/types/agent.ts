import type { BearerDid } from '@web5/dids';

import type { Web5Rpc } from '../rpc-client.js';
import type { AgentDwnApi } from '../dwn-api.js';
import type { AgentSyncApi } from '../sync-api.js';
import type { AgentCryptoApi } from '../crypto-api.js';
import type { AgentKeyManager } from './key-manager.js';
import type { IdentityVault } from './identity-vault.js';
import type { AgentIdentityApi } from '../identity-api.js';
import type { ProcessVcRequest, SendVcRequest, VcResponse } from './vc.js';
import type { AgentDidApi, DidInterface, DidRequest, DidResponse } from '../did-api.js';
import type { DwnInterface, DwnResponse, ProcessDwnRequest, SendDwnRequest } from './dwn.js';


/**
 * Defines the structure for response status in the context of an Agent's interaction within the
 * Web5 framework.
 *
 * This type is utilized to convey the success or failure of an operation performed by the Agent,
 * providing feedback that can be programmatically interpreted and acted upon.
 *
 * This standardized response structure ensures a consistent interface for handling operation
 * outcomes, enabling clear communication of success or error states along with actionable insights
 * when necessary.
 */
export type ResponseStatus = {
  /**
   * A boolean value indicating the overall success (`true`) or failure (`false`) of the operation.
   * - `true`: Indicates that the operation was successful without errors.
   * - `false`: Indicates that the operation failed, with the error details provided in the `status`
   *            object.
   */
  ok: boolean;

  status: {
    /**
     * A numerical code representing the specific outcome of the operation.
     *
     * This can be aligned with standard HTTP status codes for web-based operations or custom codes
     * for specific business logic.
     */
    code: number;

    /**
     * A descriptive message corresponding to the status code that provides additional information
     * about the operation's result.
     *
     * This message is particularly useful for logging, debugging, or displaying contextual messages
     * to the end-user, offering insights into why an operation succeeded or failed.
     */
    message: string;
  };
};

/**
 * Defines the interface for a Web5 Agent, encapsulating the core functionality all implementations
 * must include.
 *
 * The Agent is responsible for handling decentralized identifier (DID) requests, decentralized web
 * node (DWN) requests, and verifiable credential (VC) requests.
 *
 * The `AgentDid` property represents the Web5 Agent's own DID, while the various process and send
 * methods enable the Agent to handle and initiate requests pertaining to DIDs, DWNs, and VCs.
 */
export interface Web5Agent {
  /**
   * The Decentralized Identifier (DID) of this Web5 Agent.
   */
  agentDid: BearerDid;

  /**
   * Processes a DID request, handling it internally within the agent and returning a DID response,
   * typically involving operations like DID creation or resolution.
   */
  processDidRequest<T extends DidInterface>(request: DidRequest<T>): Promise<DidResponse<T>>

  /**
   * Sends a DID request to another entity or service, expecting a DID response, often used for
   * interactions involving DIDs occurring over a network or between different agents.
   */
  sendDidRequest<T extends DidInterface>(request: DidRequest<T>): Promise<DidResponse<T>>;

  /**
   * Processes a request related to a Decentralized Web Node (DWN) and returns a corresponding
   * response.
   */
  processDwnRequest<T extends DwnInterface>(request: ProcessDwnRequest<T>): Promise<DwnResponse<T>>

  /**
   * Sends a request to a Decentralized Web Node (DWN) and awaits a response, often used for
   * interactions involving DWNs occurring over a network or between different agents.
   */
  sendDwnRequest<T extends DwnInterface>(request: SendDwnRequest<T>): Promise<DwnResponse<T>>;

  /**
   * Processes a request for handling Verifiable Credentials (VCs), such as issuing or verifying
   * them, and returns a response indicating the outcome.
   */
  processVcRequest(request: ProcessVcRequest): Promise<VcResponse>

  /**
   * Sends a request to issue, verify, or manage Verifiable Credentials (VCs), expecting a response
   * that indicates the result of the operation. This method is often used for interactions
   * involving VCs occurring over a network or between different agents.
   */
  sendVcRequest(request: SendVcRequest): Promise<VcResponse>;
}

/**
 * Represents a Web5 Platform Agent, an extended and more feature-rich implementation of a
 * {@link Web5Agent}.
 *
 * This Agent integrates a comprehensive set of APIs and functionalities, including cryptographic
 * operations, DID management, DWN interaction, identity handling, and data synchronization.
 *
 * The platform agent provides a higher-level abstraction over the core Web5Agent functionalities,
 * facilitating a robust platform for developing Web5 applications. It includes lifecycle management
 * methods like initialization and startup, alongside a suite of specialized APIs and utilities.
 *
 * @typeParam TKeyManager - The type of Key Manager used to manage cryptographic keys.
 */
export interface Web5PlatformAgent<TKeyManager extends AgentKeyManager = AgentKeyManager> extends Web5Agent {
  /**
   * The cryptography API, essential for performing various cryptographic operations such
   * as encryption, decryption, signing, and verification, ensuring secure data handling and
   * communication within the Web5 Platform.
   */
  crypto: AgentCryptoApi;

  /**
   * The DID API, responsible for managing all DID-related functionalities, enabling the agent to
   * create, resolve, update, and manage DIDs.
   */
  did: AgentDidApi<TKeyManager>;

  /**
   * The DWN API, enabling the Agent to interact with Decentralized Web Nodes (DWNs) and handle
   * requests from Web5 applications.
   */
  dwn: AgentDwnApi;

  /**
   * The identity management API, handling identity-related operations and allowing the agent to
   * manage Web5 identities, supporting operations like identity creation and update.
   */
  identity: AgentIdentityApi<TKeyManager>;

  /**
   * The Key Manager instance, central to the agent's cryptographic operations, managing key
   * generation, storage, retrieval, and usage, ensuring secure cryptographic practices.
   */
  keyManager: TKeyManager;

  /**
   * The RPC (Remote Procedure Call) client interface, facilitating communication with other Web5
   * Agents and services.
   */
  rpc: Web5Rpc;

  /**
   * The synchronization API, responsible for managing the consistency and real-time update of the
   * agent's data with the state of the distributed network.
   */
  sync: AgentSyncApi;

  /**
   * An instance of {@link IdentityVault}, providing secure storage and management of a Web5 Agent's
   * DID and cryptographic keys.
   */
  vault: IdentityVault;

  /**
   * Determines if it's the first time the Agent is being launched, typically used for initialization
   * checks or first-time setup routines.
   */
  firstLaunch(): Promise<boolean>;

  /**
   * Initializes the agent with essential parameters (e.g., a passphrase) and prepares it for
   * processing Web5 requests.
   */
  initialize(params: unknown): Promise<unknown>;

  /**
   * Starts the agent with the provided parameters, typically following initialization, to begin
   * normal operation and readiness to process requests.
   */
  start(params: unknown): Promise<unknown>;
}