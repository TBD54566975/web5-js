import { DwnInterfaceName, DwnMethodName, Message, PermissionsGrantMessage, PermissionsRevokeMessage, UnionMessageReply } from '@tbd54566975/dwn-sdk-js';
import { Web5Agent } from '@web5/agent';
import { Temporal } from '@js-temporal/polyfill';

export type GrantOptions = {
  author: string;
  target: string;
  permissionsGrantMessage: PermissionsGrantMessage;
  permissionsRevokeMessage?: PermissionsRevokeMessage;
}

/**
 * Wrapper class for DWN PermissionsGrant message
 */
export class Grant {
  private _agent: Web5Agent;
  private _permissionsGrantId: string | undefined;
  permissionsGrantMessage: PermissionsGrantMessage;
  permissionsRevokeMessage: PermissionsRevokeMessage | undefined;
  author: string;
  target: string;

  constructor(agent: Web5Agent, grantOptions: GrantOptions) {
    this._agent = agent;
    this.permissionsGrantMessage = grantOptions.permissionsGrantMessage;
    this.author = grantOptions.author;
    this.target = grantOptions.target;
  }

  // Grant getters

  get grantedBy(): string { return this.permissionsGrantMessage.descriptor.grantedBy; }
  get grantedTo(): string { return this.permissionsGrantMessage.descriptor.grantedTo; }
  get grantedFor(): string { return this.permissionsGrantMessage.descriptor.grantedFor; }
  get description(): string | undefined { return this.permissionsGrantMessage.descriptor.description; }
  get scope(): PermissionsGrantScope { return this.permissionsGrantMessage.descriptor.scope; }
  get conditions(): PermissionsGrantConditions | undefined { return this.permissionsGrantMessage.descriptor.conditions; }
  async permissionsGrantId(): Promise<string> {
    if (this._permissionsGrantId === undefined) {
      this._permissionsGrantId = await Message.getCid(this.permissionsGrantMessage);
    }
    return this._permissionsGrantId;
  }
  isActive(): boolean { return !this.isExpired && !this.isRevoked; }
  isExpired(): boolean { return this.permissionsGrantMessage.descriptor.dateExpires <= Temporal.Now.instant().toString({ smallestUnit: 'microseconds' }); }
  isRevoked(): boolean {
    if (this.permissionsRevokeMessage === undefined) {
      return true;
    }
    return this.permissionsRevokeMessage.descriptor.messageTimestamp <= Temporal.Now.instant().toString({ smallestUnit: 'microseconds' });
  }

  // Grant actions

  /**
   * Process a Revoke message for the PermissionsGrant in the local DWN
   */
  async revoke(): Promise<{ status: UnionMessageReply['status'], permissionsRevokeMessage: PermissionsRevokeMessage }> {
    if (this.isRevoked()) {
      throw new Error('Operation failed: Attempted to call `revoke()` on a grant that has already been revoked.');
    }

    // Attempt to revoke the grant from the DWN
    const agentResponse = await this._agent.processDwnRequest({
      author         : this.author,
      messageOptions : { permissionsGrantId: this.permissionsGrantId },
      messageType    : DwnInterfaceName.Permissions + DwnMethodName.Delete,
      target         : this.target,
    });

    if (agentResponse.reply.status.code === 202) {
      this.permissionsRevokeMessage = agentResponse.message as PermissionsRevokeMessage;
    }

    return {
      permissionsRevokeMessage : this.permissionsRevokeMessage,
      status                   : agentResponse.reply.status,
    };
  }
}
