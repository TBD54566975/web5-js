import getRawBody from 'raw-body';
import { Web5 } from '@tbd54566975/web5';
import fs from 'node:fs';
import mkdirp from 'mkdirp';
import { createRequire } from 'node:module';

const web5 = new Web5();

const etcPath = './etc';
const didStoragePath = `${etcPath}/did.json`;
let didState;

const require = createRequire(import.meta.url);
const testProtocol = require('../resources/test-protocol.json');
const protocols =  [testProtocol];

async function getPort(processArgv) {
  const defaultPort = 8080;

  // Find the -p option and get the port number
  const portIndex = processArgv.indexOf('-p');
  let port = portIndex !== -1 ? processArgv[portIndex + 1] : null;

  // Use the port number provided, if valid, or fall back to the default
  port = (port && /^\d+$/.test(port)) ? parseInt(port) : defaultPort;

  return port;
}

async function loadConfig() {
  if (!fs.existsSync(etcPath)) {
    // ensure that directory for persistent storage exists
    mkdirp.sync(etcPath);
  }

  if (fs.existsSync(didStoragePath)) {
    console.log('Importing existing DID and keys...');
    const didStateJson = fs.readFileSync(didStoragePath, { encoding: 'utf-8' });
    didState = JSON.parse(didStateJson);
  } else {
    console.log('Initializing operator DID and keys...');
    didState = await initOperatorDid();
    fs.writeFileSync(didStoragePath, JSON.stringify(didState, null, 2));
  }
  web5.did.register({
    connected: true,
    did: didState.id,
    endpoint: 'app://dwn',
    keys: didState.keys[0].keypair,
  });
}

async function initOperatorDid() {
  const operatorDid = await web5.did.create(web5.did.MethodName.Ion, {
    services: [
      {
        'id': 'dwn',
        'type': 'DecentralizedWebNode',
        'serviceEndpoint': {
          'nodes': ['http://localhost:8085/dwn', 'http://localhost:8086/dwn', 'http://localhost:8087/dwn'],
        },
      },
    ],
  });
  return operatorDid;
}

async function initializeProtocols() {
  for (let { protocol, definition } of protocols) {
    const queryResponse = await web5.dwn.protocols.query(didState.id, {
      author: didState.id,
      message: {
        filter: { protocol },
      },
    });
    
    const [ existingProtocol ] = queryResponse.entries;

    if (existingProtocol) {
      continue;
    }

    const _ = await web5.dwn.protocols.configure(didState.id, {
      author: didState.id,
      message: { protocol, definition },
    });
  }
}

async function receiveHttp(ctx) {
  const encodedMessage = ctx.get(web5.transports.http.ENCODED_MESSAGE_HEADER);
  if (!encodedMessage) throw 'Message is missing or malformed';
  
  let { target, author, ...message } = await web5.transports.http.decodeMessage(encodedMessage);

  if (!author || !target || !message) {
    throw new Error('DWN-MESSAGE missing target, author, or message!');
  }

  const data = await getRawBody(ctx.req);

  console.log('TRACE - receiveHttp() - message:', message);

  return await web5.send(target, {
    author,
    data,
    message,
  });
}

export {
  getPort,
  initializeProtocols,
  initOperatorDid,
  loadConfig,
  receiveHttp,
  web5,
};
