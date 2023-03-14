import nacl from 'tweetnacl';
import { Encoder } from '@tbd54566975/dwn-sdk-js';

/**
 * Set/detect the media type, encode the data, and return as a Blob.
 */
function encodeData(data, dataFormat) {
  let dataBytes = data;

  // Format was not provided so check for Object or String, and if neither, assume blob of raw data.
  if (!dataFormat) {
    const detectedType = toType(data);
    if (detectedType === 'string') {
      dataFormat = 'text/plain';
      dataBytes = Encoder.stringToBytes(data);
    }
    else if (detectedType === 'object') {
      dataFormat = 'application/json';
      dataBytes = Encoder.objectToBytes(data);
    } else {
      dataFormat = 'application/octet-stream';
    }
  }

  // All data encapsulated in a Blob object that can be transported to a remote DWN and converted into a ReadableStream.
  const encodedData = new Blob([dataBytes], { type: dataFormat });

  return { encodedData, dataFormat };
}

/**
 * Credit for toType() function:
 *   Angus Croll
 *   https://github.com/angus-c
 *   https://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
 */
function toType(obj) {
  return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
}

async function triggerProtocolHandler(url) {
  let form = document.createElement('form');
  form.action = url;
  document.body.append(form);
  form.submit();
  form.remove();
}

async function decodePin(data, secretKey) {
  const { pin, nonce, publicKey } = data;
  const encryptedPinBytes = Encoder.base64UrlToBytes(pin);
  const nonceBytes = new TextEncoder().encode(nonce);
  const publicKeyBytes = Encoder.base64UrlToBytes(publicKey);
  const encodedPin = nacl.box.open(encryptedPinBytes, nonceBytes, publicKeyBytes, secretKey);
  data.pin = new TextDecoder().decode(encodedPin);
}

export {
  encodeData,
  decodePin,
  triggerProtocolHandler,
};
