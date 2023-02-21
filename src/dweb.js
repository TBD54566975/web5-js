
import { connect } from './connect';

import merge from 'deepmerge';
import * as SDK from '@tbd54566975/dwn-sdk-js';

let node;
const DWeb = {
  node: async (config = {}) => {
    return node || (node = await SDK.Dwn.create(config));
  },
  records: {
    query: async (props) => {
      return sendDWebMessage({
        type: 'RecordsQuery',
        target: props.target,
        message: merge.all([
          {
            filter: {
              dataFormat: 'application/json'
            }
          }, props.message
        ])
      }).then(raw => raw.json())
    },
    write: async (props) => {
      const { message } = props;

      console.log(message.data);
      return sendDWebMessage({
        type: 'RecordsWrite',
        target: props.target,
        message: merge.all([
          {
            dataFormat: 'application/json'
          },
          props.message,
          { data: message.data === undefined ? undefined : message.data }
        ])
      }).then(raw => raw.json())
    }
  }
}

let connection;
async function sendDWebMessage(request){
  let endpoint;
  if (!request.target) {
    connection = connection || (connection = await connect({ request: false }));
    if (!connection) throw 'No Connection';
    request.target = connection.did;
    endpoint = `http://localhost:${connection.port}/dwn`;
  }
  else {
    // TODO: resolve non-connection DID targets
  }
  return fetch(endpoint, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })
}

export {
  DWeb
}
