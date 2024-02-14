import { Readable } from '@web5/common';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';

export function blobToIsomorphicNodeReadable(blob: Blob): Readable {
  return webReadableToIsomorphicNodeReadable(blob.stream() as ReadableStream<any>);
}

export function webReadableToIsomorphicNodeReadable(webReadable: ReadableStream<any>) {
  return new ReadableWebToNodeStream(webReadable);
}