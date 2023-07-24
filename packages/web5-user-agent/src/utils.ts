import type { Readable } from 'readable-stream';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';
import { Encoder} from '@tbd54566975/dwn-sdk-js';

export function blobToIsomorphicNodeReadable(blob: Blob): Readable {
  return webReadableToIsomorphicNodeReadable(blob.stream());
}

export function webReadableToIsomorphicNodeReadable(webReadable: ReadableStream) {
  return new ReadableWebToNodeStream(webReadable);
}

export function dataToBlob(data, dataFormat){
  let dataBlob;
  // Check for Object or String, and if neither, assume bytes.
  const detectedType = toType(data);
  if (dataFormat === 'text/plain' || detectedType === 'string') {
    dataBlob = new Blob([data], { type: 'text/plain' });
  }
  else if (dataFormat === 'application/json' || detectedType === 'object') {
    const dataBytes = Encoder.objectToBytes(data);
    dataBlob = new Blob([dataBytes], { type: 'application/json' });
  }
  else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    dataBlob = new Blob([data], { type: 'application/octet-stream' });
  }
  else if (data instanceof Blob) {
    dataBlob = data;
  }
  else {
    throw new Error('data type not supported.');
  }
  dataFormat = dataFormat || dataBlob.type || 'application/octet-stream';
  return { dataBlob, dataFormat };
}


function toType(obj){
  return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
}