import { DwnConstant, Encoder } from '@tbd54566975/dwn-sdk-js';

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

/**
 * Checks if the provided data size is under the cache limit.
 * The cache limit is based on the maxDataSizeAllowedToBeEncoded defined in the DWN SDK.
 *
 * @export
 * @param {number} dataSize - The size of the data to be checked, in bytes.
 * @returns {boolean} True if the data size is less than or equal to the maximum allowed data size, false otherwise.
 *
 * @example
 * // Returns: true
 * isDataSizeUnderCacheLimit(5000);
 *
 * @example
 * // Returns: false
 * isDataSizeUnderCacheLimit(15000);
 */
export function isDataSizeUnderCacheLimit(dataSize: number): boolean {
  return dataSize <= DwnConstant.maxDataSizeAllowedToBeEncoded;
}

/**
 * Set/detect the media type and return the data as bytes.
 */
export const dataToBlob = (data: any, dataFormat?: string) => {
  let dataBlob: Blob;

  // Check for Object or String, and if neither, assume bytes.
  const detectedType = toType(data);
  if (dataFormat === 'text/plain' || detectedType === 'string') {
    dataBlob = new Blob([data], { type: 'text/plain' });
  } else if (dataFormat === 'application/json' || detectedType === 'object') {
    const dataBytes = Encoder.objectToBytes(data);
    dataBlob = new Blob([dataBytes], { type: 'application/json' });
  } else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    dataBlob = new Blob([data], { type: 'application/octet-stream' });
  } else if (data instanceof Blob) {
    dataBlob = data;
  } else {
    throw new Error('data type not supported.');
  }

  dataFormat = dataFormat || dataBlob.type || 'application/octet-stream';

  return { dataBlob, dataFormat };
};

export function isEmptyObject(obj) {
  if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj).length === 0;
  }
  return false;
}

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

export function objectValuesBase64UrlToBytes(obj) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, Encoder.base64UrlToBytes(value as string)]));
}

export function objectValuesBytesToBase64Url(obj) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, Encoder.bytesToBase64Url(value as Uint8Array)]));
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

export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
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