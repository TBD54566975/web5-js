import * as SDK from '@tbd54566975/dwn-sdk-js';
// import { importer } from 'ipfs-unixfs-importer';
import { Temporal } from '@js-temporal/polyfill';
import { Readable } from 'readable-stream';
import Blob from "cross-blob"

const Encoder = SDK.Encoder;

/**
 * Set/detect the media type, encode the data, and return as a Blob.
 */

const encodeData = (data, dataFormat) => {

  // Format was not provided so check for Object or String, and if neither, assume blob of raw data.
  if (!dataFormat) {
    const detectedType = toType(data);
    if (detectedType === 'string') {
      dataFormat = 'text/plain';
    }
    else if (detectedType === 'object') {
      dataFormat = 'application/json';
      data = Encoder.objectToBytes(data);
    }
  }

  // All data encapsulated in a Blob object that can be transported to a remote DWN and converted into a ReadableStream.
  const encodedData = data instanceof Blob ? data : new Blob([data], { type: dataFormat });

  return { encodedData, dataFormat };
};

/**
 * Credit for toType() function:
 *   Angus Croll
 *   https://github.com/angus-c
 *   https://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
 */
const toType = (obj) => {
  return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
}

function toReadableStream(data) {
  if (data instanceof ReadableStream) { // check if already a ReadableStream
    return data;
  }
  if (typeof ReadableStream === 'function') { // check if in browser
    return new ReadableStream({
      start(controller) {
        const reader = new FileReader();
        reader.onload = () => {
          controller.enqueue(reader.result);
          controller.close();
        };
        reader.onerror = (error) => {
          controller.error(error);
        };
        reader.readAsArrayBuffer(data);
      }
    });
  } else { // in Node.js
    return new Readable({
      read(size) {
        this.push(data);
        this.push(null);
      }
    });
  }
}


function getCurrentTimeInHighPrecision() {
  return Temporal.Now.instant().toString({ smallestUnit: 'microseconds' });
}

async function computeDagPbCid(content) {
  const asyncDataBlocks = importer([{ content }], undefined, { onlyHash: true, cidVersion: 1 });

  // NOTE: the last block contains the root CID
  let block;
  for await (block of asyncDataBlocks) { ; }

  return block.cid.toString();
}



export {
  encodeData,
  computeDagPbCid,
  toReadableStream,
  getCurrentTimeInHighPrecision
}
