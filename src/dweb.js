import { connect } from './connect';
import { encodeData, computeDagPbCid, getCurrentTimeInHighPrecision } from './utils';
import merge from 'deepmerge';
import * as DWebNodeSDK from '@tbd54566975/dwn-sdk-js';

let debug = true;

// const DWeb = {
//   records: {
//     create: async (props) => {
      // const currentTime = getCurrentTimeInHighPrecision();

      // if ((props.data === undefined && message.dataCid === undefined) ||
      //      props.data !== undefined && message.dataCid !== undefined) {
      //   throw new Error('one and only one parameter between `data` and `dataCid` is allowed');
      // }
      // const dataCid = message.dataCid || await computeDagPbCid(props.data);

      // const descriptor = merge.all([
      //   {
      //     dataFormat: 'application/json',
      //     dateCreated: currentTime,
      //     dateModified: currentTime,
      //   },
      //   props.message,
      //   {
      //     interface: 'Records',
      //     method: 'Write',
      //     dataCid
      //   }
      // ])

      // generate `datePublished` if the message is to be published but `datePublished` is not given
      // if (descriptor.published === true &&
      //   descriptor.datePublished === undefined) {
      //   descriptor.datePublished = currentTime;
      //}

      // delete all descriptor properties that are `undefined` else the code will encounter the following IPLD issue when attempting to generate CID:
      // Error: `undefined` is not supported by the IPLD Data Model and cannot be encoded
      //removeUndefinedProperties(descriptor);

      // `recordId` computation
      //const recordId = props.recordId || await DWebNodeSDK.RecordsWrite.getEntryId(props.target, descriptor);

      // if (!message.authorizationSignatureInput) {
      //   message.authorizationSignatureInput = DWebNodeSDK.Jws.createSignatureInput({
      //     keyId: profile.did.id + '#key-1',
      //     keyPair: profile.did.keys[0].keypair
      //   })
      // }
      // let stream;
      // if (data !== undefined) {
      //   stream = DWebNodeSDK.DataStream.fromBytes(data);
      // }
      // message.data = data;
      // const output = await DWebNodeSDK[message.interface + message.method].create(message);
      // const node = await getNode();
      // return node.processMessage(target, output.message, stream);
    // }

let node;

const DWeb = {
  node: async (config = {}) => {
    return node || (node = await DWebNodeSDK.Dwn.create(config));
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
        return await transport.send(author.endpoint, context);
      } else {
        // TODO: Is this sufficient or might we improve how the calling app can respond by initiating a connect/re-connect flow?
        return { error: { code: 99, message: 'Local key chain not available and remote agent not connected'}};
      }
    }

    // if (debug) console.log('Web5.send: Key Chain IS available for Author DID');
    if (target?.connected) {
      // if (debug) console.log('Target DID is managed by Agent');
      // context.target = target;
      return await transport.send(author.endpoint, context);
    } else {
      // if (debug) console.log('Target DID is NOT managed by Agent');
      // TODO: Add functionality to resolve the DWN endpoint of the target DID and send a message using the endpoint's transport protocol (HTTP or WS).
    }
    return {};
  }
}

const transport = {
  send: async (endpoint, request) => {
    const scheme = endpoint.split(':')[0];
    let response;
    switch (scheme) {
      case 'app':
        response = await transport.app.send(endpoint, request);
        break;

      case 'http':
      case 'https':
        response = await transport.http.send(endpoint, request);
        break;
    }
    return response;
  },

  app: {
    dataEncoder: (data) => {
      let stream;
      if (data) {
        stream = DWebNodeSDK.DataStream.fromBytes(data); 
      }
      return stream;
    },
    messageEncoder: async (message, author, data) => {
      message.authorizationSignatureInput = DWebNodeSDK.Jws.createSignatureInput({
        keyId: author.did + '#key-1',
        keyPair: author.keypair
      });

      message.data = data;
      const encodedMessage = await DWebNodeSDK[message.interface + message.method].create(message);
      delete encodedMessage.data;
      return encodedMessage;
    },
    send: async (endpoint, request) => {
      const encodedData = transport.app.dataEncoder(request.data);
      const encodedMessage = await transport.app.messageEncoder(request.message, request.author, request.data);
      const response = await DWeb.node().then(node => node.processMessage(request.target.did, encodedMessage.message, encodedData));
      return response;
    }
  },

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
      const { encodedData, dataFormat } = transport.http.dataEncoder(request.data, request.message.dataFormat);
      request.message.dataFormat = dataFormat;
      request.message.author = request.author.toString();
      request.message.target = request.target.toString();
      return await fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          [transport.http.headerKey]: transport.http.messageEncoder(request.message),
          'Content-Type': 'application/octet-stream'
        },
        body: encodedData
      });
    }
  }
}

export {
  DWeb,
  DWebNodeSDK,
  transport
}
