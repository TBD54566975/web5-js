import type { PublicKeyJwk } from '@tbd54566975/crypto';
import type { EncryptionInput } from '@tbd54566975/dwn-sdk-js';

import { utils as cryptoUtils } from '@tbd54566975/crypto';
import { PassThrough, Readable } from 'readable-stream';
import { Encryption, KeyDerivationScheme } from '@tbd54566975/dwn-sdk-js';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';

export type EncryptInputOptions = {
  protocol?: string;
  schema?: string;
}

export function blobToIsomorphicNodeReadable(blob: Blob): Readable {
  return webReadableToIsomorphicNodeReadable(blob.stream());
}

export function generateDwnEncryptionInput(publickKeyJwk: PublicKeyJwk, encryptionInputOptions: EncryptInputOptions): EncryptionInput {
  // Generate random symmetric encryption key.
  const symmetricKey = cryptoUtils.randomBytes(32);

  // Generate random initialization vector.
  const initializationVector = cryptoUtils.randomBytes(16);

  const encryptionInput: EncryptionInput = {
    initializationVector : initializationVector,
    key                  : symmetricKey,
    keyEncryptionInputs  : []
  };

  // Always add the DataFormats derivation scheme since `dataFormats` is a required record property.
  encryptionInput.keyEncryptionInputs.push({
    derivationScheme : KeyDerivationScheme.DataFormats,
    publicKey        : publickKeyJwk
  });

  // Add Protocols derivation scheme only if `protocols` is defined.
  if (encryptionInputOptions.protocol) {
    encryptionInput.keyEncryptionInputs.push({
      derivationScheme : KeyDerivationScheme.Protocols,
      publicKey        : publickKeyJwk
    });
  }

  // Add Schemas derivation scheme if `schema` is defined.
  if (encryptionInputOptions.schema) {
    encryptionInput.keyEncryptionInputs.push({
      derivationScheme : KeyDerivationScheme.Schemas,
      publicKey        : publickKeyJwk
    });
  }

  return encryptionInput;
}

export async function encryptBlobToStream(encryptionInput: EncryptionInput, plaintextBlob: Blob): Promise<Readable> {
  if (!(plaintextBlob instanceof Blob)) {
    throw new TypeError('Argument plaintextBlob must be a Blob');
  }

  // Convert plaintext blob to Node Readable.
  const plaintextStream = blobToIsomorphicNodeReadable(plaintextBlob);

  // Encrypt the data stream.
  const symmetricKey = encryptionInput.key;
  const initializationVector = encryptionInput.initializationVector;
  const cipherStream = await Encryption.aes256CtrEncrypt(symmetricKey, initializationVector, plaintextStream);

  return cipherStream;
}

export async function encryptStream(encryptionInput: EncryptionInput, plaintextStream: Readable): Promise<Readable> {
  if (isWebReadableStream(plaintextStream)) {
    throw new TypeError('argument plaintextStream must be a Node.js Readable.');
  }

  // Encrypt the data stream.
  const symmetricKey = encryptionInput.key;
  const initializationVector = encryptionInput.initializationVector;
  const cipherStream = await Encryption.aes256CtrEncrypt(symmetricKey, initializationVector, plaintextStream);

  return cipherStream;
}

export function isNodeReadableStream (stream: Readable): boolean {
  return stream &&
    typeof stream === 'object' &&
    typeof stream.pipe === 'function' &&
    typeof stream.on === 'function';
}

export function isWebReadableStream (stream: Readable): boolean {
  return stream && !isNodeReadableStream;
}

/**
 * Converts a readable stream or iterable to Blob.
 * Note: Reads entire stream contents into memory.
 */
export async function streamToBlob(stream: AsyncIterable<any>|ReadableStream|Readable): Promise<Blob> {
  const chunks = [];
  //@ts-expect-error that not all `stream` types have a '[Symbol.asyncIterator]()' method that returns an async iterator
  for await (const chunk of stream)
    chunks.push(chunk);
  return new Blob(chunks);
}

export function webReadableToIsomorphicNodeReadable(webReadable: ReadableStream) {
  return new ReadableWebToNodeStream(webReadable);
}

export function teeNodeReadable(stream: Readable): [Readable, Readable] {
  const pass1 = new PassThrough();
  const pass2 = new PassThrough();
  stream.pipe(pass1);
  stream.pipe(pass2);
  return [<unknown>pass1 as Readable, <unknown>pass2 as Readable];
}