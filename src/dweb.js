import { encodeData } from './utils';
import merge from 'deepmerge';
import * as DWebNodeSDK from '@tbd54566975/dwn-sdk-js';

// let debug = true;
let node;
const DWeb = {
  createAndSignMessage: async (author, message, data) => {
    message.authorizationSignatureInput = DWebNodeSDK.Jws.createSignatureInput({
      keyId: author.did + '#key-1',
      keyPair: author.keypair
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
      context.message = merge.all([context.message, {
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
    const { author } = context;
    context.target = target;  // Add target to context since its needed by transport methods.
    // If a local key chain is not available to sign messages, transport the message to the specified agent.
    if (!author?.keyChain) {
      // if (debug) console.log('Web5.send: Key Chain NOT available for Author DID.');
      if (author.connected) {
        // if (debug) console.log('Web5.send: Remote agent connected. Transporting message to agent.');
        // context.target = target;
        return await send(author.endpoint, context);
      } else {
        // TODO: Is this sufficient or might we improve how the calling app can respond by initiating a connect/re-connect flow?
        return { error: { code: 99, message: 'Local key chain not available and remote agent not connected'}};
      }
    }

    // if (debug) console.log('Web5.send: Key Chain IS available to sign with Author DID');
    context.message = await DWeb.createAndSignMessage(author, context.message, context.data);

    if (target?.connected) {
      // if (debug) console.log('Target DID is managed by Agent');
      // context.target = target;
      return await send(author.endpoint, context);
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
      return await DWeb.node().then(node => node.processMessage(request.target.did, request.message.message, encodedData));
    }
  },

  get https(){ return this.http; },
  http: {
    dataEncoder: (data, dataFormat) => {
      return encodeData(data, dataFormat);
    },
    headerKey: 'DWN-MESSAGE',
    messageDecoder: (message) => {
      return DWebNodeSDK.Encoder.base64UrlToObject(message);
    },
    messageEncoder: (message) => {
      return DWebNodeSDK.Encoder.stringToBase64Url(JSON.stringify(message));
    },
    send: async (endpoint, request) => {
      const { encodedData, dataFormat } = transports.http.dataEncoder(request.data, request.message.dataFormat);
      request.message.dataFormat = dataFormat;
      request.message.author = request.author.toString();
      request.message.target = request.target.toString();
      return await fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          [transports.http.headerKey]: transports.http.messageEncoder(request.message),
          'Content-Type': 'application/octet-stream'
        },
        body: encodedData
      });
    }
  }
};

export {
  DWeb,
  DWebNodeSDK,
  transports
};
