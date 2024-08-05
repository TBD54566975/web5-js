import { DataEncodedRecordsWriteMessage, MessagesPermissionScope, PermissionGrant, PermissionScope, PermissionsProtocol, ProtocolPermissionScope, RecordsPermissionScope } from '@tbd54566975/dwn-sdk-js';
import { DwnInterface } from './types/dwn.js';
import { isRecordsType } from './dwn-api.js';

export class DwnPermissionsUtil {

  static permissionsProtocolParams(type: 'grant' | 'revoke' | 'request'): { protocol: string, protocolPath: string } {
    const protocolPath = type === 'grant' ? PermissionsProtocol.grantPath :
      type === 'revoke' ? PermissionsProtocol.revocationPath : PermissionsProtocol.requestPath;
    return {
      protocol: PermissionsProtocol.uri,
      protocolPath,
    };
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

      if (this.matchScopeFromGrant(grantor, grantee, messageType, grantData, protocol, protocolPath, contextId)) {
        return { message: grant, grant: grantData };
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
        const recordScope = scope as RecordsPermissionScope;
        if (!this.matchesProtocol(recordScope, protocol)) {
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
        const messagesScope = scope as MessagesPermissionScope | ProtocolPermissionScope;
        if (this.protocolScopeUnrestricted(messagesScope)) {
          return true;
        }

        if (!this.matchesProtocol(messagesScope, protocol)) {
          return false;
        }

        return this.isUnrestrictedProtocolScope(messagesScope);
      }
    }

    return false;
  }

  private static matchesProtocol(scope: PermissionScope & { protocol?: string }, protocol?: string): boolean {
    return scope.protocol !== undefined && scope.protocol === protocol;
  }

  /**
   *  Checks if the scope is restricted to a specific protocol
   */
  private static protocolScopeUnrestricted(scope: PermissionScope & { protocol?: string }): boolean {
    return scope.protocol === undefined;
  }

  private static isUnrestrictedProtocolScope(scope: PermissionScope & { contextId?: string, protocolPath?: string }): boolean {
    return scope.contextId === undefined && scope.protocolPath === undefined;
  }
}