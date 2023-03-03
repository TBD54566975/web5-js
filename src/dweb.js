import { connect } from './connect';
import { encodeData, computeDagPbCid, toReadableStream, getCurrentTimeInHighPrecision } from './utils';
import merge from 'deepmerge';
import * as DWebNodeSDK from '@tbd54566975/dwn-sdk-js';

let debug = true;

let node;
const DWeb = {
  node: async (config = {}) => {
    return node || (node = await DWebNodeSDK.Dwn.create(config));
  },
  records: {
    create: async (props) => {
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
    },
    query: async (props) => {

      const message = merge.all([
        {
          filter: {
            // Default to 'application/json' but can be overwritten
            // by passing a message.filter.dataFormat
            dataFormat: 'application/json'
          }
        },
        props.message,
        {
          interface: 'Records',
          method: 'Query'
        }
      ]);

      if (props.process && props.did && props.keypair) {
        return DWeb.ingestMessage({
          message,
          did: props.did,
          keypair: props.keypair
        })
      }

      if (!props.target || props.send) {
        return await sendDWebMessage({
          did: props.did,
          message: message
        }).then(raw => raw.json())
      }
    },
    write: async (props) => {
      // sniff props.data for presence of file or other readable stream thingys
      //globalThis.File present === in the Web
      const { encodedData, dataFormat } = encodeData(props.data, props.message.dataFormat);

      const message = merge.all([props.message, {
          interface: 'Records',
          method: 'Write',
          dataFormat: dataFormat
        }
      ]);

      if (props.process && props.did && props.keypair) {
        await DWeb.ingestMessage({
          message,
          did: props.did,
          keypair: props.keypair,
          stream: toReadableStream(props.data)
        })
      }

      if (!props.did || props.send) {
        return await sendDWebMessage({
          did: props.did,
          message: message,
          data: encodedData
        }).then(raw => raw.json())
      }
    },

  },
  ingestMessage: async (props) => {
    // const { did, keypair, message, stream } = props;
    const { did, keypair, message, data } = props;
    if (!message.authorization && !message.authorizationSignatureInput) {
      message.authorizationSignatureInput = DWebNodeSDK.Jws.createSignatureInput({
        keyId: did + '#key-1',
        keyPair: keypair
      })
    }
    // message.data = stream;
    let stream;
    if (data !== undefined) {
      stream = DWebNodeSDK.DataStream.fromBytes(data);
    }
    message.data = data;
    const output = await DWebNodeSDK[message.interface + message.method].create(message);

    // delete message.data;
    // return await DWeb.node().then(node => node.processMessage(did, output.message, stream || message.data));
    return await DWeb.node().then(node => node.processMessage(did, output.message, stream));
  }
}

let connection;
async function sendDWebMessage(request) {
  let endpoint;
  if (!request.did) {
    connection = connection || (connection = await connect({ prompt: false }));
    if (!connection) throw 'No Connection';
    request.did = connection.did;
    endpoint = `http://localhost:${connection.port}/dwn`;
  }
  else {
    // TODO: resolve non-connection DID targets
  }

  // TODO: If file or FileReader leave this alone and let the browser do it
  let data;
  if (request.data !== undefined) {
    data = request.data;
    // data = new (typeof FormData !== 'undefined' ? FormData : require('form-data'))();
    // data.append('data', request.data);
    // delete request.data;
  }

  return fetch(endpoint, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'DWN-MESSAGE': DWebNodeSDK.Encoder.stringToBase64Url(JSON.stringify(request)),
      'Content-Type': 'application/octet-stream'
    },
    body: data
  })
}

/**
 * 
 * @param {string} target DID to route the message to
 * @param {{author: string, data: any, message: {} }} context 
 * @returns 
 */
const DWeb2 = {
  records: {
    query: async (target, context) => {
      context.message = merge.all([context.message, {
          interface: 'Records',
          method: 'Query'
        }
      ]);
      return await DWeb2.send(target, context)
    },

    write: async (target, context) => {
      context.message = merge.all([context.message, {
          interface: 'Records',
          method: 'Write'
        }
      ]);
      return await DWeb2.send(target, context)
    },
  },

  send: async (target, context) => {
    const { author } = context;
    // If a local key chain is not available to sign messages, transport the message to the specified agent.
    if (!author?.keyChain) {
      if (debug) console.log('Web5.send: Key Chain NOT available for Author DID.');
      if (author.connected) {
        if (debug) console.log('Web5.send: Remote agent connected. Transporting message to agent.');
        context.message.target = target.toString();
        context.message.author = author.toString();
        return await transport.send(author.endpoint, context);
      } else {
        // TODO: Is this sufficient or might we improve how the calling app can respond by initiating a connect/re-connect flow?
        return { error: { code: 99, message: 'Local key chain not available and remote agent not connected'}}
      }
    }
    if (debug) console.log('Web5.send: Key Chain IS available for Author DID');

    if (target?.connected) {
      if (debug) console.log('Target DID is managed by Agent');
      context.target = target;
      return await transport.send(author.endpoint, context);
    } else {
      if (debug) console.log('Target DID is NOT managed by Agent');
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
      })

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

/**
 * PERFORM WEB5 RECORDS WRITE FROM WEB5 APP TO REMOTE AGENT
 *   Alice is the Author and Target is Alice's DWN
 * 
 * [APP]
 *   1) Web5.records.write(aliceDID, {
 *        author: aliceDID,
 *        message: {},
 *        data?: data
 *      })
 * 
 *   2) Web5.records.write assembles the full DWN message structure and passes the JavaScript Object to
 *      Web5.send(targetDID, {
 *        authorDID,
 *        message,
 *        data
 *      })
 * 
 *   3) Web5.send() then
 *      - Checks the targetDID and determines that it is registered as managed by a remote agent and the
 *        channel to the remote agent is connected.
 *      - Gets the endpoint URL from the DID object: http://localhost:55000/dwn
 *      - Set the transport protocol to 'http' based on the endpoint URL
 *      - Checks to see if there is data, and since there is (it's a records write), uses the HTTP Transport dataEncoder
 *      - The dataFormat is set based on the HTTP Transport dataEncoder or user passed value.
 *      - Prepares the DWN-MESSAGE by using the HTTP Transport messageEncoder.
 *      - Uses the HTTP Transport send function, fetch(), to send the message to the remote agent.
 * 
 * [REMOTE AGENT]
 * 
 *   4) Running a Koa web server that receives the HTTP POST request.  In the Koa router.post() function:
 *      - Extracts the header value based on the HTTP Transport protocol ('DWN-HESSAGE')
 *      - Calls Web5.receive({
 *          encodedMessage: ctx.get('DWN-MESSAGE'),
 *          requestStream
 *        })
 * 
 *   5) Web5.receive() then:
 *      - Uses the HTTP Transport messageDecoder to decode the DWN-MESSAGE
 *      - Checks to see if there is data, and since there is, since the receive was over HTTP, use the HTTP Transport
 *        dataDecoder to decode the requestStream.
 *      - Extracts the targetDID from the DWN-Message
 *      - Extracts the authorDID from the DWN-Message
 *      - Calls Web5.send(targetDID, {
 *          authorDID,
 *          message,
 *          data
 *        })
 * 
 *   6) Web5.send() then
 *      - Checks the targetDID and determines that it is registered as managed by the local agent.
 *      - Gets the endpoint URL from the DID object: app://dwn
 *      - Set the transport protocol to 'app' based on the endpoint URL (agent & dwn are accessible in application memory)
 *      - Prepares the Message using the app:// messageEncoder: object
 *          - Retrieves signature material from the KeyChain for the specified authorDID
 *          - prepares a RecordsWriteOptions JavaScript
 *        and calls RecordsWrite.create({}).
 *      - Uses the app Transport send function (processMessage()) to send the message to the Agent's embedded DWN.
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * Web5.send() FLOW:
 * 
 * STEP 1: Determine whether the DID:
 *   - registered as managed by a remote agent
 *   - registered as managed by a local agent (executing app is the agent)
 *   - unregistered
 * 
 * STEP 2A: If DID is registered as managed by a remote agent:
 *   - Check to see if there is a connected channel to the agent.  If not throw an error and stop processing.
 *   - If channel to agent is connected, get the endpoint URL from the DID object (e.g., http://localhost:3000, https://aggregator.dwn.tbd.website, wss://dwn.saas.com).
 *   - Get the transport protocol from the endpoint URL (e.g., http, https, wss, etc.).
 *   - If there is any data, use the encoder appropropriate given the transport protocol.  Use the dataFormat specified by the user.
 *   - Prepare the message based on the type of transport protocol being used
 *   - Use the transport specific function to send the message (e.g., fetch() for HTTP/HTTPS/WS)
 * 
 * STEP 2B: If DID is registered as managed by a local agent (we are the agent):
 *   - Check the DID to see if it is registered as managed by the local agent.  I
 *   - Prepare the message based on the type of transport protocol being used
 *     - Sign the message using the author DID specified
 *     - Convert the data into a ReadableStream
 *   - Use the transport specific function to send the message to the DWN.
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 *  */ 

export {
  DWeb,
  DWeb2,
  DWebNodeSDK,
  transport
}
