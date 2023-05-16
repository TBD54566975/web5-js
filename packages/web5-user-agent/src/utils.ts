import type { Readable } from 'readable-stream';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';

export function blobToIsomorphicNodeReadable(blob: Blob): Readable {
  return webReadableToIsomorphicNodeReadable(blob.stream());
}

export function webReadableToIsomorphicNodeReadable(webReadable: ReadableStream) {
  return new ReadableWebToNodeStream(webReadable);
}