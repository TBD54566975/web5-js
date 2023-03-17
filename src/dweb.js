import { dataToBytes } from './utils';
import merge from 'deepmerge';
import * as DWebNodeSDK from '@tbd54566975/dwn-sdk-js';
import { resolve } from './did';

// let debug = true;
let node;
const DWeb = {
  createAndSignMessage: async (author, message, data) => {
    message.authorizationSignatureInput = DWebNodeSDK.Jws.createSignatureInput({
      keyId: author.did + '#key-1',
      keyPair: author.keys
    });

    message.data = data;
    const signedMessage = await DWebNodeSDK[message.interface + message.method].create(message);
    delete signedMessage.data;

    return signedMessage;
  },

  node: async (config = {}) => {
    return node || (node = await DWebNodeSDK.Dwn.create(config));
  },

  protocols: {
    configure: async (target, context) => {
      context.message = merge.all([context.message, {
        interface: 'Protocols',
        method: 'Configure'
      }
      ]);
      return await DWeb.send(target, context);
    },

    query: async (target, context) => {
      context.message = merge.all([context.message, {
        interface: 'Protocols',
        method: 'Query'
      }
      ]);
      return await DWeb.send(target, context);
    }
  },

  records: {
    delete: async (target, context) => {
      context.message = merge.all([context.message, {
        interface: 'Records',
        method: 'Delete'
      }
      ]);
      return await DWeb.send(target, context);
    },

    query: async (target, context) => {
      context.message = merge.all([context.message, {
        interface: 'Records',
        method: 'Query'
      }
      ]);
      return await DWeb.send(target, context);
    },

    write: async (target, context) => {
      // Convert string/object data to bytes before further processing.
      const { dataBytes, dataFormat } = dataToBytes(context.data, context.message.dataFormat);
      context.message.dataFormat = dataFormat;
      context.data = dataBytes;

      context.message = merge.all([context.message, {
        dataFormat,
        interface: 'Records',
        method: 'Write'
      }
      ]);
      return await DWeb.send(target, context);
    },
  },

  /**
   *
   * @param {string} target DID to route the message to
   * @param {{author: string, data: any, message: {} }} context
   * @returns
   */
  send: async (target, context) => {
    const authorDid = await resolve(context.author);
    context.target = target;  // Add target to context since its needed by transport methods.
    // If keys are not available to sign messages, transport the message to the specified agent.
    if (!authorDid?.keys) {
      // if (debug) console.log('Web5.send: Keys are NOT available for Author DID.');
      if (authorDid.connected) {
        // if (debug) console.log('Web5.send: Remote agent connected. Transporting message to agent.');
        return await send(authorDid.endpoint, context);
      } else {
        // TODO: Is this sufficient or might we improve how the calling app can respond by initiating a connect/re-connect flow?
        return { error: { code: 99, message: 'Local key chain not available and remote agent not connected'}};
      }
    }

    // if (debug) console.log('Web5.send: Keys ARE available to sign with Author DID');
    context.message = await DWeb.createAndSignMessage(authorDid, context.message, context.data);

    // Resolve the target DID and check to see whether it is connected (i.e., managed by this agent).
    const targetDid = await resolve(target);

    if (targetDid?.connected) {
      // if (debug) console.log('Target DID is managed by Agent');
      return await send(targetDid.endpoint, context);
    } else {
      // if (debug) console.log('Target DID is NOT managed by Agent');
      // TODO: Add functionality to resolve the DWN endpoint of the target DID and send a message using the endpoint's transport protocol (HTTP or WS).
    }
    return {};
  }
};

async function send (endpoint, request) {
  const scheme = endpoint.split(':')[0];
  return transports[scheme].send(endpoint, request);
}

const transports = {
  app: {
    dataEncoder: (data) => {
      let stream;
      if (data) {
        stream = DWebNodeSDK.DataStream.fromBytes(data);
      }
      return stream;
    },
    send: async (endpoint, request) => {
      const encodedData = transports.app.dataEncoder(request.data);
      return await DWeb.node().then(node => node.processMessage(request.target, request.message.message, encodedData));
    }
  },

  get https(){ return this.http; },
  http: {
    dataEncoder: (data, dataFormat) => {
      // TODO: Consider removing if not used after non-connected target DID transport is implemented.
      return dataToBytes(data, dataFormat);
    },
    headerKey: 'DWN-MESSAGE',
    messageDecoder: (message) => {
      return DWebNodeSDK.Encoder.base64UrlToObject(message);
    },
    messageEncoder: (message) => {
      return DWebNodeSDK.Encoder.stringToBase64Url(JSON.stringify(message));
    },
    send: async (endpoint, request) => {
      request.message.author = request.author;
      request.message.target = request.target;
      return await fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          [transports.http.headerKey]: transports.http.messageEncoder(request.message),
          'Content-Type': 'application/octet-stream'
        },
        body: request.data
      });
    }
  }
};

export {
  DWeb,
  DWebNodeSDK,
  transports
};
