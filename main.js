
import nacl from 'tweetnacl';
import { base64url } from "multiformats/bases/base64";

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

async function connect(){

  let keys = getKeys();
  let encodedOrigin = base64url.baseEncode(location.origin);
  console.log(encodedOrigin);

  triggerProtocolHandler(`web5://connect/${keys.encoded.publicKey}/${encodedOrigin}`);

  let result = await new Promise((resolve, reject) => {
    setTimeout(async () => {
      let port = 55_554;
      let maxPort = 65_536;
      while (port++ < maxPort) {
        try {
          let payload;
          const url = `http://localhost:${port}/connections/${keys.encoded.publicKey}`;
          try {
            payload = await fetch(url).then(res => res.json());
            if (!payload) {
              console.log(`Response from ${url} did not contain the expected values. response: ${JSON.stringify(payload)}`)
            }
          } catch (e) {
            console.log(`Failed to fetch ${url}. error: ${e}`);
          }

          const { pin, nonce, publicKey: theirPublicKey } = payload;
          const encryptedPinBytes = base64url.baseDecode(pin);
          const nonceBytes = new TextEncoder().encode(nonce);
          const theirPublicKeyBytes = base64url.baseDecode(theirPublicKey);

          let message = nacl.box.open(encryptedPinBytes, nonceBytes, theirPublicKeyBytes, keys.decoded.secretKey);

          if (message) {
            resolve(new TextDecoder().decode(message));
            break;
          }

        } catch (e) {
          console.log(e);
        }
      }
    }, 1000);
  });

  return result;
}

export {
  getKeys,
  connect
}