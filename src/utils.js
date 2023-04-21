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

export function createWeakSingletonAccessor(creator) {
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

export function isEmptyObject(obj) {
  if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj).length === 0;
  }
  return false;
}

export function parseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function parseUrl(str) {
  try {
    return new URL(str);
  } catch {
    return null;
  }
}

export function pascalToKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Set/detect the media type and return the data as bytes.
 */
export const dataToBytes = (data, dataFormat) => {
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
export function isUnsignedMessage(message) {
  return message?.message?.authorization ? false : true;
}

export function objectValuesBytesToBase64Url(obj) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, Encoder.bytesToBase64Url(value)]));
}

export function objectValuesBase64UrlToBytes(obj) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, Encoder.base64UrlToBytes(value)]));
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
