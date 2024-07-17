import type { DidUrlDereferencer } from '@web5/dids';
import type { PaginationCursor, RecordsDeleteMessage, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

import { Readable } from '@web5/common';
import { utils as didUtils } from '@web5/dids';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';
import { DateSort, DwnInterfaceName, DwnMethodName, Message, Records, RecordsWrite } from '@tbd54566975/dwn-sdk-js';

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

export function getRecordAuthor(record: RecordsWriteMessage | RecordsDeleteMessage): string | undefined {
  return Records.getAuthor(record);
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

/**
 * Polling function with interval, TTL accepting a custom fetch function
 * @template T - the return you expect from the fetcher
 * @param fetchFunction an http fetch function
 * @param [interval=3000] how frequently to poll
 * @param [ttl=300_000] how long until polling stops
 * @returns T - the result of fetch
 */
export function pollWithTtl(
  fetchFunction: () => Promise<Response>,
  interval = 3000,
  ttl = 300_000,
  abortSignal?: AbortSignal
): Promise<Response | null> {
  const endTime = Date.now() + ttl;
  let timeoutId: NodeJS.Timeout | null = null;
  let isPolling = true;
  return new Promise((resolve, reject) => {
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        isPolling = false;
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        console.log('Polling aborted by user');
        resolve(null);
      });
    }

    async function poll() {
      if (!isPolling) return;

      const remainingTime = endTime - Date.now();

      if (remainingTime <= 0) {
        isPolling = false;
        console.log('Polling stopped: TTL reached');
        resolve(null);
        return;
      }

      console.log(`Polling... (Remaining time: ${Math.ceil(remainingTime / 1000)}s)`);

      try {
        const response = await fetchFunction();

        if (response.ok) {
          console.log('Received ok response:', response);
          isPolling = false;

          if (timeoutId !== null) {
            clearTimeout(timeoutId);
          }

          console.log('Polling stopped: Success condition met');
          resolve(response);
          return;
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        reject(error);
      }

      if (isPolling) {
        timeoutId = setTimeout(poll, interval);
      }
    }

    poll();
  });
}
