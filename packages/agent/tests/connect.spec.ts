import { expect } from 'chai';

import { Channel, ChannelOptions, ConnectMessage, ConnectMessageType, ConnectProvider, DelegationGrant, DelegationGrantRequest } from '../src/connect.js';

import { poll } from '../src/utils.js';
import { ConnectProtocol } from '../src/connect.js';
import { RequireOnly } from '@web5/common';
import { CryptoManager, KeyManager, LocalKms, PortableKey, PortableKeyPair } from '../src/index.js';
import { DidKeyMethod, DidResolver } from '@web5/dids';
import { Jose } from '@web5/crypto';
import { utils as cryptoUtils } from '@web5/crypto';

type Message = { messageType: 'request' | 'response', requestId: string; payload: string }
// type Message = { messageType: string; payload: string, uuid: string }

describe.only('ConnectProtocol', () => {
  // it('does something', async () => {
  //   const createMockChannel = () => {
  //     const messageQueue: Message[] = [];
  //     const getMessage = async (messageType: string, uuid: string): Promise<Message | undefined> => {
  //       const message = messageQueue.find((data) => data.messageType === messageType && data.uuid === uuid);
  //       if (!message) throw new Error('Failed to retrieve message.');
  //       return message;
  //     };

  //     return async (options: ChannelOptions): Promise<Channel> => {
  //       const { handleMessage } = options;

  //       const close = (): void => {
  //         console.log('Closing channel');
  //       };

  //       const send = async (data: ConnectMessage): Promise<void> => {
  //         const { messageType, payload, uuid } = data;
  //         console.log(`Sending '${data.messageType}': ${data.uuid}`);
  //         messageQueue.push({ messageType, payload, uuid });
  //       };

  //       const subscribe = async ({ messageType, uuid }: {
  //         messageType: ConnectMessageType,
  //         uuid: string
  //       }): Promise<void> => {
  //         console.log(`Subscribing to ${messageType} (${uuid})`);

  //         // Continually poll until a valid response is received or abort is signaled.
  //         const response = await poll(
  //           () => getMessage(messageType, uuid),
  //           {
  //             interval: 1000,
  //           }
  //         );

  //         if (response) {
  //           handleMessage(new MessageEvent('message', { data: response }));
  //         } else {
  //           throw new Error(`Connect Protocol: Failed to receive Authorization Request from Connect Client.`);
  //         }
  //       };

  //       return {
  //         close,
  //         relayUri: 'http://localhost',
  //         send,
  //         subscribe
  //       };
  //     };
  //   };

  //   // Create a mock channel that simulates the client and provider communicating over a network.
  //   const createChannel = createMockChannel();

  //   // Create a new Connect Protocol instance using the mock channel.
  //   const connectI = new ConnectProtocol({ createChannel });
  //   const connectP = new ConnectProtocol({ createChannel });

  //   // Initiate the Connect Protocol process.
  //   const client = await connectI.createClient({
  //     connectEndpoint     : 'http://localhost:0',
  //     origin              : '',
  //     permissionsRequests : [{ mock: 'permissionsRequest' }]
  //   });

  //   let provider: ConnectProvider | undefined;
  //   let challengePin: string | undefined;
  //   let clientDone = false;

  //   client.on('connectLink', async ({ connectLink }) => {
  //     console.log('connectLink', connectLink);

  //     provider = await connectP.createProvider({ connectLink });

  //     provider.on('authorizationRequest', async ({ grantDelegation, origin, permissionsRequests, pin }) => {
  //       console.log('Origin:', origin);
  //       console.log('Permissions Requests:', permissionsRequests);
  //       console.log('PIN:', pin);
  //       challengePin = pin;

  //       await grantDelegation({ identities: ['did:key:123'] });
  //     });
  //   });

  //   client.on('challenge', async ({ validatePin }) => {
  //     validatePin({ pin: challengePin! });
  //   });

  //   client.on('connected', async ({ grants }) => {
  //     console.log(JSON.stringify(grants, null, 2));
  //   });

  //   client.on('done', () => {
  //     clientDone = true;
  //   });

  //   while (!clientDone) await new Promise(r => setTimeout(r, 100));
  // });

  it('using mock channel', async () => {
    const createMockChannel = () => {
      const messageQueue = new Map<string, string>();
      const getMessage = async (key: string): Promise<string> => {
        const message = messageQueue.get(key);
        if (!message) throw new Error('Failed to retrieve message.');
        return message;
      };

      return async (options: ChannelOptions): Promise<Channel> => {
        const { handleMessage } = options;

        const close = (): void => {
          console.log('Closing channel');
        };

        const send = async ({ data, url}: { data: string | URLSearchParams, url: string }): Promise<void> => {
          console.log(`Sending data to: ${url}`);

          const requestUrl = new URL(url);

          if (requestUrl.pathname === '/connect') {
            // Generate a request URI
            const requestId = cryptoUtils.randomUuid();
            const requestUri = `http://mock-channel/connect/${requestId}.jwt`;

            // Store the encrypted Request Object.
            const formEncodedRequest = new URLSearchParams(data);
            const requestObjectJwe = formEncodedRequest.get('request');
            if (!requestObjectJwe) throw new Error('Failed to retrieve request object from form encoded data.');
            messageQueue.set(`request:${requestId}`, requestObjectJwe);

            handleMessage(new MessageEvent('message', {
              data: JSON.stringify({
                request_uri : requestUri,
                expires_in  : 30,  // The request URI is valid for 30 seconds.
              })
            }));
          }
        };

        const subscribe = async ({ url }: { url: string }): Promise<void> => {
          console.log(`Subscribing to: ${url}`);

          const [ , pushRequestId ] = url.match(/\/connect\/([a-f0-9-]+)\.jwt/) ?? [];
          const [ , responseState ] = url.match(/\/sessions\/([a-f0-9-]+)\.jwt/) ?? [];

          let messageId: string;
          if (pushRequestId) messageId = `request:${pushRequestId}`;
          if (responseState) messageId = `response:${responseState}`;

          // Continually poll until a valid response is received or abort is signaled.
          const response = await poll(
            () => getMessage(messageId),
            {
              interval: 1000,
            }
          );

          if (response) {
            handleMessage(new MessageEvent('message', { data: response }));
          } else {
            throw new Error(`Connect Protocol: Failed to receive Authorization Request from Connect Client.`);
          }
        };

        return {
          close,
          send,
          subscribe
        };
      };
    };

    // @ts-ignore
    const mockAgent: Web5ManagedAgent = {};
    const memoryKms = new LocalKms({ kmsName: 'memory', agent: mockAgent });
    const otherKms = new LocalKms({ kmsName: 'other', agent: mockAgent });
    const km = new KeyManager({ kms: { memory: memoryKms, other: otherKms }, agent: mockAgent });

    // Create a DID for the test client app.
    const clientDid = await DidKeyMethod.create();
    const clientSigningKeyId = await DidKeyMethod.getDefaultSigningKey({ didDocument: clientDid.document });

    // Import the client DID's keys into the KeyManager.
    const publicKey = await Jose.jwkToCryptoKey({ key: clientDid.keySet.verificationMethodKeys![0].publicKeyJwk! });
    const privateKey = await Jose.jwkToCryptoKey({ key: clientDid.keySet.verificationMethodKeys![0].privateKeyJwk! });
    await km.importKey({
      privateKey : { kms: 'memory', ...privateKey, material: privateKey.material, alias: clientSigningKeyId },
      publicKey  : { kms: 'memory', ...publicKey, material: publicKey.material, alias: clientSigningKeyId }
    });

    const crypto = {
      decrypt     : (options) => km.decrypt(options),
      deriveBits  : (options) => km.deriveBits(options),
      encrypt     : (options) => km.encrypt(options),
      generateKey : (options) => km.generateKey({ ...options, kms: 'memory' }),
      importKey   : (options) => ('privateKey' in options)
        ? km.importKey({ privateKey: { ...options.privateKey, kms: 'memory' }, publicKey: { ...options.publicKey, kms: 'memory' } })
        : km.importKey({ ...options, kms: 'memory' }),
      sign   : (options) => km.sign(options),
      verify : (options) => km.verify(options),
    } as CryptoManager;

    const didResolver = new DidResolver({ didResolvers: [DidKeyMethod] });

    // Create a mock channel that simulates the client and provider communicating over a network.
    const createChannel = createMockChannel();

    // Create a new Connect Protocol instance using the mock channel.
    const connectI = new ConnectProtocol({ dependencies: { crypto, didResolver, createChannel } });
    const connectP = new ConnectProtocol({ dependencies: { crypto, didResolver, createChannel } });

    // Initiate the Connect Protocol process.
    const client = await connectI.createClient({
      clientDid              : clientDid.did,
      connectEndpoint        : 'http://mock-channel/connect',
      origin                 : 'https://didchat.xyz',
      delegationGrantRequest : { permissionsRequests: [{ mock: 'permissionsRequest' }] }
    });

    let provider: ConnectProvider | undefined;

    client.on('authorizationRequest', async ({ authorizationRequest }) => {
      console.log('authorizationRequest', authorizationRequest);

      provider = await connectP.createProvider({ authorizationRequest });

      // provider.on('authorizationRequest', async ({ grantDelegation, origin, permissionsRequests, pin }) => {
      //   console.log('Origin:', origin);
      //   console.log('Permissions Requests:', permissionsRequests);
      //   console.log('PIN:', pin);
      //   challengePin = pin;

      //   await grantDelegation({ identities: ['did:key:123'] });
      // });
    });

    await new Promise(r => setTimeout(r, 1000));
  });

  it.only('without mock channel', async () => {
    // @ts-ignore
    const mockAgent: Web5ManagedAgent = {};
    const memoryKms = new LocalKms({ kmsName: 'memory', agent: mockAgent });
    const otherKms = new LocalKms({ kmsName: 'other', agent: mockAgent });
    const km = new KeyManager({ kms: { memory: memoryKms, other: otherKms }, agent: mockAgent });

    // Create a DID for the test client app.
    const clientDid = await DidKeyMethod.create();
    const clientSigningKeyId = await DidKeyMethod.getDefaultSigningKey({ didDocument: clientDid.document });

    // Import the client DID's keys into the KeyManager.
    const publicKey = await Jose.jwkToCryptoKey({ key: clientDid.keySet.verificationMethodKeys![0].publicKeyJwk! });
    const privateKey = await Jose.jwkToCryptoKey({ key: clientDid.keySet.verificationMethodKeys![0].privateKeyJwk! });
    await km.importKey({
      privateKey : { kms: 'memory', ...privateKey, material: privateKey.material, alias: clientSigningKeyId },
      publicKey  : { kms: 'memory', ...publicKey, material: publicKey.material, alias: clientSigningKeyId }
    });

    const crypto = {
      decrypt     : (options) => km.decrypt(options),
      deriveBits  : (options) => km.deriveBits(options),
      encrypt     : (options) => km.encrypt(options),
      generateKey : (options) => km.generateKey({ ...options, kms: 'memory' }),
      importKey   : (options) => ('privateKey' in options)
        ? km.importKey({ privateKey: { ...options.privateKey, kms: 'memory' }, publicKey: { ...options.publicKey, kms: 'memory' } })
        : km.importKey({ ...options, kms: 'memory' }),
      sign   : (options) => km.sign(options),
      verify : (options) => km.verify(options),
    } as CryptoManager;

    const didResolver = new DidResolver({ didResolvers: [DidKeyMethod] });

    // Create a new Connect Protocol instance using the default HTTP channel.
    const connectI = new ConnectProtocol({ dependencies: { crypto, didResolver } });
    const connectP = new ConnectProtocol({ dependencies: { crypto, didResolver } });

    // Initiate the Connect Protocol process.
    const client = await connectI.createClient({
      clientDid              : clientDid.did,
      connectEndpoint        : 'http://localhost:8080/connect',
      origin                 : 'https://didchat.xyz',
      delegationGrantRequest : { permissionsRequests: [{ mock: 'permissionsRequest' }] }
    });

    let provider: ConnectProvider | undefined;
    const providerIdentities = await Promise.all([
      await DidKeyMethod.create(),
      await DidKeyMethod.create()
    ]);
    const providerDids = providerIdentities.map(({ did }) => did);

    client.on('authorizationRequest', async ({ authorizationRequest }) => {
      console.log('authorizationRequest', authorizationRequest);

      provider = await connectP.createProvider({ authorizationRequest });

      provider.on('authorizationRequest', async ({ authorizeRequest, denyRequest, delegationGrantRequest, origin }) => {
        const delegationGrants = await createDelegationGrants({ delegationGrantRequest, identities: providerDids });
        await authorizeRequest({ delegationGrants });
      });
    });

    await new Promise(r => setTimeout(r, 1000));
  });
});

// Construct Delegation Grants for each DID the user selected.
const createDelegationGrants = async ({ delegationGrantRequest, identities }: {
  delegationGrantRequest: DelegationGrantRequest,
  identities: string[]
}): Promise<DelegationGrant[]> => {
  const delegationGrants: DelegationGrant[] = await Promise.all(identities.map(async (identity) => {
  // Create a new DID with keys.
    const appDid = await DidKeyMethod.create();

    // Generate the permissions grants.
    const permissionsGrants = delegationGrantRequest.permissionsRequests.map(request => ({
      ...request,
      grantedTo : appDid.did,
      grantedBy : identity
    }));

    return { did: appDid, permissionsGrants };
  }));

  return delegationGrants;
};