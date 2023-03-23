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

/**
 * Runs promise-returning and async functions in series until the first one fulfills or all reject
 * 
 * Returns a Promise that is fulfilled when the first Promise is fulfilled or rejects if all of the
 * Promises reject. Rather than stopping when a Promise rejects, the next Promise in the input array
 * is executed. This continues until a Promise fulfills or the end of the array is reached.
 * 
 * This execution strategy is used for specific cases like attempting to write large data streams to
 * the DWN endpoints listed in a DID document. It would be inefficient to attempt to write data to
 * multiple endpoints in parallel until the first one completes. Instead, we only try the next DWN if
 * there is a failure.  Additionally, per the DWN Specification, implementers SHOULD select from the
 * Service Endpoint URIs in the nodes array in index order, so this function makes that approach easy.
 * 
 * @param {[Promise]} tasks
 * @returns Promise<any>
 */
function promiseSeriesAny(tasks) {
  let index = 0;

  function tryNextTask() {
    if (index >= tasks.length) {
      return Promise.reject(new Error('All promises rejected.'));
    }

    const task = tasks[index++];

    return task()
      .then(result => { return result; })
      .catch(_ => { return tryNextTask(); });
  }

  return tryNextTask();
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
  isUnsignedMessage,
  parseJSON,
  parseURL,
  promiseSeriesAny,
  triggerProtocolHandler,
};
