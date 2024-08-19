import { TtlCache } from '@web5/common';
import { AgentPermissionsApi } from './permissions-api.js';
import { Web5Agent } from './types/agent.js';
import { PermissionGrantEntry } from './types/permissions.js';
import { DwnInterface } from './types/dwn.js';

export class CachedPermissions {

  /** the default value for whether a fetch is cached or not */
  private cachedDefault: boolean;

  /** Holds the instance of {@link AgentPermissionsApi} that helps when dealing with permissions protocol records */
  private permissionsApi: AgentPermissionsApi;

  /** cache for fetching a permission {@link PermissionGrant}, keyed by a specific MessageType and protocol */
  private cachedPermissions: TtlCache<string, PermissionGrantEntry> = new TtlCache({ ttl: 60 * 1000 });

  constructor({ agent, cachedDefault }:{ agent: Web5Agent, cachedDefault?: boolean }) {
    this.permissionsApi = new AgentPermissionsApi({ agent });
    this.cachedDefault = cachedDefault ?? false;
  }

  public async getPermission<T extends DwnInterface>({ connectedDid, delegateDid, delegate, messageType, protocol, cached = this.cachedDefault }: {
    connectedDid: string;
    delegateDid: string;
    messageType: T;
    protocol?: string;
    cached?: boolean;
    delegate?: boolean;
  }): Promise<PermissionGrantEntry> {
    // Currently we only support finding grants based on protocols
    // A different approach may be necessary when we introduce `protocolPath` and `contextId` specific impersonation
    const cacheKey = [ connectedDid, delegateDid, messageType, protocol ].join('~');
    const cachedGrant = cached ? this.cachedPermissions.get(cacheKey) : undefined;
    if (cachedGrant) {
      return cachedGrant;
    }

    const permissionGrants = await this.permissionsApi.fetchGrants({
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

    this.cachedPermissions.set(cacheKey, grant);
    return grant;
  }

  public async clear(): Promise<void> {
    this.cachedPermissions.clear();
  }
}