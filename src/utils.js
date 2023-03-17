import * as SDK from '@tbd54566975/dwn-sdk-js';

/**
 * Set/detect the media type and return the data as bytes.
 */
const dataToBytes = (data, dataFormat) => {
  let dataBytes = data;

  // Check for Object or String, and if neither, assume bytes.
  const detectedType = toType(data);
  if ((dataFormat === 'text/plain') || (detectedType === 'string')) {
    dataFormat = 'text/plain';
    dataBytes = SDK.Encoder.stringToBytes(data);
  }
  else if ((dataFormat === 'application/json') || (detectedType === 'object')) {
    dataFormat = 'application/json';
    dataBytes = SDK.Encoder.objectToBytes(data);
  } else if (!dataFormat) {
    dataFormat = 'application/octet-stream';
  }

  return { dataBytes, dataFormat };
};

function memoryCache(options = {}) {
  let store = {};
  const ttl = options?.ttl ?? 60 * 60 * 1000; // 1 hour default time-to-live
  return {
    del: (key) => {
      clearTimeout(store[key].timeoutId);
      delete store[key];
    },
    get: (key) => {
      return store[key]?.value;
    },
    reset: () => {
      for (let key in store) {
        clearTimeout(store[key].timeoutId);
      }
      store = {};
    },
    set: (key, value, timeout) => {
      let timeoutId = (timeout === Infinity) ? undefined : setTimeout(() => { delete store[key]; }, timeout || ttl);
      store[key] = { value, timeoutId };
    }
  };
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

export {
  dataToBytes,
  memoryCache
};
