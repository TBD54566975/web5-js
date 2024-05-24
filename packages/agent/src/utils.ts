import type { DidUrlDereferencer } from '@web5/dids';
import type { PaginationCursor, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

import { DateSort } from '@tbd54566975/dwn-sdk-js';
import { Readable } from '@web5/common';
import { utils as didUtils } from '@web5/dids';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';
import { DwnInterfaceName, DwnMethodName, Message, RecordsWrite } from '@tbd54566975/dwn-sdk-js';

export function blobToIsomorphicNodeReadable(blob: Blob): Readable {
  return webReadableToIsomorphicNodeReadable(blob.stream() as ReadableStream<any>);
}

export async function getDwnServiceEndpointUrls(didUri: string, dereferencer: DidUrlDereferencer): Promise<string[]> {
  // Attempt to dereference the DID service with ID fragment #dwn.
  const dereferencingResult = await dereferencer.dereference(`${didUri}#dwn`);

  if (dereferencingResult.dereferencingMetadata.error) {
    throw new Error(`Failed to dereference '${didUri}#dwn': ${dereferencingResult.dereferencingMetadata.error}`);
  }

  if (didUtils.isDwnDidService(dereferencingResult.contentStream)) {
    const { serviceEndpoint } = dereferencingResult.contentStream;
    const serviceEndpointUrls = typeof serviceEndpoint === 'string'
    // If the service endpoint is a string, format it as a single-element array.
      ? [serviceEndpoint]
      : Array.isArray(serviceEndpoint) && serviceEndpoint.every(endpoint => typeof endpoint === 'string')
      // If the service endpoint is an array of strings, use it as is.
        ? serviceEndpoint as string[]
        // If the service endpoint is neither a string nor an array of strings, return an empty array.
        : [];

    if (serviceEndpointUrls.length > 0) {
      return serviceEndpointUrls;
    }
  }

  // If the DID service with ID fragment #dwn was not found or is not valid, return an empty array.
  return [];
}

export function getRecordAuthor(record: RecordsWriteMessage): string | undefined {
  return RecordsWrite.getAuthor(record);
}

export function isRecordsWrite(obj: unknown): obj is RecordsWrite {
  // Validate that the given value is an object.
  if (!obj || typeof obj !== 'object' || obj === null) return false;

  // Validate that the object has the necessary properties of RecordsWrite.
  return (
    'message' in obj && typeof obj.message === 'object' && obj.message !== null &&
    'descriptor' in obj.message && typeof obj.message.descriptor === 'object' && obj.message.descriptor !== null &&
    'interface' in obj.message.descriptor && obj.message.descriptor.interface === DwnInterfaceName.Records &&
    'method' in obj.message.descriptor && obj.message.descriptor.method === DwnMethodName.Write
  );
}

/**
 * Get the CID of the given RecordsWriteMessage.
 */
export function getRecordMessageCid(message: RecordsWriteMessage): Promise<string> {
  return Message.getCid(message);
}

/**
 *  Get the pagination cursor for the given RecordsWriteMessage and DateSort.
 *
 * @param message The RecordsWriteMessage for which to get the pagination cursor.
 * @param dateSort The date sort that will be used in the query or subscription to which the cursor will be applied.
 */
export async function getPaginationCursor(message: RecordsWriteMessage, dateSort: DateSort): Promise<PaginationCursor> {
  const value = dateSort === DateSort.CreatedAscending || dateSort === DateSort.CreatedDescending ?
    message.descriptor.dateCreated : message.descriptor.datePublished;

  if (value === undefined) {
    throw new Error('The dateCreated or datePublished property is missing from the record descriptor.');
  }

  return {
    messageCid: await getRecordMessageCid(message),
    value
  };
}

export function webReadableToIsomorphicNodeReadable(webReadable: ReadableStream<any>) {
  return new ReadableWebToNodeStream(webReadable);
}

export function appendPathToUrl({ path, url }: { url: string, path: string }): string {
  const urlObject = new URL(url);
  const lastChar = urlObject.pathname.slice(-1);

  if (lastChar === '/') {
    urlObject.pathname += path;
  } else {
    urlObject.pathname += `/${path}`;
  }

  return urlObject.toString();
}

export async function poll<T>(fn: () => Promise<T>, options: { interval: number, validate?: (result: T) => boolean, abortSignal?: AbortSignal }): Promise<T>;
export async function poll<T>(fn: () => Promise<T>, options: { interval: number, validate?: (result: T) => boolean, abortSignal?: AbortSignal, callback?: (result: T) => Promise<void> }): Promise<void>;
export async function poll<T>(
  fn: () => Promise<T>,
  {
    interval,
    validate = () => true,
    abortSignal,
    callback,
  }: {
    interval: number,
    validate?: (result: T) => boolean,
    abortSignal?: AbortSignal,
    callback?: (result: T) => Promise<void>
  }
): Promise<void | T> {
  while (!abortSignal?.aborted) {
    try {
      const result = await fn();
      // If the result is valid...
      if (validate(result)) {
        // ...and a `callback` function is not provided, return the result.
        if (!callback) return result;
        // ...otherwise, invoke the callback and continue polling.
        callback(result);
      }
    } catch (error) { /* Ignore errors and continue polling. */ }

    // Await the interval.
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Retries an asynchronous function a specified number of times at given intervals.
 *
 * @template T - The type of the result returned by the asynchronous function.
 * @param {() => Promise<T>} fn - The asynchronous function to retry.
 * @param {Object} options - An object specifying retry options.
 * @param {number} options.maxRetries - The maximum number of retry attempts.
 * @param {number} options.interval - The delay between retries in milliseconds.
 * @param {string} options.errorMsg - The error message to throw if all retries fail.
 * @param {(result: T) => boolean} [options.validate = () => true] - An optional validation function
 *                                                                   that returns a boolean
 *                                                                   indicating whether the result
 *                                                                   is valid.
 *
 * @returns {Promise<T>} - A Promise that resolves to the result of the asynchronous function if it
 *                         succeeds within the specified number of retries, or rejects with an error
 *                         if all retries fail.
 *
 * @throws Will throw an error if the function fails to produce a valid result after the specified
 *         number of retries, or if the validation function consistently returns `false`.
 *
 * @example
 * const result = await retry(
 *   () => someAsyncFunction(),
 *   {
 *     maxRetries: 3,
 *     interval: 100,
 *     errorMsg: 'Failed after 3 retries',
 *     validate: (result) => result !== undefined,
 *   }
 * );
 */
export async function retry<T>(
  fn: () => Promise<T>,
  {
    maxRetries,
    interval,
    errorMsg,
    validate = () => true,
  }: {
    maxRetries: number,
    interval: number,
    errorMsg: string,
    validate?: (result: T) => boolean
  }
): Promise<T> {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const result = await fn();
      if (validate(result)) {
        return result;
      }
      throw new Error('Validation failed');
    } catch (error) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
  throw new Error(errorMsg);
}