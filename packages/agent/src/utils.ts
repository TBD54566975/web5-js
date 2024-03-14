import type { DidResolver } from '@web5/dids';
import type { RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

import { Readable } from '@web5/common';
import { utils as didUtils } from '@web5/dids';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';
import { DwnInterfaceName, DwnMethodName, RecordsWrite } from '@tbd54566975/dwn-sdk-js';

export function blobToIsomorphicNodeReadable(blob: Blob): Readable {
  return webReadableToIsomorphicNodeReadable(blob.stream() as ReadableStream<any>);
}

export async function getDwnServiceEndpointUrls(didUri: string, resolver: DidResolver): Promise<string[]> {
  // Attempt to dereference the DID service with ID fragment #dwn.
  const dereferencingResult = await resolver.dereference(`${didUri}#dwn`);

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

export function webReadableToIsomorphicNodeReadable(webReadable: ReadableStream<any>) {
  return new ReadableWebToNodeStream(webReadable);
}