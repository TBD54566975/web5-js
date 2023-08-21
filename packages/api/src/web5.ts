import type { AppDataStore, Web5Agent } from '@web5/agent';

import { Web5UserAgent } from '@web5/user-agent';

import { VcApi } from './vc-api.js';
import { DwnApi } from './dwn-api.js';
import { DidApi } from './did-api.js';
import { getTechPreviewDwnEndpoints } from './tech-preview.js';
import { DidIonMethod } from '@web5/dids';

/**
 * Override defaults configured during the technical preview phase.
 */
export type TechPreviewOptions = {
  // Override default dwnEndpoints provided for technical preview.
  dwnEndpoints?: string[];
}

/**
 * Optional overrides that can be provided when calling {@link Web5.connect}.
 */
export type Web5ConnectOptions = {
  /** Provide a {@link Web5Agent} implementation. Defaults to creating a local
   * {@link Web5UserAgent} if one isn't provided */
  agent?: Web5Agent;

  /** Specify an existing DID to connect to. */
  connectedDid?: string;

  /** Provide an instance of a {@link AppDataStore} implementation. Defaults to
   * a LevelDB-backed store with an insecure, static unlock passphrase if one
   * isn't provided. To allow the app user to enter a secure passphrase of
   * their choosing, provide an initialized {@link AppDataStore} instance. */
  appData?: AppDataStore;

  /** Override defaults configured during the technical preview phase.
   * See {@link TechPreviewOptions} for available options. */
  techPreview?: TechPreviewOptions;
}

/**
 * @see {@link Web5ConnectOptions}
 */
type Web5Options = {
  agent: Web5Agent;
  connectedDid: string;
};

export class Web5 {
  agent: Web5Agent;
  did: DidApi;
  dwn: DwnApi;
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
   * Connects to a {@link Web5Agent}. Defaults to creating a local {@link Web5UserAgent}
   * if one isn't provided.
   *
   * @param options - optional overrides
   * @returns
   */
  static async connect(options: Web5ConnectOptions = {}) {
    let { agent, appData, connectedDid, techPreview } = options;

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

        // If an existing identity is not found found, create a new one.
        if (identities.length === 0) {
          const serviceEndpointNodes = techPreview?.dwnEndpoints ?? await getTechPreviewDwnEndpoints();
          const didOptions = await DidIonMethod.generateDwnOptions({ serviceEndpointNodes });
          const identity = await userAgent.identityManager.create({
            name      : 'Default',
            didMethod : 'ion',
            didOptions,
            kms       : 'local'
          });
          connectedDid = identity.did;
        }
      }
    }

    const web5 = new Web5({ agent, connectedDid });

    return { web5, did: connectedDid };
  }
}