/**
 * Uses duck typing to determine whether the stream is a web browser ReadableStream
 * or a Node.js Readable stream.
 */
export function isReadableWebStream(stream) {
  return typeof stream._read !== 'function';
}
