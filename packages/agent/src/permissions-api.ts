import { PermissionGrant, PermissionGrantData, PermissionRequestData, PermissionRevocationData, PermissionsProtocol } from '@tbd54566975/dwn-sdk-js';
import { Web5Agent } from './types/agent.js';
import { DwnDataEncodedRecordsWriteMessage, DwnInterface, DwnMessageParams, DwnMessagesPermissionScope, DwnPermissionGrant, DwnPermissionRequest, DwnPermissionScope, DwnProtocolPermissionScope, DwnRecordsPermissionScope, ProcessDwnRequest } from './types/dwn.js';
import { Convert, TtlCache } from '@web5/common';
import { CreateGrantParams, CreateRequestParams, CreateRevocationParams, FetchPermissionRequestParams, FetchPermissionsParams, GetPermissionParams, IsGrantRevokedParams, PermissionGrantEntry, PermissionRequestEntry, PermissionRevocationEntry, PermissionsApi } from './types/permissions.js';
import { isRecordsType } from './dwn-api.js';

export class AgentPermissionsApi implements PermissionsApi {

  /** cache for fetching a permission {@link PermissionGrant}, keyed by a specific MessageType and protocol */
  private _cachedPermissions: TtlCache<string, PermissionGrantEntry> = new TtlCache({ ttl: 60 * 1000 });

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

  async getPermissionForRequest({
    connectedDid,
    delegateDid,
    delegate,
    messageType,
    protocol,
    cached = false
  }: GetPermissionParams): Promise<PermissionGrantEntry> {
    // Currently we only support finding grants based on protocols
    // A different approach may be necessary when we introduce `protocolPath` and `contextId` specific impersonation
    const cacheKey = [ connectedDid, delegateDid, messageType, protocol ].join('~');
    const cachedGrant = cached ? this._cachedPermissions.get(cacheKey) : undefined;
    if (cachedGrant) {
      return cachedGrant;
    }

    const permissionGrants = await this.fetchGrants({
      author  : delegateDid,
      target  : delegateDid,
      grantor : connectedDid,
      grantee : delegateDid,
    });

    // get the delegate grants that match the messageParams and are associated with the connectedDid as the grantor
    const grant = await AgentPermissionsApi.matchGrantFromArray(
      connectedDid,
      delegateDid,
      { messageType, protocol },
      permissionGrants,
      delegate
    );

    if (!grant) {
      throw new Error(`CachedPermissions: No permissions found for ${messageType}: ${protocol}`);
    }

    this._cachedPermissions.set(cacheKey, grant);
    return grant;
  }

  async fetchGrants({
    author,
    target,
    grantee,
    grantor,
    protocol,
    remote = false
  }: FetchPermissionsParams): Promise<PermissionGrantEntry[]> {

    // filter by a protocol using tags if provided
    const tags = protocol ? { protocol } : undefined;

    const params: ProcessDwnRequest<DwnInterface.RecordsQuery> = {
      author        : author,
      target        : target,
      messageType   : DwnInterface.RecordsQuery,
      messageParams : {
        filter: {
          author       : grantor, // the author of the grant would be the grantor
          recipient    : grantee, // the recipient of the grant would be the grantee
          protocol     : PermissionsProtocol.uri,
          protocolPath : PermissionsProtocol.grantPath,
          tags
        }
      }
    };

    const { reply } = remote ? await this.agent.sendDwnRequest(params) : await this.agent.processDwnRequest(params);
    if (reply.status.code !== 200) {
      throw new Error(`PermissionsApi: Failed to fetch grants: ${reply.status.detail}`);
    }

    const grants:PermissionGrantEntry[] = [];
    for (const entry of reply.entries! as DwnDataEncodedRecordsWriteMessage[]) {
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
    remote = false
  }:FetchPermissionRequestParams):Promise<PermissionRequestEntry[]> {
    // filter by a protocol using tags if provided
    const tags = protocol ? { protocol } : undefined;

    const params: ProcessDwnRequest<DwnInterface.RecordsQuery> = {
      author        : author,
      target        : target,
      messageType   : DwnInterface.RecordsQuery,
      messageParams : {
        filter: {
          protocol     : PermissionsProtocol.uri,
          protocolPath : PermissionsProtocol.requestPath,
          tags
        }
      }
    };

    const { reply } = remote ? await this.agent.sendDwnRequest(params) : await this.agent.processDwnRequest(params);
    if (reply.status.code !== 200) {
      throw new Error(`PermissionsApi: Failed to fetch requests: ${reply.status.detail}`);
    }

    const requests: PermissionRequestEntry[] = [];
    for (const entry of reply.entries! as DwnDataEncodedRecordsWriteMessage[]) {
      const request = await DwnPermissionRequest.parse(entry);
      requests.push({ request, message: entry });
    }

    return requests;
  }

  async isGrantRevoked({
    author,
    target,
    grantRecordId,
    remote = false
  }: IsGrantRevokedParams): Promise<boolean> {
    const params: ProcessDwnRequest<DwnInterface.RecordsRead> = {
      author,
      target,
      messageType   : DwnInterface.RecordsRead,
      messageParams : {
        filter: {
          parentId     : grantRecordId,
          protocol     : PermissionsProtocol.uri,
          protocolPath : PermissionsProtocol.revocationPath,
        }
      }
    };

    const { reply: revocationReply } = remote ? await this.agent.sendDwnRequest(params) : await this.agent.processDwnRequest(params);
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
    const { author, store = false, grant, description } = params;

    const revokeData: PermissionRevocationData = { description };

    const permissionRevocationBytes = Convert.object(revokeData).toUint8Array();

    let tags = undefined;
    if (PermissionsProtocol.hasProtocolScope(grant.scope)) {
      tags = { protocol: grant.scope.protocol };
    }

    const messageParams: DwnMessageParams[DwnInterface.RecordsWrite] = {
      parentContextId : grant.id,
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

  async clear():Promise<void> {
    this._cachedPermissions.clear();
  }

  /**
   * Matches the appropriate grant from an array of grants based on the provided parameters.
   *
   * @param delegated if true, only delegated grants are turned, if false all grants are returned including delegated ones.
   */
  static async matchGrantFromArray<T extends DwnInterface>(
    grantor: string,
    grantee: string,
    messageParams: {
      messageType: T,
      protocol?: string,
      protocolPath?: string,
      contextId?: string,
    },
    grants: PermissionGrantEntry[],
    delegated: boolean = false
  ): Promise<PermissionGrantEntry | undefined> {
    for (const entry of grants) {
      const { grant, message } = entry;
      if (delegated === true && grant.delegated !== true) {
        continue;
      }
      const { messageType, protocol, protocolPath, contextId } = messageParams;

      if (this.matchScopeFromGrant(grantor, grantee, messageType, grant, protocol, protocolPath, contextId)) {
        return { grant, message };
      }
    }
  }

  private static matchScopeFromGrant<T extends DwnInterface>(
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
        const recordScope = scope as DwnRecordsPermissionScope;
        if (recordScope.protocol !== protocol) {
          return false;
        }

        // If the grant scope is not restricted to a specific context or protocol path, it is unrestricted and can be used
        if (this.isUnrestrictedProtocolScope(recordScope)) {
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
        const messagesScope = scope as DwnMessagesPermissionScope | DwnProtocolPermissionScope;
        // Checks for unrestricted protocol scope, if no protocol is defined in the scope it is unrestricted
        if (messagesScope.protocol === undefined) {
          return true;
        }

        if (messagesScope.protocol !== protocol) {
          return false;
        }

        return this.isUnrestrictedProtocolScope(messagesScope);
      }
    }

    return false;
  }

  private static isUnrestrictedProtocolScope(scope: DwnPermissionScope & { contextId?: string, protocolPath?: string }): boolean {
    return scope.contextId === undefined && scope.protocolPath === undefined;
  }
}