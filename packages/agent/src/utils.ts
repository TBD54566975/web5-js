import type { DidUrlDereferencer } from '@web5/dids';
import { DataEncodedRecordsWriteMessage, MessagesPermissionScope, PaginationCursor, PermissionGrant, PermissionScope, ProtocolPermissionScope, RecordsDeleteMessage, RecordsPermissionScope, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

import { Readable } from '@web5/common';
import { utils as didUtils } from '@web5/dids';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';
import { DateSort, DwnInterfaceName, DwnMethodName, Message, Records, RecordsWrite } from '@tbd54566975/dwn-sdk-js';
import { DwnInterface } from './types/dwn.js';
import { isRecordsType } from './dwn-api.js';

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

/**
 * Matches the appropriate grant from an array of grants based on the provided parameters.
 *
 * @param delegated if true, only delegated grants are turned, if false all grants are returned including delegated ones.
 */
export async function matchGrantFromArray<T extends DwnInterface>(
  grantor: string,
  grantee: string,
  messageParams: {
    messageType: T,
    protocol?: string,
    protocolPath?: string,
    contextId?: string,
  },
  grants: DataEncodedRecordsWriteMessage[],
  delegated: boolean = false
): Promise<{ message: DataEncodedRecordsWriteMessage, grant: PermissionGrant } | undefined> {
  for (const grant of grants) {
    const grantData = await PermissionGrant.parse(grant);
    // only delegated grants are returned
    if (delegated === true && grantData.delegated !== true) {
      continue;
    }
    const { messageType, protocol, protocolPath, contextId } = messageParams;

    if (matchScopeFromGrant(grantor, grantee, messageType, grantData, protocol, protocolPath, contextId)) {
      return { message: grant, grant: grantData };
    }
  }
}

function matchScopeFromGrant<T extends DwnInterface>(
  grantor: string,
  grantee: string,
  messageType: T,
  grant: PermissionGrant,
  protocol?: string,
  protocolPath?: string,
  contextId?: string
): boolean {
  // Check if the grant matches the provided parameters
  if (grant.grantee !== grantee || grant.grantor !== grantor) {
    return false;
  }

  const scope = grant.scope;
  const scopeMessageType = scope.interface + scope.method;
  if (scopeMessageType === messageType) {
    if (isRecordsType(messageType)) {
      const recordScope = scope as RecordsPermissionScope;
      if (!matchesProtocol(recordScope, protocol)) {
        return false;
      }

      // If the grant scope is not restricted to a specific context or protocol path, it is unrestricted and can be used
      if (isUnrestrictedProtocolScope(recordScope)) {
        return true;
      }

      // protocolPath and contextId are mutually exclusive
      // If the permission is scoped to a protocolPath and the permissionParams matches that path, this grant can be used
      if (recordScope.protocolPath !== undefined && recordScope.protocolPath === protocolPath) {
        return true;
      }

      // If the permission is scoped to a contextId and the permissionParams starts with that contextId, this grant can be used
      if (recordScope.contextId !== undefined && contextId?.startsWith(recordScope.contextId)) {
        return true;
      }
    } else {
      const messagesScope = scope as MessagesPermissionScope | ProtocolPermissionScope;
      if (protocolScopeUnrestricted(messagesScope)) {
        return true;
      }

      if (!matchesProtocol(messagesScope, protocol)) {
        return false;
      }

      return isUnrestrictedProtocolScope(messagesScope);
    }
  }

  return false;
}

function matchesProtocol(scope: PermissionScope & { protocol?: string }, protocol?: string): boolean {
  return scope.protocol !== undefined && scope.protocol === protocol;
}

/**
   *  Checks if the scope is restricted to a specific protocol
   */
function protocolScopeUnrestricted(scope: PermissionScope & { protocol?: string }): boolean {
  return scope.protocol === undefined;
}

function isUnrestrictedProtocolScope(scope: PermissionScope & { contextId?: string, protocolPath?: string }): boolean {
  return scope.contextId === undefined && scope.protocolPath === undefined;
}
/**
 * Concatenates a base URL and a path, ensuring that there is exactly one slash between them.
 * TODO: Move this function to a more common shared utility library across pacakges.
 */
export function concatenateUrl(baseUrl: string, path: string): string {
  // Remove trailing slash from baseUrl if it exists
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  // Remove leading slash from path if it exists
  if (path.startsWith('/')) {
    path = path.slice(1);
  }

  return `${baseUrl}/${path}`;
}