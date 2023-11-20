import type { AppDataStore, Web5Agent } from '@web5/agent';

import ms from 'ms';
import { Web5UserAgent } from '@web5/user-agent';

import { VcApi } from './vc-api.js';
import { DwnApi } from './dwn-api.js';
import { DidApi } from './did-api.js';
import { getTechPreviewDwnEndpoints } from './tech-preview.js';
import { DidIonMethod } from '@web5/dids';

/**
 * Override defaults configured during the technical preview phase.
 *
 * @beta
 */
export type TechPreviewOptions = {
  // Override default dwnEndpoints provided for technical preview.
  dwnEndpoints?: string[];
}

/**
 * Optional overrides that can be provided when calling {@link Web5.connect}.
 *
 * @beta
 */
export type Web5ConnectOptions = {
  /**
   * Provide a {@link @web5/agent#Web5Agent} implementation. Defaults to creating a local
   * {@link @web5/user-agent#Web5UserAgent} if one isn't provided
   **/
  agent?: Web5Agent;

  /**
   * Provide an instance of a {@link @web5/agent#AppDataStore} implementation. Defaults to
   * a LevelDB-backed store with an insecure, static unlock passphrase if one
   * isn't provided. To allow the app user to enter a secure passphrase of
   * their choosing, provide an initialized {@link @web5/agent#AppDataStore} instance.
   **/
  appData?: AppDataStore;

  // Specify an existing DID to connect to.
  connectedDid?: string;

  /** Enable synchronization of DWN records between local and remote DWNs.
   * Sync defaults to running every 2 minutes and can be set to any value accepted by `ms()`.
   * To disable sync set to 'off'. */
  sync?: string;

  /** Override defaults configured during the technical preview phase.
   * See {@link TechPreviewOptions} for available options. */
  techPreview?: TechPreviewOptions;
}

/**
 * Options that are passed to Web5 constructor.
 *
 * @see {@link Web5ConnectOptions}
 * @beta
 */
type Web5Options = {
  agent: Web5Agent;
  connectedDid: string;
};

/**
 * The main Web5 API interface. It manages the creation of a DID if needed, the
 * connection to the local DWN and all the web5 main foundational APIs such as VC,
 * syncing, etc.
 *
 * @beta
 */
export class Web5 {
  /**
   * Web5 Agent knows how to handle DIDs, DWNs and VCs requests. The agent manages the
   * user keys and identities, and is responsible to sign and verify messages.
   */
  agent: Web5Agent;

  /** Exposed instance to the DID APIs, allow users to create and resolve DIDs  */
  did: DidApi;

  /** Exposed instance to the DWN APIs, allow users to read/write records */
  dwn: DwnApi;

  /** Exposed instance to the VC APIs, allow users to issue, present and verify VCs */
  vc: VcApi;

  private connectedDid: string;

  constructor(options: Web5Options) {
    const { agent, connectedDid } = options;
    this.agent = agent;
    this.connectedDid = connectedDid;
    this.did = new DidApi({ agent, connectedDid });
    this.dwn = new DwnApi({ agent, connectedDid });
    this.vc = new VcApi({ agent, connectedDid });
  }

  /**
   * Connects to a {@link @web5/agent#Web5Agent}. Defaults to creating a local {@link @web5/user-agent#Web5UserAgent}
   * if one isn't provided.
   *
   * @param options - optional overrides
   * @returns
   */
  static async connect(options: Web5ConnectOptions = {}) {
    let { agent, appData, connectedDid, sync, techPreview } = options;

    if (agent === undefined) {
      // A custom Web5Agent implementation was not specified, so use default managed user agent.
      const userAgent = await Web5UserAgent.create({ appData });
      agent = userAgent;

      // Start the agent.
      await userAgent.start({ passphrase: 'insecure-static-phrase' });

      // TODO: Replace stubbed connection attempt once Connect Protocol has been implemented.
      // Attempt to Connect to localhost agent or via Connect Server.
      // userAgent.connect();

      const notConnected = true;
      if (/* !userAgent.isConnected() */ notConnected) {
        // Connect attempt failed or was rejected so fallback to local user agent.

        // Query the Agent's DWN tenant for identity records.
        const identities = await userAgent.identityManager.list();
        const storedIdentities = identities.length;

        // If an existing identity is not found found, create a new one.
        if (storedIdentities === 0) {
          // Use the specified DWN endpoints or get default tech preview hosted nodes.
          const serviceEndpointNodes = techPreview?.dwnEndpoints ?? await getTechPreviewDwnEndpoints();
          // Generate ION DID service and key set.
          const didOptions = await DidIonMethod.generateDwnOptions({ serviceEndpointNodes });
          // Generate a new Identity for the end-user.
          const identity = await userAgent.identityManager.create({
            name      : 'Default',
            didMethod : 'ion',
            didOptions,
            kms       : 'local'
          });
          /** Import the Identity metadata to the User Agent's tenant so that it can be restored
           * on subsequent launches or page reloads. */
          await userAgent.identityManager.import({ identity, context: userAgent.agentDid });
          // Set the newly created identity as the connected DID.
          connectedDid = identity.did;

        } else if (storedIdentities === 1) {
          // An existing identity was found in the User Agent's tenant.
          const [ identity ] = identities;
          // Set the stored identity as the connected DID.
          connectedDid = identity.did;
        } else {
          throw new Error(`connect() failed due to unexpected state: ${storedIdentities} stored identities`);
        }
      }

      // Enable sync, unless disabled.
      if (sync !== 'off') {
        // First, register the user identity for sync.
        await userAgent.syncManager.registerIdentity({ did: connectedDid });

        // Enable sync using the specified interval or default.
        sync ??= '2m';
        userAgent.syncManager.startSync({ interval: ms(sync) })
          .catch((error: any) => {
            console.error(`Sync failed: ${error}`);
          });
      }
    }

    const web5 = new Web5({ agent, connectedDid });

    return { web5, did: connectedDid };
  }
}