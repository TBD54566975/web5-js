
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
  let abortController = new AbortController();
  let result = await new Promise((resolve, reject) => {
    setTimeout(async () => {
      let currentPort = 55_555;
      let maxPort = 56_555;
      let targetPorts = [];

      intervals.push(setInterval(function() {
        if (currentPort <= maxPort) {
          const thisPort = currentPort;
          getConnectionInfo(thisPort, keys, abortController).then(result => {
            if (result === 'candidate') targetPorts.push(thisPort);
            else resolve(result);
          });
          currentPort++;
        }
      }, 10))

      intervals.push(setInterval(function() {
        targetPorts.forEach(port => {
          getConnectionInfo(port, keys, abortController).then(result => {
            if (result !== 'candidate') resolve(result);
          })
        })
      }, 1000));

      setTimeout(() => resolve('timeout'), 90000);

    }, 1000);
  }).catch(e => {
    abortFetching(intervals, abortController);
    throw new Error('Promise catch: ', e);
  })

  abortFetching(intervals, abortController);

  if (result === 'timeout') throw new Error ('Request timed out')
  else return result;
}

async function getConnectionInfo(port, keys, controller, connectedCheck){
  const url = `http://localhost:${port}/connections/${keys.encoded.publicKey}`;
  try {
    let result = await fetch(url, {
      signal: controller ? controller.signal : null
    }).then(async res => {
      if (res.headers.get('X-WEB5-UA')) {
        switch (res.status) {
          case 200: return res.json()
          case 204: return 'candidate';
          case 403: return 'denied';
        }
      }
    });
    console.log('result', result);
    if (!result || result === 'candidate' || result === 'denied') return result;

    if (!connectedCheck) {
      const { pin, nonce, publicKey: theirPublicKey } = result;
      const encryptedPinBytes = base64url.baseDecode(pin);
      const nonceBytes = new TextEncoder().encode(nonce);
      const theirPublicKeyBytes = base64url.baseDecode(theirPublicKey);
      const encodedPin = nacl.box.open(encryptedPinBytes, nonceBytes, theirPublicKeyBytes, keys.decoded.secretKey);
      result.port = port;
      result.pin = new TextDecoder().decode(encodedPin);
      result.connected = new Promise((resolve, reject) => {
        if (result.connected) return resolve(true);
        const interval = setInterval(() => {
          getConnectionInfo(port, keys, null, true).then(result => {
            if (result?.connected) {
              clearInterval(interval);
              resolve(true);
            }
            else if (result === 'denied') {
              clearInterval(interval);
              reject();
            }
          })
        }, 500);
        setTimeout(() => {
          clearInterval(interval);
          reject('timeout')
        }, 90000);
      })
    }

    return result;

  } catch (e) {
    return null;
  }
}

export {
  getKeys,
  connect
}


