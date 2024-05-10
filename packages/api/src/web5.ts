import type { AppDataStore, Maybe, Web5Agent, Web5ManagedAgent } from '@web5/agent';

import ms from 'ms';
import { Web5UserAgent } from '@web5/user-agent';
import { utils as cryptoUtils } from '@web5/crypto';

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

  /** Provide an instance of a {@link AppDataStore} implementation. Defaults to
   * a LevelDB-backed store with an insecure, static unlock passphrase if one
   * isn't provided. To allow the app user to enter a secure passphrase of
   * their choosing, provide an initialized {@link AppDataStore} instance. */
  appData?: AppDataStore;

  /** Enable synchronization of DWN records between local and remote DWNs.
   * Sync defaults to running every 2 minutes and can be set to any value accepted by `ms()`.
   * To disable sync set to 'off'. */
  sync?: string;

  /** Override defaults configured during the technical preview phase.
   * See {@link TechPreviewOptions} for available options. */
  techPreview?: TechPreviewOptions;

  appDid?: string;
  connectEndpoint?: string;
  origin?: string;
  passphrase?: string;
  permissionsRequests?: Record<string, unknown>[];
}

/**
 * @see {@link Web5ConnectOptions}
 */
type Web5Options = {
  agent: Web5Agent;
  appDid?: string;
  origin?: string;
};

// export class Web5 {
//   agent: Web5Agent;
//   did: DidApi;
//   dwn: DwnApi;
//   vc: VcApi;
//   private connectedDid: string;

//   constructor(options: Web5Options) {
//     const { agent, connectedDid } = options;
//     this.agent = agent;
//     this.connectedDid = connectedDid;
//     this.did = new DidApi({ agent, connectedDid });
//     this.dwn = new DwnApi({ agent, connectedDid });
//     this.vc = new VcApi({ agent, connectedDid });
//   }

//   /**
//    * Connects to a {@link Web5Agent}. Defaults to creating a local {@link Web5UserAgent}
//    * if one isn't provided.
//    *
//    * @param options - optional overrides
//    * @returns
//    */
//   static async connect(options: Web5ConnectOptions = {}) {
//     let { agent, appData, connectedDid, sync, techPreview } = options;

//     if (agent === undefined) {
//       // A custom Web5Agent implementation was not specified, so use default managed user agent.
//       const userAgent = await Web5UserAgent.create({ appData });
//       agent = userAgent;

//       // Start the agent.
//       await userAgent.start({ passphrase: 'insecure-static-phrase' });

//       // TODO: Replace stubbed connection attempt once Connect Protocol has been implemented.
//       // Attempt to Connect to localhost agent or via Connect Server.
//       // userAgent.connect();

//       const notConnected = true;
//       if (/* !userAgent.isConnected() */ notConnected) {
//         // Connect attempt failed or was rejected so fallback to local user agent.

//         // Query the Agent's DWN tenant for identity records.
//         const identities = await userAgent.identityManager.list();
//         const storedIdentities = identities.length;

//         // If an existing identity is not found found, create a new one.
//         if (storedIdentities === 0) {
//           // Use the specified DWN endpoints or get default tech preview hosted nodes.
//           const serviceEndpointNodes = techPreview?.dwnEndpoints ?? await getTechPreviewDwnEndpoints();
//           // Generate ION DID service and key set.
//           const didOptions = await DidIonMethod.generateDwnOptions({ serviceEndpointNodes });
//           // Generate a new Identity for the end-user.
//           const identity = await userAgent.identityManager.create({
//             name      : 'Default',
//             didMethod : 'ion',
//             didOptions,
//             kms       : 'local'
//           });
//           /** Import the Identity metadata to the User Agent's tenant so that it can be restored
//            * on subsequent launches or page reloads. */
//           await userAgent.identityManager.import({ identity, context: userAgent.agentDid });
//           // Set the newly created identity as the connected DID.
//           connectedDid = identity.did;

//         } else if (storedIdentities === 1) {
//           // An existing identity was found in the User Agent's tenant.
//           const [ identity ] = identities;
//           // Set the stored identity as the connected DID.
//           connectedDid = identity.did;
//         } else {
//           throw new Error('connect() failed due to unexpected state: ${storedIdentities} stored identities');
//         }
//       }

//       // Enable sync, unless disabled.
//       if (sync !== 'off') {
//         // First, register the user identity for sync.
//         await userAgent.syncManager.registerIdentity({ did: connectedDid });

//         // Enable sync using the specified interval or default.
//         sync ??= '2m';
//         userAgent.syncManager.startSync({ interval: ms(sync) })
//           .catch((error: any) => {
//             console.error(`Sync failed: ${error}`);
//           });
//       }
//     }

//     const web5 = new Web5({ agent, connectedDid });

//     return { web5, did: connectedDid };
//   }
// }


import type { ConnectState } from '@web5/agent';
import { ConnectPhase, ConnectProtocol, EventEmitter } from '@web5/agent';


export class Web5 {
  agent: Web5Agent;
  appDid: string;
  did: DidApi;
  dwn: DwnApi;
  session: SessionApi;
  vc: VcApi;

  private origin: string;

  constructor(options: Web5Options) {
    const { agent, appDid, origin } = options;

    this.agent = agent;
    this.origin = origin ?? cryptoUtils.randomUuid();
    this.session = new SessionApi({ agent });
    this.setAppDid({ did: appDid ?? '' });
  }

  static async connect({
    agent, appData, appDid, connectEndpoint, origin, passphrase, permissionsRequests, sync, techPreview
  }: Web5ConnectOptions): Promise<{ web5: Web5 }> {
    if (agent === undefined) {
      // A custom Web5Agent implementation was not specified, so use a default managed user agent.
      const userAgent = await Web5UserAgent.create({ appData });
      agent = userAgent;

      // Start the agent using the specified passphrase or a static default.
      await userAgent.start({ passphrase });
    }

    // Initialize the Web5 instance.
    const web5 = new Web5({ agent, origin });

    // Attempt to restore existing authorized sessions.
    web5.session
      .list()
      .then(sessions => sessions.filter(s => s.state === SessionState.Authorized))
      .then(authorizedSessions => {
        // If there are any authorized sessions, prompt the user to select which one to use.
        if (authorizedSessions.length) {
          console.log(`Found ${authorizedSessions.length} authorized sessions.`);
          const sessionDids = authorizedSessions.map(session => session.did);

          setTimeout(() => {
            console.log('Emitted chooseIdentity event');
            const useIdentity = web5.setAppDid.bind(web5);
            web5.session.emit('chooseIdentity', { identities: sessionDids, useIdentity });
          }, 200);
        }

        /** If there are no authorized sessions, prompt the user to Connect to an Identity Provider
         * or create a local Identity. */
        const dataStore = new LevelStore('DATA/AGENT/TEMP_CONNECT'); // ! TODO: Replace with AppDataStore.
        const connectToIdentityProvider = initiateConnectProtocol({
          connectEndpoint,
          dataStore,
          origin: web5.origin,
          permissionsRequests,
          web5
        });
        const useLocalIdentity = createLocalIdentity({ techPreview, web5 });
        web5.session.emit('chooseIdentitySource', { connectToIdentityProvider, useLocalIdentity });
      });

    // web5.session.initialize({ did: 'did:ion:alice', delegate: 'did:key:alice-dignal' })
    //   .then(() => console.log('Initializing new session:', 'did:ion:alice'));

    // web5.session.authorize({ did: 'did:ion:alice' })
    //   .then(() => console.log('Authorizing session:', 'did:ion:alice'));

    // web5.session.initialize({ did: 'did:ion:bob', delegate: 'did:key:bob-dignal' })
    //   .then(() => console.log('Initializing new session:', 'did:ion:bob'));

    // web5.session.authorize({ did: 'did:ion:bob' })
    //   .then(() => console.log('Authorizing session:', 'did:ion:bob'));

    // web5.session.clear();

    return {
      web5
    };
  }

  public setAppDid({ did }: { did: string }) {
    this.appDid = did;
    console.log(`Set App DID to: '${this.appDid}'`);
    this.did = new DidApi({ agent: this.agent, connectedDid: did });
    this.dwn = new DwnApi({ agent: this.agent, connectedDid: did });
    this.vc = new VcApi({ agent: this.agent, connectedDid: did });
  }
}




const initiateConnectProtocol = ({ connectEndpoint, dataStore, origin, permissionsRequests, web5 }: {
  connectEndpoint: string,
  dataStore: KeyValueStore<string, string>,
  origin: string,
  permissionsRequests: Record<string, unknown>[],
  web5: Web5
}): () => Promise<void> => {
  return async function () {
    console.log('Connecting to IDP');

    // First attempt to restore the Connect Protocol state from local storage.
    let connectState: { phase: ConnectPhase, handshakeState: HandshakeState } | undefined;
    try {
      connectState = JSON.parse(await dataStore.get('connectState'));
      console.log('Restored Connect Protocol state from local storage.');
    } catch (error) {
      if (error.notFound) { /* Do not throw error if key could not be found. */ }
    }

    // Create a new Connect Protocol instance, restoring the prior state, if any.
    const connect = new ConnectProtocol({ ...connectState });

    // Initiate the Connect Protocol process.
    const client = await connect.createClient({
      connectEndpoint,
      origin,
      delegationGrantRequest: { permissionsRequests }
    });

    // Listen for 'checkpoint' events emitted by the Connect Protocol client.
    client.on('checkpoint', async ({ handshakeState, phase }) => {
      console.log('got checkpoint in web5');
      await dataStore.set('connectState', JSON.stringify({ handshakeState, phase}));
    });

    // Listen for 'connectLink' events emitted by the Connect Protocol client.
    client.on('connectLink', async ({ connectLink }) => {
      console.log('got connect link in web5');
      /** If the Identity Provider is directly connected on localhost,
           * trigger the app registered to handle the `web5://` URL scheme. */
      // ! TODO: Implement triggering the custom URL scheme handler.

      // Store the Connect Link in the data store.
      // ! TODO: Update the local connect state with the Connect Link.

      // Emit a 'connectLink' event to signal to the application that the Connect Link is ready.
      web5.session.emit('connectLink', { connectLink });
    });

    // Listen for 'challenge' events emitted by the Connect Protocol client.
    client.on('challenge', async ({ validatePin }) => {
      web5.session.emit('challenge', { validatePin });
    });

    // Listen for 'connected' events emitted by the Connect Protocol client.
    client.on('connected', async ({ grants }) => {
      web5.session.emit('connected', { grants });
      console.log('Cleaning up Connect Protocol state.');
      await dataStore.clear();
    });

    // Listen for 'done' events emitted by the Connect Protocol client.
    client.on('done', async () => {
      web5.session.emit('done', undefined);
      console.log('Cleaning up Connect Protocol state.');
      await dataStore.clear();
    });
  };
};

export const createLocalIdentity = ({ techPreview, web5 }: {
  techPreview: TechPreviewOptions,
  web5: Web5
}): () => Promise<void> => {
  return async function () {
    // Use the specified DWN endpoints or get default tech preview hosted nodes.
    const serviceEndpointNodes = techPreview?.dwnEndpoints ?? await getTechPreviewDwnEndpoints();

    // Generate ION DID service and key set.
    const didOptions = await DidIonMethod.generateDwnOptions({ serviceEndpointNodes });

    // Generate a new Identity for the end-user.
    const identity = await (web5.agent as Web5ManagedAgent).identityManager.create({
      name       : 'Default',
      didMethod  : 'ion',
      didOptions : didOptions,
      kms        : 'local'
    });

    /** Import the Identity metadata to the User Agent's tenant so that it can be restored
      * on subsequent launches or page reloads. */
    await (web5.agent as Web5ManagedAgent).identityManager.import({
      identity : identity,
      context  : (web5.agent as Web5ManagedAgent).agentDid
    });

    // Create a new authorized session for the newly created Identity.
    await web5.session.initialize({ did: identity.did });
    await web5.session.authorize({ did: identity.did });

    // Set the newly created identity as the App DID.
    web5.setAppDid({ did: identity.did });

    // Emit an 'authorized' event to signal to the application that the session is ready.
    web5.session.emit('authorized', { appDid: identity.did });
  };
};


/**************************************************************************************************
 * SESSION API
 **************************************************************************************************/




export const SessionState = {
  // Initialized: The session has been created but has not yet been authorized.
  Initialized : 'Initialized',
  // Authorized: The session has been authorized and can be used to access resources.
  Authorized  : 'Authorized',
  // Revoked: The session has been revoked and can no longer be used to access resources.
  Revoked     : 'Revoked',
  // Expired: The session has expired and can no longer be used to access resources.
  Expired     : 'Expired',
  // Error: An error occurred while creating or using the session.
  Error       : 'Error'
} as const;

export type Session = {
  delegate?: string;
  did: string;
  delegationGrants?: string[];
  state: keyof typeof SessionState;
}


export interface SessionEvents {
  'authorized': {
    appDid: string;
  };

  'chooseIdentity': {
    identities: string[];
    useIdentity: ({ did }: { did: string }) => void;
  };

  'chooseIdentitySource': {
    connectToIdentityProvider: ({ web5 }: {
      web5: Web5
    }) => Promise<void>;

    useLocalIdentity: ({ techPreview, web5 }: {
      techPreview: TechPreviewOptions,
      web5: Web5
    }) => Promise<void>;
  };

  'connectLink': {
    connectLink: string;
  }

  'challenge': {
    validatePin: ({ pin }: { pin: string }) => Promise<void>;
  };

  'connected': {
    grants: AuthorizationResponse[];
  };

  'error': {
    message: string
  };

  'done': undefined;
}

/**
 * SessionStore
 *
 * This interface should be implemented to provide platform specific
 * implementations that are usable by {@link Session}.
 *
 * @public
 */
export interface SessionStore<K, V> {
  clearSessions(options: { context: K }): Promise<void>;
  deleteSession(options: { context: K, did: string }): Promise<boolean>;
  getSession(options: { context: K, did: string }): Promise<V | undefined>;
  importSession(options: { context: K, session: V }): Promise<void>;
  listSessions(options: { context: K }): Promise<V[]>;
  updateSession(options: { context: K, session: Partial<V> }): Promise<boolean>;
}

/**
 * ! TODO: Decide whether all of these methods are needed.
createSession: Creates a new session for the specified DID.
getSession: Retrieves the session for the specified DID.
updateSession: Updates the session for the specified DID.
deleteSession: Deletes the session for the specified DID.
listSessions: Lists all sessions in the session manager.
authorizeSession: Authorizes the specified session to access resources.
revokeSession: Revokes the specified session's access to resources.
expireSession: Expires the specified session.
validateSession: Validates the specified session to ensure it is authorized and not expired.
getSessionState: Retrieves the state of the specified session.
setSessionState: Sets the state of the specified session.
 */

export class SessionApi extends EventEmitter<SessionEvents> {
  private _agent: Web5Agent;
  private _store: SessionStore<string, Session>;

  constructor(options: { agent: Web5Agent }) {
    super();
    this._agent = options.agent;

    // Default to a LevelDB store.
    this._store = new SessionStoreLevel();
  }

  async authorize({ did }: { did: string }): Promise<void> {
    // Prepare a partial session update with the state set to authorized.
    const sessionUpdate = {
      did   : did,
      state : SessionState.Authorized
    };

    // Update the session state in the store.
    await this._store.updateSession({ context: this._agent.agentDid, session: sessionUpdate });
  }

  async clear(): Promise<void> {
    // Clear the session store.
    await this._store.clearSessions({ context: this._agent.agentDid });
  }

  async initialize({ delegate, did }: { delegate?: string, did: string }): Promise<void> {
    // Create a new session.
    const session: Session = {
      did   : did,
      state : SessionState.Initialized
    };

    // If a delegate is specified, add it to the session.
    if (delegate) session.delegate = delegate;

    // Store the session.
    await this._store.importSession({ context: this._agent.agentDid, session });
  }

  async list(): Promise<Session[]> {
    return await this._store.listSessions({ context: this._agent.agentDid });
  }

  // async restore(agent: Web5ManagedAgent, web5: Web5): Promise<Session[]> {
  //   // Query the Agent's DWN for local App Identity records.
  //   const storedAppIdentities = await agent.identityManager.list();
  //   const storedAppDids = storedAppIdentities.map(identity => identity.did);

  //   // Query each Identity's DWN for delegation grants, if any.
  //   const grantorDidMap = await Promise.all(storedAppDids.map(async appDid => {
  //     // Use the current DID to query the DWN for delegation grants.
  //     web5.setAppDid(appDid);
  //     const queryResponse = await web5.dwn.records.query({
  //       message: {
  //         filter: {
  //           schema     : 'https://schema.org/DelegationGrant',
  //           dataFormat : 'application/json'
  //         }
  //       }
  //     });

  //     // Parse and accumulate the delegation grants.
  //     const delegationGrantRecords = queryResponse.records;
  //     const delegationGrants: Array<{ grantedBy: string }> = [];
  //     delegationGrantRecords.forEach(async record => {
  //       const permissionsGrant = await record.data.json() as { grantedBy: string };
  //       delegationGrants.push(permissionsGrant);
  //     });

  //     // Remove duplicates from the accumulated delegation grants.
  //     const grantorDids = [...new Set(delegationGrants.map(grant => grant.grantedBy))];

  //     // If no delegation grants were found, the DID is of a root Identity.
  //     if (grantorDids.length === 0) {
  //       return {
  //         appDid     : appDid,
  //         grantorDid : appDid
  //       };

  //     // Otherwise, the DID is of a delegated Identity.
  //     } else {
  //       // Each App DID is expected to have been granted permissions by a single grantor Identity.
  //       if (grantorDids.length !== 1) {
  //         throw new Error('Unexpected number of delegated identities');
  //       }

  //       // Return the grantor Identity DID.
  //       const [ grantorDid ] = grantorDids;
  //       return {
  //         appDid     : appDid,
  //         grantorDid : grantorDid
  //       };
  //     }
  //   }));

  //   const sessions: Session[] = grantorDidMap.map((entry) => {
  //     return {
  //       delegate         : entry.appDid,
  //       did              : entry.grantorDid,
  //       delegationGrants : [],
  //       state            : SessionState.Authorized,
  //     };
  //   });

  //   return sessions;
  // }
}


import type { KeyValueStore, RequireOnly } from '@web5/common';
import type { ConnectProvider, HandshakeState } from '@web5/agent';

import { Level } from 'level';
import { LevelStore } from '@web5/common';
import { AuthorizationResponse } from '@web5/agent';



export class SessionStoreLevel implements SessionStore<string, Session> {
  /**
   * A private field that contains the Level DB used as the persistent key-value store.
   */
  private _store = new Level<string, Session>('DATA/AGENT/SESSION_STORE', {
    keyEncoding   : 'utf8',
    valueEncoding : 'json'
  });

  async clearSessions({ context }: { context: string }): Promise<void> {
    // Get the namespace for the specified context DID.
    const didSessions = this._store.sublevel(context, { valueEncoding: 'json' });

    // Clear the session store.
    await didSessions.clear();
  }

  async deleteSession({ context, did }: {
    context: string,
    did: string
  }): Promise<boolean> {
    // Get the namespace for the specified context DID.
    const didSessions = this._store.sublevel(context, { valueEncoding: 'json' });

    // Attempt to retrieve the session to be deleted by its `did` property.
    try {
      await didSessions.del(did);
    } catch(error: any) {
      // If the session isn't found, return false.
      if (error.notFound) return false;
      throw error;
    }

    return true;
  }

  async getSession({ context, did }: {
    context: string,
    did: string
  }): Promise<Session | undefined> {
    // Get the namespace for the specified context DID.
    const didSessions = this._store.sublevel(context, { valueEncoding: 'json' });

    // Attempt to retrieve the session with the specified identity DID.
    let storedSession: Session;
    try {
      storedSession = await didSessions.get(did, { valueEncoding: 'json' });
    } catch(error: any) {
      // If the session isn't found, return undefined.
      if (error.notFound) return;
      throw error;
    }

    return storedSession;
  }

  async importSession({ context, session }: { context: string, session: Session }) {
    // Get the namespace for the specified context DID.
    const didSessions = this._store.sublevel(context, { valueEncoding: 'json' });

    // Insert the session into the store.
    didSessions.put(session.did, session, { valueEncoding: 'json' });
  }

  async listSessions({ context }: { context: string }): Promise<Session[]> {
    // Get the namespace for the specified context DID.
    const didSessions = this._store.sublevel(context, { valueEncoding: 'json' });

    let sessions: Session[] = [];

    // Attempt to retrieve any existing sessions.
    for await (const session of didSessions.values<string, Session>({ valueEncoding: 'json'})) {
      sessions.push(session);
    }
    console.log('sessions', sessions);

    return sessions;
  }

  async updateSession({ context, session: sessionUpdates }: {
    context: string,
    session: RequireOnly<Session, 'did'>
  }): Promise<boolean> {
    // Get the namespace for the specified DID.
    const didSessions = this._store.sublevel(context, { valueEncoding: 'json' });

    // Attempt to retrieve the session to be updated by its `identityDid` property.
    let storedSession: Session;
    try {
      storedSession = await didSessions.get(sessionUpdates.did, { valueEncoding: 'json' });
    } catch(error: any) {
      // If the session isn't found, return false.
      if (error.notFound) return false;
      throw error;
    }

    // Otherwise, update the specified session.
    const updatedSession: Session = { ...storedSession, ...sessionUpdates };

    // Store the updated session.
    await didSessions.put(updatedSession.did, updatedSession, { valueEncoding: 'json' });

    return true;
  }
}

// export class SessionStoreMemory implements SessionStore<string, Session> {
//   /**
//    * A private field that contains the Map used as the in-memory key-value store.
//    */
//   private store: Map<string, string> = new Map();

//   async getSession({ did }: { did: string; }): Promise<Session | undefined> {
//     // Attempt to retrieve any existing sessions.
//     let sessionsAsString = this.store.get(did);

//     // If no sessions are found, return undefined.
//     if (!sessionsAsString) return;

//     // Otherwise, parse the stored sessions.
//     const sessions: Session[] = JSON.parse(sessionsAsString);

//     // And attempt to return the specified session.
//     return sessions.find(session => session.identityDid === did);
//   }

//   async importSession(options: { did: string, session: Session }) {
//     const { did, session } = options;

//     // Attempt to retrieve any existing sessions.
//     let sessionsAsString = this.store.get(did);

//     // If no sessions are found, create a new entry for the did.
//     if (!sessionsAsString) {
//       this.store.set(did, JSON.stringify([ session ]));

//     // Otherwise, add the new session to the existing sessions.
//     } else {
//       const sessions: Session[] = JSON.parse(sessionsAsString);
//       sessions.push(session);

//       // Store the updated sessions.
//       sessionsAsString = JSON.stringify(sessions);
//       this.store.set(did, sessionsAsString);
//     }

//     return did;
//   }

//   async listSessions({ did }: { did: string }): Promise<Session[]> {
//     // Attempt to retrieve the stored sessions.
//     const sessionsAsString = this.store.get(did);

//     // If no sessions are found, return an empty array.
//     if (!sessionsAsString) return [];

//     // Otherwise, parse the stored sessions.
//     const sessions: Session[] = JSON.parse(sessionsAsString);

//     return sessions;
//   }
// }