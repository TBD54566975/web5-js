import * as SDK from '@tbd54566975/dwn-sdk-js';

/**
 * Set/detect the media type, encode the data, and return as a Blob.
 */
const encodeData = (data, dataFormat) => {
  let dataBytes = data;

  // Format was not provided so check for Object or String, and if neither, assume blob of raw data.
  if (!dataFormat) {
    const detectedType = toType(data);
    if (detectedType === 'string') {
      dataFormat = 'text/plain';
      dataBytes = SDK.Encoder.stringToBytes(data);
    }
    else if (detectedType === 'object') {
      dataFormat = 'application/json';
      dataBytes = SDK.Encoder.objectToBytes(data);
    } else {
      dataFormat = 'application/octet-stream';
    }
  }

  // All data encapsulated in a Blob object that can be transported to a remote DWN and converted into a ReadableStream.
  const encodedData = new Blob([dataBytes], { type: dataFormat });

  return { encodedData, dataFormat };
};

function memoryCache(options) {
  let store = {};
  return {
    del: (key) => delete store[key],
    get: (key) => { return store[key]; },
    reset: () => store = {}, 
    set: (key, value) => store[key] = value,
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
  encodeData,
  memoryCache
};
