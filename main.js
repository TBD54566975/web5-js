
import nacl from 'tweetnacl';
import merge from 'deepmerge';
import * as DWN from '@tbd54566975/dwn-sdk-js';
import { base64url } from 'multiformats/bases/base64';


/* Keys */

function getKeys(){
  let keys = JSON.parse(localStorage.getItem('keys') || null);
  if (keys) {
    keys = {
      encoded: keys,
      decoded: {
        publicKey: base64url.baseDecode(keys.publicKey),
        secretKey: base64url.baseDecode(keys.secretKey)
      }
    }
  }
  else {
    keys = nacl.box.keyPair();
    keys = {
      decoded: keys,
      encoded: {
        publicKey: base64url.baseEncode(keys.publicKey),
        secretKey: base64url.baseEncode(keys.secretKey)
      }
    }
    localStorage.setItem('keys', JSON.stringify(keys.encoded))
  }
  return keys;
}

/* Connect Flows */

async function triggerProtocolHandler(url){
  let form = document.createElement('form');
      form.action = url;
      document.body.append(form);
      form.submit();
      form.remove();

  // var iframe = document.createElement('iframe');
  //     iframe.src = url;
  //     document.body.appendChild(iframe);
  //     setTimeout(() => iframe.remove(), 10);
}


function abortConnect(intervals, controller){
  intervals.forEach(interval => clearInterval(interval));
  intervals.length = 0;
  controller.abort();
}

async function fetchConnection(port, keys, events, intervals, resetTimeout, abortController, looping){
  return fetch(`http://localhost:${port}/connections/${keys.encoded.publicKey}`, {
    signal: abortController.signal
  }).then(async res => {
    if (res.headers.get('X-WEB5-UA')) {
      if (res.status === 404) {
        if (looping) {
          resetTimeout(true);
          abortConnect(intervals, abortController);
          events?.onDenied();
        }
        else return true;
      }
      else if (res.status === 200) {
        const result = await res.json();
        result.port = port;
        if (result.connected) {
          resetTimeout(true);
          abortConnect(intervals, abortController);
          localStorage.setItem('web5_connect', JSON.stringify(result));
          events?.onConnected(result);
        }
        else if (!looping){
          resetTimeout();
          abortConnect(intervals, abortController);
          decodePin(result, keys.decoded.secretKey).then(() => {
            events?.onRequest(result);
            intervals.push(setInterval(() => {
              fetchConnection(port, keys, events, intervals, resetTimeout, new AbortController(), true)
            }, 100));
          }).catch(e => {
            events?.onError(e);
          })
        }
      }
      else {
        resetTimeout(true);
        abortConnect(intervals, abortController);
        events?.[res.status === 404 ? 'onDenied' : 'onError']();
      }
    }
  }).catch(e => {
    console.log(e);
    return false;
  })
}

async function decodePin(result, secretKey){
  const { pin, nonce, publicKey: theirPublicKey } = result;
  const encryptedPinBytes = base64url.baseDecode(pin);
  const nonceBytes = new TextEncoder().encode(nonce);
  const theirPublicKeyBytes = base64url.baseDecode(theirPublicKey);
  const encodedPin = nacl.box.open(encryptedPinBytes, nonceBytes, theirPublicKeyBytes, secretKey);
  result.pin = new TextDecoder().decode(encodedPin);
}

function getConnection(){
  return JSON.parse(localStorage.getItem('web5_connect') || null);
}

async function connect(options = {}){

  const keys = getKeys();
  let connection = getConnection();
  if (connection) {
    if (options.refresh) {
      connection = await fetch(`http://localhost:${connection.port}/connections/${keys.encoded.publicKey}`).then(async res => {
        return res.status === 200 && await res.json();
      }).catch(e => false);
      if (connection) {
        options?.onConnected(connection);
        return connection;
      }
      else options?.onError();
    }
    else {
      options?.onConnected(connection);
      return connection;
    }
  }

  const encodedOrigin = base64url.baseEncode(location.origin);
  triggerProtocolHandler(`web5://connect/${keys.encoded.publicKey}/${encodedOrigin}`);

  let timeout;
  let wallets = [];
  let intervals = [];
  let currentPort = 55_500;
  let maxPort = 55_600;
  let abortController = new AbortController();

  const resetTimeout = (clear) => {
    clearTimeout(timeout);
    if (!clear) timeout = setTimeout(() => {
      abortConnect(intervals, abortController);
      options?.onTimeout();
    }, 60000);
  }

  resetTimeout();

  intervals.push(setInterval(async () => {
    if (currentPort <= maxPort) {
      const isWallet = await fetchConnection(currentPort, keys, options, intervals, resetTimeout, abortController);
      if (isWallet) wallets.push(currentPort);
      currentPort++;
    }
  }, 10));

  intervals.push(setInterval(async () => {
    wallets.forEach(port =>{
      fetchConnection(port, keys, options, intervals, resetTimeout, abortController);
    })
  }, 100));

}

/* DWeb Nodes */

async function sendDWebMessage(request){
  let endpoint;
  let connection;
  if (!request.target) {
    connection = getConnection();
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

const DWeb = {
  records: {
    async query(props){
      const { message } = props;
      return sendDWebMessage({
        target: props.target,
        message: merge.all([{
          filter: {
            dataFormat: 'application/json'
          }
        },
        message,
        {
          interface: 'Records',
          method: 'Query'
        }])
      }).then(raw => raw.json())
    }
  }
}

export {
  DWeb,
  getKeys,
  connect,
  getConnection
}


