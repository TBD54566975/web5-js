
import nacl from 'tweetnacl';
import * as SDK from '@tbd54566975/dwn-sdk-js';
import { register } from './did';

/* Keys */

function getKeys() {
  let keys = JSON.parse(localStorage.getItem('keys') || null);
  if (keys) {
    keys = {
      encoded: keys,
      decoded: {
        publicKey: SDK.Encoder.base64UrlToBytes(keys.publicKey),
        secretKey: SDK.Encoder.base64UrlToBytes(keys.secretKey)
      }
    };
  }
  else {
    keys = nacl.box.keyPair();
    keys = {
      decoded: keys,
      encoded: {
        publicKey: SDK.Encoder.bytesToBase64Url(keys.publicKey),
        secretKey: SDK.Encoder.bytesToBase64Url(keys.secretKey)
      }
    };
    localStorage.setItem('keys', JSON.stringify(keys.encoded));
  }
  return keys;
}

/* Connect Flows */

async function triggerProtocolHandler(url) {
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

async function decodePin(result, secretKey) {
  const { pin, nonce, publicKey: theirPublicKey } = result;
  const encryptedPinBytes = SDK.Encoder.base64UrlToBytes(pin);
  const nonceBytes = new TextEncoder().encode(nonce);
  const theirPublicKeyBytes = SDK.Encoder.base64UrlToBytes(theirPublicKey);
  const encodedPin = nacl.box.open(encryptedPinBytes, nonceBytes, theirPublicKeyBytes, secretKey);
  result.pin = new TextDecoder().decode(encodedPin);
}

function getConnection() {
  return JSON.parse(localStorage.getItem('web5_connect') || null);
}

async function connect(options = {}) {
  const keys = getKeys();
  let connection = getConnection();
  if (connection) {
    options?.onConnected?.(connection);
    register({
      connected: true,
      did: connection.did,
      endpoint: `http://localhost:${connection.port}/dwn`,
    });
    return connection;
  }

  if (options?.prompt === false) {
    return null;
  }

  const encodedOrigin = SDK.Encoder.bytesToBase64Url(location.origin);
  triggerProtocolHandler(`web5://connect/${keys.encoded.publicKey}/${encodedOrigin}`);

  function destroySocket(socket) {
    socket.close();
    socket.removeEventListener('open', handleOpen);
    socket.removeEventListener('message', handleMessage);
  }

  function handleOpen(event) {
    const socket = event.target;
    socket.addEventListener('message', handleMessage);
    sockets.add(socket);
  }

  async function handleMessage(event) {
    const socket = event.target;

    let json;
    try {
      json = JSON.parse(event.data);
    } catch { }

    switch (json?.type) {
    case 'connected':
      if (!json.data) {
        destroySocket(socket);
        sockets.delete(socket);
        return;
      }

      localStorage.setItem('web5_connect', JSON.stringify(json.data));
      options?.onConnected?.(json.data);
      break;

    case 'requested':
      if (!json.data) {
        destroySocket(socket);
        sockets.delete(socket);
        return;
      }

      try {
        await decodePin(json.data, keys.decoded.secretKey);
      } catch {
        destroySocket(socket);
        sockets.delete(socket);
        return;
      }

      options?.onRequest?.(json.data);
      return;

    case 'blocked':
    case 'denied':
    case 'closed':
      options?.onDenied?.();
      break;

    case 'unknown':
      return;
    }

    sockets.forEach(destroySocket);
    sockets.clear();
  }

  const sockets = new Set();
  for (let port = 55_500; port <= 55_600; ++port) {
    const socket = new WebSocket(`ws://localhost:${port}/connections/${keys.encoded.publicKey}`);
    socket.addEventListener('open', handleOpen);
  }
}

export {
  connect
};
