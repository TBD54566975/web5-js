import { DwnDataEncodedRecordsWriteMessage, DwnInterface, DwnPermissionGrant, DwnPermissionRequest, DwnPermissionScope } from './dwn.js';

export type FetchPermissionsParams = {
  author: string;
  target: string;
  grantee?: string;
  grantor?: string;
  protocol?: string;
  remote?: boolean;
}

export type FetchPermissionRequestParams = {
  author: string;
  target: string;
  protocol?: string;
  remote?: boolean;
}

export type IsGrantRevokedParams = {
  author: string;
  target: string;
  grantRecordId: string;
  remote?: boolean;
}

export type PermissionGrantEntry = {
  grant: DwnPermissionGrant;
  message: DwnDataEncodedRecordsWriteMessage;
}

export type PermissionRequestEntry = {
  request: DwnPermissionRequest;
  message: DwnDataEncodedRecordsWriteMessage;
}

export type PermissionRevocationEntry = {
  message: DwnDataEncodedRecordsWriteMessage;
}

export type CreateGrantParams = {
  store?: boolean;
  requestId?: string;
  author: string;
  description?: string;
  dateExpires: string;
  grantedTo: string;
  scope: DwnPermissionScope;
  delegated?: boolean;
}

export type CreateRequestParams = {
  store?: boolean;
  author: string;
  description?: string;
  scope: DwnPermissionScope;
  delegated?: boolean;
}

export type CreateRevocationParams = {
  store?: boolean;
  author: string;
  grant: DwnPermissionGrant;
  description?: string;
}

export type GetPermissionParams = {
  connectedDid: string;
  delegateDid: string;
  messageType: DwnInterface;
  protocol?: string;
  cached?: boolean;
  delegate?: boolean;
}

export interface PermissionsApi {
  /**
   * Get the permission grant for a given author, target, and protocol. To be used when authoring delegated requests.
   */
  getPermissionForRequest: (params: GetPermissionParams) => Promise<PermissionGrantEntry>;

  /**
   * Fetch all grants for a given author and target, optionally filtered by a specific grantee, grantor, or protocol.
   */
  fetchGrants: (params: FetchPermissionsParams) => Promise<PermissionGrantEntry[]>;

  /**
   * Fetch all requests for a given author and target, optionally filtered by a specific protocol.
   */
  fetchRequests: (params: FetchPermissionRequestParams) => Promise<PermissionRequestEntry[]>;

  /**
  * Check whether a grant is revoked by reading the revocation record for a given grant recordId.
  */
  isGrantRevoked: (request: IsGrantRevokedParams) => Promise<boolean>;

  /**
   * Create a new permission grant, optionally storing it in the DWN.
   */
  createGrant:(params: CreateGrantParams) => Promise<PermissionGrantEntry>;

  /**
   * Create a new permission request, optionally storing it in the DWN.
   */
  createRequest(params: CreateRequestParams): Promise<PermissionRequestEntry>;

  /**
   * Create a new permission revocation, optionally storing it in the DWN.
   */
  createRevocation(params: CreateRevocationParams): Promise<PermissionRevocationEntry>;

  /**
   * Clears the cache of matched permissions.
   */
  clear: () => Promise<void>;
}
