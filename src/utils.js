import nacl from 'tweetnacl';
import { Encoder } from '@tbd54566975/dwn-sdk-js';

function createWeakSingletonAccessor(creator) {
  let weakref = null;
  return function() {
    let object = weakref?.deref();
    if (!object) {
      object = creator();
      weakref = new WeakRef(object);
    }
    return object;
  };
}

function parseJSON(string) {
  try {
    return JSON.parse(string);
  } catch {
    return null;
  }
}

function parseURL(string) {
  try {
    return new URL(string);
  } catch {
    return null;
  }
}

/**
 * Set/detect the media type and return the data as bytes.
 */
const dataToBytes = (data, dataFormat) => {
  let dataBytes = data;

  // Check for Object or String, and if neither, assume bytes.
  const detectedType = toType(data);
  if ((dataFormat === 'text/plain') || (detectedType === 'string')) {
    dataFormat = 'text/plain';
    dataBytes = Encoder.stringToBytes(data);
  }
  else if ((dataFormat === 'application/json') || (detectedType === 'object')) {
    dataFormat = 'application/json';
    dataBytes = Encoder.objectToBytes(data);
  } else if (!dataFormat) {
    dataFormat = 'application/octet-stream';
  }

  return { dataBytes, dataFormat };
};

/**
 * Credit for toType() function:
 *   Angus Croll
 *   https://github.com/angus-c
 *   https://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
 */
const toType = (obj) => {
  return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
};

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
  createWeakSingletonAccessor,
  dataToBytes,
  decodePin,
  parseJSON,
  parseURL,
  triggerProtocolHandler,
};
