
import nacl from 'tweetnacl';
import { base64url } from 'multiformats/bases/base64';

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
  console.log(keys);
  return keys;
}

// Extend with the ability to trigger from Node as well
async function triggerProtocolHandler(url){
  let form = document.createElement('form');
      form.action = url;
      document.body.append(form);
      form.submit();
      form.remove();

  // let win = window.open(url, '_blank');
  // win.close();

  // var iframe = document.createElement('iframe');
  //     iframe.src = url;
  //     document.body.appendChild(iframe);
  //     setTimeout(() => iframe.remove(), 10);
}

// function createWorker(fn) {
//   var blob = new Blob([`self.onmessage = function(e){
//     importScripts(e.data.imports);

//   }`], {
//     type: "text/javascript"
//   });
//   var url = window.URL.createObjectURL(blob);
//   return new Worker(url);
// }

function abortFetching(intervals, controller){
  intervals.forEach(interval => clearInterval(interval));
  controller.abort();
}

async function connect(){

  let keys = getKeys();
  let encodedOrigin = base64url.baseEncode(location.origin);

  triggerProtocolHandler(`web5://connect/${keys.encoded.publicKey}/${encodedOrigin}`);

  const intervals = [];
  let abordController = new AbortController();
  let result = await new Promise((resolve, reject) => {
    setTimeout(async () => {
      let currentPort = 55_555;
      let maxPort = 56_555;
      let targetPorts = [];

      intervals.push(setInterval(function() {
        if (currentPort <= maxPort) {
          const thisPort = currentPort;
          getPendingConnection(thisPort, keys, abordController).then(result => {
            if (result) resolve(result);
            else if (result === null) targetPorts.push(thisPort);
          });
          currentPort++;
        }
      }, 10))

      intervals.push(setInterval(function() {
        targetPorts.forEach(port => {
          getPendingConnection(port, keys, abordController).then(result => {
            if (result) resolve(result);
          })
        })
      }, 1000));

      setTimeout(() => reject(), 90000);

    }, 1000);
  }).catch(e => {
    abortFetching(intervals, abordController);
    console.log('Promise catch: ', e);
  })

  abortFetching(intervals, abordController);

  console.log('found it!: ', result);

  if (result) return 'connected';
  else if (!result) return 'denied';
}

async function getPendingConnection(port, keys, controller){
  try {
    let payload;
    const url = `http://localhost:${port}/connections/pending/${keys.encoded.publicKey}`;
    try {
      payload = await fetch(url, {
        signal: controller.signal
      }).then(res => {
        return res.status === 204 ? null : res.json();
      });

      console.log(payload);

      if (payload === null) return null;
      else if (!payload) {
        // console.log(`Response from ${url} did not contain the expected values. response: ${JSON.stringify(payload)}`);
      }

    } catch (e) {
      // console.log(`Failed to fetch ${url}. error: ${e}`);
    }

    if (payload) {
      if (payload.connected) return payload;
      const { pin, nonce, publicKey: theirPublicKey } = payload;
      const encryptedPinBytes = base64url.baseDecode(pin);
      const nonceBytes = new TextEncoder().encode(nonce);
      const theirPublicKeyBytes = base64url.baseDecode(theirPublicKey);

      let message = nacl.box.open(encryptedPinBytes, nonceBytes, theirPublicKeyBytes, keys.decoded.secretKey);

      if (message) {
        return new TextDecoder().decode(message);
      }
    }

  } catch (e) {
    console.log(e);
  }
}

export {
  getKeys,
  connect
}


