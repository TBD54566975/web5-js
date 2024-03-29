import type { BearerIdentity, HdIdentityVault, Web5Agent } from '@web5/agent';

import { Web5UserAgent } from '@web5/user-agent';

import { VcApi } from './vc-api.js';
import { DwnApi } from './dwn-api.js';
import { DidApi } from './did-api.js';
import { getTechPreviewDwnEndpoints } from './tech-preview.js';

/** Override defaults configured during the technical preview phase. */
export type TechPreviewOptions = {
  /** Override default dwnEndpoints provided for technical preview. */
  dwnEndpoints?: string[];
}

/** Optional overrides that can be provided when calling {@link Web5.connect}. */
export type Web5ConnectOptions = {
  /**
   * Provide a {@link Web5Agent} implementation. Defaults to creating a local
   * {@link Web5UserAgent} if one isn't provided
   **/
  agent?: Web5Agent;

  /**
   * Provide an instance of a {@link HdIdentityVault} implementation. Defaults to
   * a LevelDB-backed store with an insecure, static unlock password if one
   * isn't provided. To allow the app user to enter a secure password of
   * their choosing, provide an initialized {@link HdIdentityVault} instance.
   **/
  agentVault?: HdIdentityVault;

  /** Specify an existing DID to connect to. */
  connectedDid?: string;

  /**
   * The Web5 app `password` is used to protect data on the device the application is running on.
   *
   * Only the end user should know this password: it should not be stored on the device or
   * transmitted over the network.
   *
   * This password is crucial for the security of an identity vault that stores the local Agent's
   * cryptographic keys and decentralized identifier (DID). The vault's content is encrypted using
   * the password, making it accessible only to those who know the password.
   *
   * App users should be advised to use a strong, unique passphrase that is not shared across
   * different services or applications. The password should be kept confidential and not be
   * exposed to unauthorized entities. Losing the password may result in irreversible loss of
   * access to the vault's contents.
   */
  password?: string;

  /**
   * The `recoveryPhrase` is a unique, secure key for recovering the identity vault.
   *
   * This phrase is a series of 12 words generated securely and known only to the user. It plays a
   * critical role in the security of the identity vault by enabling the recovery of the vault's
   * contents, including cryptographic keys and the Agent's decentralized identifier (DID), across
   * different devices or if the original device is compromised or lost.
   *
   * The recovery phrase is akin to a master key, as anyone with access to this phrase can restore
   * and access the vault's contents. It’s combined with the app `password` to encrypt the vault's
   * content.
   *
   * Unlike a password, the recovery phrase is not intended for regular use but as a secure backup
   * method for vault recovery. Losing this phrase can result in permanent loss of access to the
   * vault's contents, as it cannot be reset or retrieved if forgotten.
   *
   * Users should treat the recovery phrase with the highest level of security, ensuring it is
   * never shared, stored online, or exposed to potential threats. It is the user's responsibility
   * to keep this phrase safe to maintain the integrity and accessibility of their secured data. It
   * is recommended to write it down and store it in a secure location, separate from the device and
   * digital backups.
   */
  recoveryPhrase?: string;

  /**
   * Enable synchronization of DWN records between local and remote DWNs.
   * Sync defaults to running every 2 minutes and can be set to any value accepted by `ms()`.
   * To disable sync set to 'off'.
   */
  sync?: string;

  /**
   * Override defaults configured during the technical preview phase.
   * See {@link TechPreviewOptions} for available options.
   */
  techPreview?: TechPreviewOptions;
}

/**
 * Represents the result of the Web5 connection process, including the Web5 instance,
 * the connected decentralized identifier (DID), and optionally the recovery phrase used
 * during the agent's initialization.
 */
export type Web5ConnectResult = {
  /** The Web5 instance, providing access to the agent, DID, DWN, and VC APIs. */
  web5: Web5;

  /** The DID that has been connected or created during the connection process. */
  did: string;

  /**
   * The first time a Web5 agent is initialized, the recovery phrase that was used to generate the
   * agent's DID and keys is returned. This phrase can be used to recover the agent's vault contents
   * and should be stored securely by the user.
   */
  recoveryPhrase?: string;
};

/**
 * Parameters that are passed to Web5 constructor.
 *
 * @see {@link Web5ConnectOptions}
 */
export type Web5Params = {
  /**
   * A {@link Web5Agent} instance that handles DIDs, DWNs and VCs requests. The agent manages the
   * user keys and identities, and is responsible to sign and verify messages.
   */
  agent: Web5Agent;

  /** The DID of the tenant under which all DID, DWN, and VC requests are being performed. */
  connectedDid: string;
};

/**
 * The main Web5 API interface. It manages the creation of a DID if needed, the connection to the
 * local DWN and all the web5 main foundational APIs such as VC, syncing, etc.
 */
export class Web5 {
  /**
   * A {@link Web5Agent} instance that handles DIDs, DWNs and VCs requests. The agent manages the
   * user keys and identities, and is responsible to sign and verify messages.
   */
  agent: Web5Agent;

  /** Exposed instance to the DID APIs, allow users to create and resolve DIDs  */
  did: DidApi;

  /** Exposed instance to the DWN APIs, allow users to read/write records */
  dwn: DwnApi;

  /** Exposed instance to the VC APIs, allow users to issue, present and verify VCs */
  vc: VcApi;

  /** The DID of the tenant under which DID operations are being performed. */
  private connectedDid: string;

  constructor({ agent, connectedDid }: Web5Params) {
    this.agent = agent;
    this.connectedDid = connectedDid;
    this.did = new DidApi({ agent, connectedDid });
    this.dwn = new DwnApi({ agent, connectedDid });
    this.vc = new VcApi({ agent, connectedDid });
  }

  /**
   * Connects to a {@link Web5Agent}. Defaults to creating a local {@link Web5UserAgent} if one
   * isn't provided.
   *
   * @param options - Optional overrides that can be provided when calling {@link Web5.connect}.
   * @returns A promise that resolves to a {@link Web5} instance and the connected DID.
   */
  static async connect({
    agent, agentVault, connectedDid, password, recoveryPhrase, sync, techPreview
  }: Web5ConnectOptions = {}): Promise<Web5ConnectResult> {
    if (agent === undefined) {
      // A custom Web5Agent implementation was not specified, so use default managed user agent.
      const userAgent = await Web5UserAgent.create({ agentVault });
      agent = userAgent;

      // Warn the developer and application user of the security risks of using a static password.
      if (password === undefined) {
        password = 'insecure-static-phrase';
        console.warn(
          '%cSECURITY WARNING:%c ' +
          'You have not set a password, which defaults to a static, guessable value. ' +
          'This significantly compromises the security of your data. ' +
          'Please configure a secure, unique password.',
          'font-weight: bold; color: red;',
          'font-weight: normal; color: inherit;'
        );
      }

      // Initialize, if necessary, and start the agent.
      if (await userAgent.firstLaunch()) {
        recoveryPhrase = await userAgent.initialize({ password, recoveryPhrase });
      }
      await userAgent.start({ password });

      // TODO: Replace stubbed connection attempt once Connect Protocol has been implemented.
      // Attempt to Connect to localhost agent or via Connect Server.
      // userAgent.connect();

      const notConnected = true;
      if (/* !userAgent.isConnected() */ notConnected) {
        // Connect attempt failed or was rejected so fallback to local user agent.
        let identity: BearerIdentity;

        // Query the Agent's DWN tenant for identity records.
        const identities = await userAgent.identity.list();

        // If an existing identity is not found found, create a new one.
        const existingIdentityCount = identities.length;
        if (existingIdentityCount === 0) {
          // Use the specified DWN endpoints or get default tech preview hosted nodes.
          const serviceEndpointNodes = techPreview?.dwnEndpoints ?? await getTechPreviewDwnEndpoints();

          // Generate a new Identity for the end-user.
          identity = await userAgent.identity.create({
            didMethod  : 'dht',
            metadata   : { name: 'Default' },
            didOptions : {
              services: [
                {
                  id              : 'dwn',
                  type            : 'DecentralizedWebNode',
                  serviceEndpoint : serviceEndpointNodes,
                  enc             : '#enc',
                  sig             : '#sig',
                }
              ],
              verificationMethods: [
                {
                  algorithm : 'Ed25519',
                  id        : 'sig',
                  purposes  : ['assertionMethod', 'authentication']
                },
                {
                  algorithm : 'secp256k1',
                  id        : 'enc',
                  purposes  : ['keyAgreement']
                }
              ]
            }
          });

          // The User Agent will manage the Identity, which ensures it will be available on future
          // sessions.
          await userAgent.identity.manage({ portableIdentity: await identity.export() });

        } else if (existingIdentityCount === 1) {
          // An existing identity was found in the User Agent's tenant.
          identity = identities[0];

        } else {
          throw new Error(`connect() failed due to unexpected state: Expected 1 but found ${existingIdentityCount} stored identities.`);
        }

        // Set the stored identity as the connected DID.
        connectedDid = identity.did.uri;
      }

      // Enable sync, unless explicitly disabled.
      if (sync !== 'off') {
        // First, register the user identity for sync.
        await userAgent.sync.registerIdentity({ did: connectedDid });

        // Enable sync using the specified interval or default.
        sync ??= '2m';
        userAgent.sync.startSync({ interval: sync })
          .catch((error: any) => {
            console.error(`Sync failed: ${error}`);
          });
      }
    }

    const web5 = new Web5({ agent, connectedDid });

    return { web5, did: connectedDid, recoveryPhrase };
  }
}