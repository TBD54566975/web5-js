import { AgentPermissionsApi, DwnDataEncodedRecordsWriteMessage, DwnResponseStatus, getRecordAuthor, SendDwnRequest, Web5Agent } from '@web5/agent';
import { DwnInterface } from '@web5/agent';
import { Convert } from '@web5/common';

/**
 * Represents the structured data model of a GrantRevocation record, encapsulating the essential fields that define.
 */
export interface GrantRevocationModel {
  /** The DWN message used to construct this revocation */
  rawMessage: DwnDataEncodedRecordsWriteMessage;
}

/**
 * Represents the options for creating a new GrantRevocation instance.
 */
export interface GrantRevocationOptions {
  /** The DID of the DWN tenant under which record operations are being performed. */
  connectedDid: string;
  /** The DWN message used to construct this revocation */
  message: DwnDataEncodedRecordsWriteMessage;
}

/**
 * The `PermissionGrantRevocation` class encapsulates a permissions protocol `grant/revocation` record, providing a more
 * developer-friendly interface for working with Decentralized Web Node (DWN) records.
 *
 * Methods are provided to manage the grant revocation's lifecycle, including writing to remote DWNs.
 *
 * @beta
 */
export class PermissionGrantRevocation implements GrantRevocationModel {
  /** The PermissionsAPI used to interact with the underlying revocation  */
  private _permissions: AgentPermissionsApi;
  /** The DID to use as the author and default target for the underlying revocation */
  private _connectedDid: string;
  /** The DWN `RecordsWrite` message, along with encodedData that represents the revocation */
  private _message: DwnDataEncodedRecordsWriteMessage;

  private constructor(permissions: AgentPermissionsApi, options: GrantRevocationOptions) {
    this._permissions = permissions;
    this._connectedDid = options.connectedDid;

    // Store the message that represents the grant.
    this._message = options.message;
  }

  /** The author of the underlying revocation message */
  get author() {
    return getRecordAuthor(this._message);
  }

  /** parses the grant revocation given am agent, connectedDid and data encoded records write message  */
  static async parse({ connectedDid, agent, message }:{
    connectedDid: string;
    agent: Web5Agent;
    message: DwnDataEncodedRecordsWriteMessage;
  }): Promise<PermissionGrantRevocation> {
    const permissions = new AgentPermissionsApi({ agent });
    return new PermissionGrantRevocation(permissions, { connectedDid, message });
  }

  /** The agent to use for this instantiation of the grant revocation */
  private get agent(): Web5Agent {
    return this._permissions.agent;
  }

  /** The raw `RecordsWrite` DWN message with encoded data that was used to instantiate this grant revocation */
  get rawMessage(): DwnDataEncodedRecordsWriteMessage {
    return this._message;
  }

  /**
   * Send the current grant revocation to a remote DWN by specifying their DID
   * If no DID is specified, the target is assumed to be the owner (connectedDID).
   *
   * @param target - the optional DID to send the grant revocation to, if none is set it is sent to the connectedDid
   * @returns the status of the send grant revocation request
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
   * Stores the current grant revocation to the owner's DWN.
   *
   * @param importGrant - if true, the grant revocation will signed by the owner before storing it to the owner's DWN. Defaults to false.
   * @returns the status of the store request
   *
   * @beta
   */
  async store(importRevocation?: boolean): Promise<DwnResponseStatus> {
    const { encodedData, ...rawMessage } = this.rawMessage;
    const dataStream = new Blob([ Convert.base64Url(encodedData).toUint8Array() ]);

    const { reply, message } = await this.agent.processDwnRequest({
      author      : this._connectedDid,
      target      : this._connectedDid,
      messageType : DwnInterface.RecordsWrite,
      signAsOwner : importRevocation,
      rawMessage,
      dataStream,
    });

    this._message = { ...message, encodedData: encodedData };
    return { status: reply.status };
  }
}