import type {
  DwnDataEncodedRecordsWriteMessage,
  DwnPermissionConditions,
  DwnPermissionScope,
  DwnResponseStatus,
  SendDwnRequest,
  Web5Agent
} from '@web5/agent';

import { Convert } from '@web5/common';
import {
  AgentPermissionsApi,
  DwnInterface,
  DwnPermissionGrant,
} from '@web5/agent';
import { PermissionGrantRevocation } from './grant-revocation.js';

/**
 * Represents the structured data model of a PermissionGrant record, encapsulating the essential fields that define
 */
export interface PermissionGrantModel {
  /**
   * The ID of the permission grant, which is the record ID DWN message.
   */
  readonly id: string;

  /**
   * The grantor of the permission.
   */
  readonly grantor: string;

  /**
   * The grantee of the permission.
   */
  readonly grantee: string;

  /**
   * The date at which the grant was given.
   */
  readonly dateGranted: string;

  /**
   * Optional string that communicates what the grant would be used for
   */
  readonly description?: string;

  /**
   * Optional CID of a permission request. This is optional because grants may be given without being officially requested
   */
  readonly requestId?: string;

  /**
   * Timestamp at which this grant will no longer be active.
   */
  readonly dateExpires: string;

  /**
   * Whether this grant is delegated or not. If `true`, the `grantedTo` will be able to act as the `grantedTo` within the scope of this grant.
   */
  readonly delegated?: boolean;

  /**
   * The scope of the allowed access.
   */
  readonly scope: DwnPermissionScope;

  /**
   * Optional conditions that must be met when the grant is used.
   */
  readonly conditions?: DwnPermissionConditions;
}

/**
 * Represents the options for creating a new PermissionGrant instance.
 */
export interface PermissionGrantOptions {
  /** The DID to use when interacting with the underlying DWN record representing the grant */
  connectedDid: string;
  /** The underlying DWN `RecordsWrite` message along with encoded data that represent the grant */
  message: DwnDataEncodedRecordsWriteMessage;
  /** The agent to use when interacting with the underlying DWN record representing the grant */
  agent: Web5Agent;
}

/**
 * The `PermissionGrant` class encapsulates a permissions protocol `grant` record, providing a more
 * developer-friendly interface for working with Decentralized Web Node (DWN) records.
 *
 * Methods are provided to revoke, check if isRevoked, and manage the grant's lifecycle, including writing to remote DWNs.
 *
 * @beta
 */
export class PermissionGrant implements PermissionGrantModel {
  /** The PermissionsAPI used to interact with the underlying permission grant */
  private _permissions: AgentPermissionsApi;
  /** The DID to use as the author and default target for the underlying permission grant */
  private _connectedDid: string;
  /** The underlying DWN `RecordsWrite` message along with encoded data that represent the grant */
  private _message: DwnDataEncodedRecordsWriteMessage;
  /** The parsed grant object */
  private _grant: DwnPermissionGrant;

  private constructor({ api, connectedDid, message, grant }:{
    api: AgentPermissionsApi;
    connectedDid: string;
    message: DwnDataEncodedRecordsWriteMessage;
    grant: DwnPermissionGrant;
  }) {
    this._permissions = api;

    // Store the connected DID for convenience.
    this._connectedDid = connectedDid;

    // Store the message that represents the grant.
    this._message = message;

    // Store the parsed grant object.
    this._grant = grant;
  }

  /** parses the grant given an agent, connectedDid and data encoded records write message  */
  static async parse(options: PermissionGrantOptions): Promise<PermissionGrant> {
    //TODO: this does not have to be async https://github.com/TBD54566975/web5-js/pull/831/files
    const grant = await DwnPermissionGrant.parse(options.message);
    const api = new AgentPermissionsApi({ agent: options.agent });
    return new PermissionGrant({ ...options, grant, api });
  }

  /** The agent to use for this instantiation of the grant */
  private get agent(): Web5Agent {
    return this._permissions.agent;
  }

  /** The grant's ID, which is also the underlying record's ID */
  get id(): string {
    return this._grant.id;
  }

  /** The DID which granted the permission  */
  get grantor(): string {
    return this._grant.grantor;
  }

  /** The DID which the permission was granted to */
  get grantee(): string {
    return this._grant.grantee;
  }

  /** The date the permission was granted */
  get dateGranted(): string {
    return this._grant.dateGranted;
  }

  /** (optional) Description of the permission grant */
  get description(): string | undefined {
    return this._grant.description;
  }

  /** (optional) The Id of the PermissionRequest if one was used */
  get requestId(): string | undefined {
    return this._grant.requestId;
  }

  /** The date on which the permission expires */
  get dateExpires(): string {
    return this._grant.dateExpires;
  }

  /** Whether or not the permission grant can be used to impersonate the grantor */
  get delegated(): boolean | undefined {
    return this._grant.delegated;
  }

  /** The permission scope under which the grant is valid */
  get scope(): DwnPermissionScope {
    return this._grant.scope;
  }

  /** The conditions under which the grant is valid */
  get conditions(): DwnPermissionConditions {
    return this._grant.conditions;
  }

  /** The raw `RecordsWrite` DWN message with encoded data that was used to instantiate this grant */
  get rawMessage(): DwnDataEncodedRecordsWriteMessage {
    return this._message;
  }

  /**
   * Send the current grant to a remote DWN by specifying their DID
   * If no DID is specified, the target is assumed to be the owner (connectedDID).
   *
   * @param target - the optional DID to send the grant to, if none is set it is sent to the connectedDid
   * @returns the status of the send grant request
   *
   * @beta
   */
  async send(target?: string): Promise<DwnResponseStatus> {
    target ??= this._connectedDid;

    const { encodedData, ...rawMessage } = this._message;
    const dataStream = new Blob([ Convert.base64Url(encodedData).toUint8Array() ]);

    const sendRequestOptions: SendDwnRequest<DwnInterface.RecordsWrite> = {
      messageType : DwnInterface.RecordsWrite,
      author      : this._connectedDid,
      target      : target,
      dataStream,
      rawMessage,
    };

    // Send the current/latest state to the target.
    const { reply } = await this.agent.sendDwnRequest(sendRequestOptions);
    return reply;
  }

  /**
   * Stores the current grant to the owner's DWN.
   *
   * @param importGrant - if true, the grant will signed by the owner before storing it to the owner's DWN. Defaults to false.
   * @returns the status of the store request
   *
   * @beta
   */
  async store(importGrant: boolean = false): Promise<DwnResponseStatus> {
    const { encodedData, ...rawMessage } = this.rawMessage;
    const dataStream = new Blob([ Convert.base64Url(encodedData).toUint8Array() ]);

    const { reply, message } = await this.agent.processDwnRequest({
      store       : true,
      author      : this._connectedDid,
      target      : this._connectedDid,
      messageType : DwnInterface.RecordsWrite,
      signAsOwner : importGrant,
      rawMessage,
      dataStream,
    });

    this._message = { ...message, encodedData: encodedData };
    return { status: reply.status };
  }

  /**
   * Signs the current grant as the owner and optionally stores it to the owner's DWN.
   * This is useful when importing a grant that was signed by someone else into your own DWN.
   *
   * @param store - if true, the grant will be stored to the owner's DWN after signing. Defaults to true.
   * @returns the status of the import request
   *
   * @beta
   */
  async import(store: boolean = false): Promise<DwnResponseStatus> {
    const { encodedData, ...rawMessage } = this.rawMessage;
    const dataStream = new Blob([ Convert.base64Url(encodedData).toUint8Array() ]);

    const { reply, message } = await this.agent.processDwnRequest({
      store,
      author      : this._connectedDid,
      target      : this._connectedDid,
      messageType : DwnInterface.RecordsWrite,
      signAsOwner : true,
      rawMessage,
      dataStream,
    });

    this._message = { ...message, encodedData: encodedData };
    return { status: reply.status };
  }

  /**
   * Revokes the grant and optionally stores the revocation to the owner's DWN.
   *
   * @param store - if true, the revocation will be stored to the owner's DWN. Defaults to true.
   * @returns {PermissionGrantRevocation} the grant revocation object
   *
   * @beta
   */
  async revoke(store: boolean = true): Promise<PermissionGrantRevocation> {
    const revocation = await this._permissions.createRevocation({
      store,
      author : this._connectedDid,
      grant  : this._grant,
    });

    return PermissionGrantRevocation.parse({
      connectedDid : this._connectedDid,
      agent        : this.agent,
      message      : revocation.message,
    });
  }

  /**
   * Checks if the grant has been revoked.
   *
   * @param remote - if true, the check will be made against the remote DWN. Defaults to false.
   * @returns true if the grant has been revoked, false otherwise.
   * @throws if there is an error checking the revocation status.
   *
   * @beta
   */
  isRevoked(remote: boolean = false): Promise<boolean> {
    return this._permissions.isGrantRevoked({
      author        : this._connectedDid,
      target        : this.grantor,
      grantRecordId : this.id,
      remote
    });
  }

  /**
   * @returns the JSON representation of the grant
   */
  toJSON(): DwnPermissionGrant {
    return {
      id          : this.id,
      grantor     : this.grantor,
      grantee     : this.grantee,
      dateGranted : this.dateGranted,
      description : this.description,
      requestId   : this.requestId,
      dateExpires : this.dateExpires,
      delegated   : this.delegated,
      scope       : this.scope,
      conditions  : this.conditions
    };
  }
}