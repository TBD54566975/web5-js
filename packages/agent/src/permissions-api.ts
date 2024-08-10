import { PermissionGrantData, PermissionRequestData, PermissionRevocationData, PermissionsProtocol } from '@tbd54566975/dwn-sdk-js';
import { DwnPermissionsUtil } from './dwn-permissions-util.js';
import { Web5Agent } from './types/agent.js';
import { DwnDataEncodedRecordsWriteMessage, DwnInterface, DwnMessageParams, DwnPermissionGrant, DwnPermissionRequest, DwnPermissionScope } from './types/dwn.js';
import { Convert } from '@web5/common';

export type FetchPermissionsParams = {
  author: string;
  target: string;
  grantee?: string;
  grantor?: string;
  protocol?: string;
}

export type FetchPermissionRequestParams = {
  author: string;
  target: string;
  protocol?: string;
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

export interface PermissionsApi {
  /**
   * Fetch all grants for a given author and target, optionally filtered by a specific grantee, grantor, or protocol.
   */
  fetchGrants: (params: FetchPermissionsParams) => Promise<PermissionGrantEntry[]>;

  fetchRequests: (params: FetchPermissionRequestParams) => Promise<PermissionRequestEntry[]>;

  /**
  * Check whether a grant is revoked by reading the revocation record for a given grant recordId.
  */
  isGrantRevoked: (author: string, target: string, grantRecordId: string) => Promise<boolean>;

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
}

export class AgentPermissionsApi implements PermissionsApi {

  private _agent?: Web5Agent;

  get agent(): Web5Agent {
    if (!this._agent) {
      throw new Error('AgentPermissionsApi: Agent is not set');
    }
    return this._agent;
  }

  set agent(agent:Web5Agent) {
    this._agent = agent;
  }

  constructor({ agent }: { agent?: Web5Agent } = {}) {
    this._agent = agent;
  }

  async fetchGrants({
    author,
    target,
    grantee,
    grantor,
    protocol,
  }: FetchPermissionsParams): Promise<PermissionGrantEntry[]> {

    // filter by a protocol using tags if provided
    const tags = protocol ? { protocol } : undefined;

    const { reply: grantsReply } = await this.agent.processDwnRequest({
      author        : author,
      target        : target,
      messageType   : DwnInterface.RecordsQuery,
      messageParams : {
        filter: {
          author    : grantor, // the author of the grant would be the grantor
          recipient : grantee, // the recipient of the grant would be the grantee
          ...DwnPermissionsUtil.permissionsProtocolParams('grant'),
          tags
        }
      }
    });

    if (grantsReply.status.code !== 200) {
      throw new Error(`PermissionsApi: Failed to fetch grants: ${grantsReply.status.detail}`);
    }

    const grants:PermissionGrantEntry[] = [];
    for (const entry of grantsReply.entries! as DwnDataEncodedRecordsWriteMessage[]) {
      // TODO: Check for revocation status based on a request parameter and filter out revoked grants
      const grant = await DwnPermissionGrant.parse(entry);
      grants.push({ grant, message: entry });
    }

    return grants;
  }

  async fetchRequests({
    author,
    target,
    protocol,
  }:FetchPermissionRequestParams):Promise<PermissionRequestEntry[]> {
    // filter by a protocol using tags if provided
    const tags = protocol ? { protocol } : undefined;

    const { reply: requestsReply } = await this.agent.processDwnRequest({
      author        : author,
      target        : target,
      messageType   : DwnInterface.RecordsQuery,
      messageParams : {
        filter: {
          ...DwnPermissionsUtil.permissionsProtocolParams('request'),
          tags
        }
      }
    });

    if (requestsReply.status.code !== 200) {
      throw new Error(`PermissionsApi: Failed to fetch requests: ${requestsReply.status.detail}`);
    }

    const requests: PermissionRequestEntry[] = [];
    for (const entry of requestsReply.entries! as DwnDataEncodedRecordsWriteMessage[]) {
      const request = await DwnPermissionRequest.parse(entry);
      requests.push({ request, message: entry });
    }

    return requests;
  }

  async isGrantRevoked(author:string, target: string, grantRecordId: string): Promise<boolean> {
    const { reply: revocationReply } = await this.agent.processDwnRequest({
      author,
      target,
      messageType   : DwnInterface.RecordsRead,
      messageParams : {
        filter: {
          parentId: grantRecordId,
          ...DwnPermissionsUtil.permissionsProtocolParams('revoke')
        }
      }
    });

    if (revocationReply.status.code === 404) {
      // no revocation found, the grant is not revoked
      return false;
    } else if (revocationReply.status.code === 200) {
      // a revocation was found, the grant is revoked
      return true;
    }

    throw new Error(`PermissionsApi: Failed to check if grant is revoked: ${revocationReply.status.detail}`);
  }

  async createGrant(params: CreateGrantParams): Promise<PermissionGrantEntry> {
    const { author, store = false, delegated = false, ...createGrantParams } = params;

    let tags = undefined;
    if (PermissionsProtocol.hasProtocolScope(createGrantParams.scope)) {
      tags = { protocol: createGrantParams.scope.protocol };
    }

    const permissionGrantData: PermissionGrantData = {
      dateExpires : createGrantParams.dateExpires,
      requestId   : createGrantParams.requestId,
      description : createGrantParams.description,
      delegated,
      scope       : createGrantParams.scope
    };

    const permissionsGrantBytes = Convert.object(permissionGrantData).toUint8Array();

    const messageParams: DwnMessageParams[DwnInterface.RecordsWrite] = {
      recipient    : createGrantParams.grantedTo,
      protocol     : PermissionsProtocol.uri,
      protocolPath : PermissionsProtocol.grantPath,
      dataFormat   : 'application/json',
      tags
    };

    const { reply, message } = await this.agent.processDwnRequest({
      store,
      author,
      target      : author,
      messageType : DwnInterface.RecordsWrite,
      messageParams,
      dataStream  : new Blob([ permissionsGrantBytes ])
    });

    if (reply.status.code !== 202) {
      throw new Error(`PermissionsApi: Failed to create grant: ${reply.status.detail}`);
    }

    const dataEncodedMessage: DwnDataEncodedRecordsWriteMessage = {
      ...message!,
      encodedData: Convert.uint8Array(permissionsGrantBytes).toBase64Url()
    };

    const grant = await DwnPermissionGrant.parse(dataEncodedMessage);

    return { grant, message: dataEncodedMessage };
  }

  async createRequest(params: CreateRequestParams): Promise<PermissionRequestEntry> {
    const { author, store = false, delegated = false, ...createGrantParams } = params;

    let tags = undefined;
    if (PermissionsProtocol.hasProtocolScope(createGrantParams.scope)) {
      tags = { protocol: createGrantParams.scope.protocol };
    }

    const permissionRequestData: PermissionRequestData = {
      description : createGrantParams.description,
      delegated,
      scope       : createGrantParams.scope
    };

    const permissionRequestBytes = Convert.object(permissionRequestData).toUint8Array();

    const messageParams: DwnMessageParams[DwnInterface.RecordsWrite] = {
      protocol     : PermissionsProtocol.uri,
      protocolPath : PermissionsProtocol.requestPath,
      dataFormat   : 'application/json',
      tags
    };

    const { reply, message } = await this.agent.processDwnRequest({
      store,
      author,
      target      : author,
      messageType : DwnInterface.RecordsWrite,
      messageParams,
      dataStream  : new Blob([ permissionRequestBytes ])
    });

    if (reply.status.code !== 202) {
      throw new Error(`PermissionsApi: Failed to create request: ${reply.status.detail}`);
    }

    const dataEncodedMessage: DwnDataEncodedRecordsWriteMessage = {
      ...message!,
      encodedData: Convert.uint8Array(permissionRequestBytes).toBase64Url()
    };

    const request = await DwnPermissionRequest.parse(dataEncodedMessage);

    return { request, message: dataEncodedMessage };
  }

  async createRevocation(params: CreateRevocationParams): Promise<PermissionRevocationEntry> {
    const { author, store = false, ...createRevocationParams } = params;

    const revokeData: PermissionRevocationData = {
      description: createRevocationParams.description,
    };

    const permissionRevocationBytes = Convert.object(revokeData).toUint8Array();

    let tags = undefined;
    if (PermissionsProtocol.hasProtocolScope(createRevocationParams.grant.scope)) {
      tags = { protocol: createRevocationParams.grant.scope.protocol };
    }

    const messageParams: DwnMessageParams[DwnInterface.RecordsWrite] = {
      parentContextId : createRevocationParams.grant.id,
      protocol        : PermissionsProtocol.uri,
      protocolPath    : PermissionsProtocol.revocationPath,
      dataFormat      : 'application/json',
      tags
    };

    const { reply, message } = await this.agent.processDwnRequest({
      store,
      author,
      target      : author,
      messageType : DwnInterface.RecordsWrite,
      messageParams,
      dataStream  : new Blob([ permissionRevocationBytes ])
    });

    if (reply.status.code !== 202) {
      throw new Error(`PermissionsApi: Failed to create revocation: ${reply.status.detail}`);
    }

    const dataEncodedMessage: DwnDataEncodedRecordsWriteMessage = {
      ...message!,
      encodedData: Convert.uint8Array(permissionRevocationBytes).toBase64Url()
    };

    return { message: dataEncodedMessage };
  }
}