import nacl from 'tweetnacl';
import { Encoder } from '@tbd54566975/dwn-sdk-js';

const textDecoder = new TextDecoder();

// TODO: Remove if this method is ever added to the DWN SDK Encoder class
export function base64UrlToString(base64urlString) {
  const bytes = Encoder.base64UrlToBytes(base64urlString);
  return Encoder.bytesToString(bytes);
}

// TODO: Remove if this method is ever added to the DWN SDK Encoder class
export function bytesToObject(bytes) {
  const objectString = textDecoder.decode(bytes);
  return JSON.parse(objectString);
}

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

function isEmptyObject(obj) {
  if (typeof obj === 'object' && obj !== null) {
    for (const _ in obj) {
      return false;
    }
    return true;
  }
  return false;
}

function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function parseURL(str) {
  try {
    return new URL(str);
  } catch {
    return null;
  }
}

function pascalToKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
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
 * Simplistic initial implementation to check whether messages that are being routed
 * to process locally or be transported to a remote DWN are already signed.
 * 
 * TODO: Consider whether cryptographic signature verification is warranted or if
 *       the naive check is sufficient given that DWNs already verify authenticity
 *       and integrity of every message.
 * @param {{}} message 
 * @returns boolean
 */
function isUnsignedMessage(message) {
  return message?.message?.authorization ? false : true;
}

function objectValuesBytesToBase64Url(obj) {
  const result = { };
  for (const key in obj) {
    result[key] = Encoder.bytesToBase64Url(obj[key]);
  }
  return result;
}

function objectValuesBase64UrlToBytes(obj) {
  const result = { };
  for (const key in obj) {
    result[key] = Encoder.base64UrlToBytes(obj[key]);
  }
  return result;
}

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
  isEmptyObject,
  isUnsignedMessage,
  objectValuesBase64UrlToBytes,
  objectValuesBytesToBase64Url,
  parseJSON,
  parseURL,
  pascalToKebabCase,
  triggerProtocolHandler,
};
