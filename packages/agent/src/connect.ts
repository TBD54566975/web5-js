// class ConnectProvider {
//   attemptDirectConnection(peerInfo: PeerInfo): boolean { /* ... */ }
//   fallbackToRelay(): void { /* ... */ }
//   // ... other methods
// }

// class ConnectClient {
//   attemptDirectConnection(peerInfo: PeerInfo): boolean { /* ... */ }
//   fallbackToRelay(): void { /* ... */ }
//   // ... other methods
// }

// class ConnectRelay {
//   registerProvider(provider: IdentityProvider): void { /* ... */ }
//   registerClient(client: IdentityClient): void { /* ... */ }
//   getPeerInfo(clientId: string): PeerInfo { /* ... */ }
//   // ... other methods
// }

import { KeyValueStore } from '@web5/common';
import type { AppDataStore } from './app-data-store.js';
import { EventEmitter, type EventListener } from './events.js';
import type { ConnectRpcRequest, ConnectRpcResponse, Web5RpcClient } from './rpc-client.js';
import { Web5ManagedAgent } from './types/agent.js';

export class ConnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnnectError';
  }
}

// export enum ConnectErrors {
// }

export interface ConnectClientEvents {
  'challenge': { validatePin: (pin: string) => Promise<void>; };
  'identitySelection': {
    identities: string[];
    selectIdentity: (did: string) => Promise<void>;
  };
  'connected': { appDid: string; };
  'done': undefined;
}

export type Maybe<T> = T | null;

export const ConnectPhase = {
  Initialization : 'Initialization',
  Handshake      : 'Handshake',
} as const;

type ConnectState = {
  phase: keyof typeof ConnectPhase;
}

export type ConnectSession = {
  on: <K extends keyof ConnectClientEvents>(eventName: K, listener: EventListener<ConnectClientEvents[ K ]>) => void;
  cancel: () => void;
}

export class ConnectProtocol {

  static async createRequest(options: {
    appData: AppDataStore,
    origin: string,
    permissionsRequest: string,
    temporaryDid: string
  }): Promise<ConnectSession> {
    const { origin: _, permissionsRequest: __, temporaryDid: ___ } = options;
    return null as any;
  }

  static async createInitiator(options: {
    appData: AppDataStore,
    connectRelay: string,
    origin: string,
    permissionsRequests: string,
    rpcClient: Web5RpcClient
  }): Promise<ConnectSession> {
    const { appData, connectRelay, origin, permissionsRequests, rpcClient } = options;

    // Create event emitter to emit events to the caller.
    let eventEmitter: Maybe<EventEmitter<ConnectClientEvents>> = new EventEmitter();

    const connectState: ConnectState = {
      phase: ConnectPhase.Initialization
    };

    // Create a function to handle messages from the Identity Provider.
    const handleMessage = async (event: MessageEvent): Promise<void> => {
      const { data } = event;

      switch (connectState.phase) {

        /**
         * Initialization Phase
         */
        case ConnectPhase.Initialization: {
          break;
        }
      }
      console.log(data);
    };

    // Create a channel to communicate with the Identity Provider either directly or via a relay.
    const channel = await createChannel({ endpointUrl: connectRelay, handleMessage, rpcClient });

    const done = async () => {
      eventEmitter?.emit('done', undefined);
      eventEmitter = null;
      // channel.close();
      // clearInterval(rsaExchangeInterval);
    };

    setTimeout(() => {
      console.log('Emitted challenge event');
      eventEmitter?.emit('challenge', { validatePin });
    }, 200);

    const selectIdentity = async (did: string) => {
      console.log('Selected Identity:', did);
      eventEmitter?.emit('connected', { appDid: did });
    };

    const validatePin = async (pin: string) => {
      console.log('PIN:', pin);
      // Decrypt the JWE with the PIN as AAD
      const identities = [ 'did:method:123', 'did:method:456' ];
      console.log('Emitted identitySelection event');
      eventEmitter?.emit('identitySelection', { identities, selectIdentity });
    };

    return {
      on     : (...args) => eventEmitter?.on(...args),
      cancel : done
    };
  }
}

export type ChannelOptions = {
  endpointUrl: string;
  handleMessage: (event: MessageEvent) => void;
  rpcClient: Web5RpcClient;
}

export type ChannelData = {
  type: 'request' | 'response';
  data: ConnectRpcRequest | ConnectRpcResponse;
}

export type Channel = {
  close: () => void
  send: (data: ConnectRpcRequest | ConnectRpcResponse) => void
}

export async function createChannel(options: ChannelOptions): Promise<Channel> {
  const { endpointUrl, handleMessage, rpcClient } = options;



  // const event = new MessageEvent('message', {
  //   data: 'Hello, world!',
  // });

  // handleMessage(event);

  const close = (): () => void => {
    return function () {
      console.log('Closing channel');
    };
  };

  const send = (): (data: ConnectRpcRequest | ConnectRpcResponse) => void => {
    return function (data: ConnectRpcRequest | ConnectRpcResponse) {
      console.log('Sending data:', data);
    };
  };

  return {
    close,
    send
  };
}











// export class SessionStoreDwn implements SessionStore<string, string> {
//   private _agent: Web5ManagedAgent;
//   private _sessionRecordProperties = {
//     dataFormat : 'application/json',
//     schema     : 'https://identity.foundation/schemas/web5/session'
//   };

//   constructor(options: { agent: Web5ManagedAgent }) {
//     this._agent = options.agent;
//   }

//   async deleteSession(options: { id: string }): Promise<boolean> {
//     return null as any;
//   }

//   async getSession(options: { id: string }): Promise<string | undefined> {
//     return null as any;
//   }

//   async importSession(options: { session: Session }): Promise<string> {
//     const { context } = options ?? {};

//     // Determine which DID to use to author DWN messages.
//     const authorDid = await this.getAuthor({ agent: this._agent, context });




//     return null as any;
//   }

//   async listSessions(options?: { context?: string }): Promise<string[]> {
//     return null as any;
//   }

//   async updateSession(options: { id: string } & Partial<string>): Promise<boolean> {
//     return null as any;
//   }

//   private async getAuthor(options: {
//     agent: Web5ManagedAgent,
//     context?: string
//   }): Promise<string> {
//     const { context, agent } = options;

//     // If `context` is specified, DWN messages will be signed by this DID.
//     if (context) return context;

//     // If Agent has an agentDid, use it to sign DWN messages.
//     if (agent.agentDid) return agent.agentDid;

//     // If `context` and `agent.agentDid` are undefined, throw error.
//     throw new Error(`SessionStoreDwn: Agent property 'agentDid' and 'context' are undefined.`);
//   }
// }
