import type { Readable } from 'readable-stream';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';

export function blobToIsomorphicNodeReadable(blob: Blob): Readable {
  return new ReadableWebToNodeStream(blob.stream());
}