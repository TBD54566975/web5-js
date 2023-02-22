
import { connect } from './connect';
import merge from 'deepmerge';
import * as SDK from '@tbd54566975/dwn-sdk-js';

const Encoder = SDK.Encoder;

let node;
const DWeb = {
  node: async (config = {}) => {
    return node || (node = await SDK.Dwn.create(config));
  },
  records: {
    query: async (props) => {
      return sendDWebMessage({
        data: props.data,
        message: merge.all([
          {
            filter: {
              dataFormat: 'application/json'
            }
          },
          props.message,
          {
            interface: 'Records',
            method: 'Query',
            target: props.target
          }
        ])
      }).then(raw => raw.json())
    },
    write: async (props) => {
      return sendDWebMessage({
        data: props.data,
        message: merge.all([
          {
            dataFormat: 'application/json'
          },
          props.message,
          {
            interface: 'Records',
            method: 'Write',
            target: props.target
          }
        ])
      }).then(raw => raw.json())
    }
  }
}

let connection;
async function sendDWebMessage(request){
  let endpoint;
  if (!request.message.target) {
    connection = connection || (connection = await connect({ prompt: false }));
    if (!connection) throw 'No Connection';
    request.message.target = connection.did;
    endpoint = `http://localhost:${connection.port}/dwn`;
  }
  else {
    // TODO: resolve non-connection DID targets
  }

  let body;
  if (request.data !== undefined) {
    body = new Blob([
      request.data instanceof Uint8Array ? request.data : (
        Encoder[typeof request.data === 'object' ? 'objectToBytes' : 'stringToBytes'](request.data)
      )
    ], { type: 'application/octet-stream' })
    delete request.data;
  }

  return fetch(endpoint, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'DWN-MESSAGE': Encoder.stringToBase64Url(JSON.stringify(request.message)),
      'Content-Type': 'application/octet-stream'
    },
    body: body
  })
}

export {
  DWeb
}
