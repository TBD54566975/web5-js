
import { connect } from './connect';
import { encodeData, computeDagPbCid, toReadableStream, getCurrentTimeInHighPrecision } from './utils';
import merge from 'deepmerge';
import * as SDK from '@tbd54566975/dwn-sdk-js';

const Encoder = SDK.Encoder;

let node;
const DWeb = {
  node: async (config = {}) => {
    return node || (node = await SDK.Dwn.create(config));
  },
  set node(instance){
    node = instance;
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
      //const recordId = props.recordId || await SDK.RecordsWrite.getEntryId(props.target, descriptor);

      // if (!message.authorizationSignatureInput) {
      //   message.authorizationSignatureInput = SDK.Jws.createSignatureInput({
      //     keyId: profile.did.id + '#key-1',
      //     keyPair: profile.did.keys[0].keypair
      //   })
      // }
      // let stream;
      // if (data !== undefined) {
      //   stream = SDK.DataStream.fromBytes(data);
      // }
      // message.data = data;
      // const output = await SDK[message.interface + message.method].create(message);
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

      if (props.process && props.target && props.keypair) {
        return DWeb.ingestMessage({
          message,
          did: props.target,
          keypair: props.keypair
        })
      }

      if (!props.target || props.send) {
        return await sendDWebMessage({
          target: props.target,
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

      if (props.process && props.target && props.keypair) {
        await DWeb.ingestMessage({
          message,
          did: props.target,
          keypair: props.keypair,
          stream: toReadableStream(props.data)
        })
      }

      if (!props.target || props.send) {
        return await sendDWebMessage({
          target: props.target,
          message: message,
          data: encodedData
        }).then(raw => raw.json())
      }
    }
  },
  ingestMessage: async (props) => {
    const { did, keypair, message, stream } = props;
    if (!message.authorization && !message.authorizationSignatureInput) {
      message.authorizationSignatureInput = SDK.Jws.createSignatureInput({
        keyId: did + '#key-1',
        keyPair: keypair
      })
    }
    message.data = stream;
    const output = await SDK[message.interface + message.method].create(message);
    delete message.data;
    return await DWeb.node().then(node => node.processMessage(did, output.message, stream || message.data));
  }
}

let connection;
async function sendDWebMessage(request){
  let endpoint;
  if (!request.target) {
    connection = connection || (connection = await connect({ prompt: false }));
    if (!connection) throw 'No Connection';
    request.target = connection.did;
    endpoint = `http://localhost:${connection.port}/dwn`;
  }
  else {
    // TODO: resolve non-connection DID targets
  }

  // TODO: If file or FileReader leave this alone and let the browser do it
  let data;
  if (request.data !== undefined) {
    data = new (typeof FormData !== 'undefined' ? FormData : require('form-data'))();
    data.append('data', request.data);
    delete request.data;
  }

  return fetch(endpoint, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'DWN-MESSAGE': Encoder.stringToBase64Url(JSON.stringify(request))
    },
    body: data
  })
}

export {
  DWeb
}
