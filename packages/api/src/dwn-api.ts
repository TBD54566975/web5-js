/**
 * NOTE: Added reference types here to avoid a `pnpm` bug during build.
 * https://github.com/TBD54566975/web5-js/pull/507
 */
/// <reference types="@tbd54566975/dwn-sdk-js" />

import type {
  CreateGrantParams,
  CreateRequestParams,
  FetchPermissionRequestParams,
  FetchPermissionsParams
} from '@web5/agent';

import {
  Web5Agent,
  DwnMessage,
  DwnResponse,
  DwnMessageParams,
  DwnMessageSubscription,
  DwnResponseStatus,
  ProcessDwnRequest,
  DwnPaginationCursor,
  AgentPermissionsApi,
} from '@web5/agent';

import { isEmptyObject } from '@web5/common';
import { DwnInterface, getRecordAuthor } from '@web5/agent';

import { Record } from './record.js';
import { dataToBlob } from './utils.js';
import { Protocol } from './protocol.js';
import { PermissionGrant } from './permission-grant.js';
import { PermissionRequest } from './permission-request.js';
import { SubscriptionUtil } from './subscription-util.js';

/**
 * Represents the request payload for fetching permission requests from a Decentralized Web Node (DWN).
 *
 * Optionally, specify a remote DWN target in the `from` property to fetch requests from.
 */
export type FetchRequestsRequest = Omit<FetchPermissionRequestParams, 'author' | 'target' | 'remote'> & {
  /** Optional DID specifying the remote target DWN tenant to be queried. */
  from?: string;
};

/**
 * Represents the request payload for fetching permission grants from a Decentralized Web Node (DWN).
 *
 * Optionally, specify a remote DWN target in the `from` property to fetch requests from.
 * Optionally, specify whether to check if the grant is revoked in the `checkRevoked` property.
 */
export type FetchGrantsRequest = Omit<FetchPermissionsParams, 'author' | 'target' | 'remote'> & {
  /** Optional DID specifying the remote target DWN tenant to be queried. */
  from?: string;
  /** Optionally check if the grant has been revoked. */
  checkRevoked?: boolean;
};

/**
 * Represents the request payload for configuring a protocol on a Decentralized Web Node (DWN).
 *
 * This request type is used to specify the configuration options for the protocol.
 */
export type ProtocolsConfigureRequest = {
  /** Configuration options for the protocol. */
  message: Omit<DwnMessageParams[DwnInterface.ProtocolsConfigure], 'signer'>;
}

/**
 * Encapsulates the response from a protocol configuration request to a Decentralized Web Node (DWN).
 *
 * This response type combines the general operation status with the details of the protocol that
 * was configured, if the operation was successful.
 *
 * @beta
 */
export type ProtocolsConfigureResponse = DwnResponseStatus & {
  /** The configured protocol, if successful. */
  protocol?: Protocol;
}

/**
 * Defines the request structure for querying protocols from a Decentralized Web Node (DWN).
 *
 * This request type is used to specify the target DWN from which protocols should be queried and
 * any additional query filters or options. If the `from` property is not provided, the query will
 * target the local DWN. If the `from` property is provided, the query will target the specified
 * remote DWN.
 */
export type ProtocolsQueryRequest = {
  /** Optional DID specifying the remote target DWN tenant to be queried. */
  from?: string;

  /** Query filters and options that influence the results returned. */
  message: Omit<DwnMessageParams[DwnInterface.ProtocolsQuery], 'signer'>
}

/**
 * Wraps the response from a protocols query, including the operation status and the list of
 * protocols.
 */
export type ProtocolsQueryResponse = DwnResponseStatus & {
  /** Array of protocols matching the query. */
  protocols: Protocol[];
}

/**
 * Type alias for {@link RecordsWriteRequest}
 */
export type RecordsCreateRequest = RecordsWriteRequest;

/**
 * Type alias for {@link RecordsWriteResponse}
 */
export type RecordsCreateResponse = RecordsWriteResponse;

/**
 * Represents a request to create a new record based on an existing one.
 *
 * This request type allows specifying the new data for the record, along with any additional
 * message parameters required for the write operation.
 */
export type RecordsCreateFromRequest = {
  /** The DID of the entity authoring the record. */
  author: string;
  /** The new data for the record. */
  data: unknown;
  /** ptional additional parameters for the record write operation */
  message?: Omit<DwnMessageParams[DwnInterface.RecordsWrite], 'signer'>;
  /** The existing record instance that is being used as a basis for the new record. */
  record: Record;
}

/**
 * Defines a request to delete a record from the Decentralized Web Node (DWN).
 *
 * This request type optionally specifies the target from which the record should be deleted and the
 * message parameters for the delete operation. If the `from` property is not provided, the record
 * will be deleted from the local DWN.
 */
export type RecordsDeleteRequest = {
  /** Optional DID specifying the remote target DWN tenant the record will be deleted from. */
  from?: string;

  /** Records must be scoped to a specific protocol */
  protocol?: string;

  /** The parameters for the delete operation. */
  message: Omit<DwnMessageParams[DwnInterface.RecordsDelete], 'signer'>;
}

/**
 * Encapsulates a request to query records from a Decentralized Web Node (DWN).
 *
 * This request type is used to specify the criteria for querying records, including query
 * parameters, and optionally the target DWN to query from. If the `from` property is not provided,
 * the query will target the local DWN.
 */
export type RecordsQueryRequest = {
  /** Optional DID specifying the remote target DWN tenant to query from and return results. */
  from?: string;

  /** Records must be scoped to a specific protocol */
  protocol?: string;

  /** The parameters for the query operation, detailing the criteria for selecting records. */
  message: Omit<DwnMessageParams[DwnInterface.RecordsQuery], 'signer'>;
}

/**
 * Represents the response from a records query operation, including status, records, and an
 * optional pagination cursor.
 */
export type RecordsQueryResponse = DwnResponseStatus & {
  /** Array of records matching the query. */
  records?: Record[]

  /** If there are additional results, the messageCid of the last record will be returned as a pagination cursor. */
  cursor?: DwnPaginationCursor;
}

/**
 * Represents a request to read a specific record from a Decentralized Web Node (DWN).
 *
 * This request type is used to specify the target DWN from which the record should be read and any
 * additional parameters for the read operation. It's useful for fetching the details of a single
 * record by its identifier or other criteria.
 */
export type RecordsReadRequest = {
  /** Optional DID specifying the remote target DWN tenant the record will be read from. */
  from?: string;

  /** Records must be scoped to a specific protocol */
  protocol?: string;

  /** The parameters for the read operation, detailing the criteria for selecting the record. */
  message: Omit<DwnMessageParams[DwnInterface.RecordsRead], 'signer'>;
}

/**
 * Encapsulates the response from a record read operation, combining the general operation status
 * with the specific record that was retrieved.
 */
export type RecordsReadResponse = DwnResponseStatus & {
  /** The record retrieved by the read operation. */
  record: Record;
}

/** Subscription handler for Records */
export type RecordsSubscriptionHandler = (record: Record) => void;

/**
 * Represents a request to subscribe to records from a Decentralized Web Node (DWN).
 *
 * This request type is used to specify the target DWN from which records matching the subscription
 * criteria should be emitted. It's useful for being notified in real time when records are written, deleted or modified.
 */
export type RecordsSubscribeRequest = {
  /** Optional DID specifying the remote target DWN tenant to subscribe from. */
  from?: string;

  /** Records must be scoped to a specific protocol */
  protocol?: string;

  /** The parameters for the subscription operation, detailing the criteria for the subscription filter */
  message: Omit<DwnMessageParams[DwnInterface.RecordsSubscribe], 'signer'>;

  /** The handler to process the subscription events */
  subscriptionHandler: RecordsSubscriptionHandler;
}

/** Encapsulates the response from a DWN RecordsSubscriptionRequest */
export type RecordsSubscribeResponse = DwnResponseStatus & {
  /**
   * Represents the subscription that was created. Includes an ID and the close method to stop the subscription.
   *
   * */
  subscription?: DwnMessageSubscription;
}

/**
 * Defines a request to write (create) a record to a Decentralized Web Node (DWN).
 *
 * This request type allows specifying the data for the new or updated record, along with any
 * additional message parameters required for the write operation, and an optional flag to indicate
 * whether the record should be immediately stored.
 *
 * @param data -
 * @param message - , excluding the signer.
 * @param store -
 */
export type RecordsWriteRequest = {
  /** The data payload for the record, which can be of any type. */
  data: unknown;

  /** Optional additional parameters for the record write operation. */
  message?: Omit<Partial<DwnMessageParams[DwnInterface.RecordsWrite]>, 'signer'>;

  /**
   * Optional flag indicating whether the record should be immediately stored. If true, the record
   * is persisted in the DWN as part of the write operation. If false, the record is created,
   * signed, and returned but not persisted.
   */
  store?: boolean;
}

/**
 * Encapsulates the response from a record write operation to a Decentralized Web Node (DWN).
 *
 * This request type combines the general operation status with the details of the record that was
 * written, if the operation was successful.
 *
 * The response includes a status object that contains the HTTP-like status code and detail message
 * indicating the success or failure of the write operation. If the operation was successful and a
 * record was created or updated, the `record` property will contain an instance of the `Record`
 * class representing the written record. This allows the caller to access the written record's
 * details and perform additional operations using the provided {@link Record} instance methods.
 */
export type RecordsWriteResponse = DwnResponseStatus & {
  /**
   * The `Record` instance representing the record that was successfully written to the
   * DWN as a result of the write operation.
   */
  record?: Record
}

/**
 * Interface to interact with DWN Records and Protocols
 */
export class DwnApi {
  /**
   * Holds the instance of a {@link Web5Agent} that represents the current execution context for
   * the `DwnApi`. This agent is used to process DWN requests.
   */
  private agent: Web5Agent;

  /** The DID of the DWN tenant under which operations are being performed. */
  private connectedDid: string;

  /** (optional) The DID of the signer when signing with permissions */
  private delegateDid?: string;

  /** Holds the instance of {@link AgentPermissionsApi} that helps when dealing with permissions protocol records */
  private permissionsApi: AgentPermissionsApi;

  constructor(options: { agent: Web5Agent, connectedDid: string, delegateDid?: string }) {
    this.agent = options.agent;
    this.connectedDid = options.connectedDid;
    this.delegateDid = options.delegateDid;
    this.permissionsApi = new AgentPermissionsApi({ agent: this.agent });
  }

  /**
   * API to interact with Grants
   *
   * NOTE: This is an EXPERIMENTAL API that will change behavior.
   *
   * Currently only supports issuing requests, grants, revokes and queries on behalf without permissions or impersonation.
   * If the agent is connected to a delegateDid, the delegateDid will be used to sign/author the underlying records.
   * If the agent is not connected to a delegateDid, the connectedDid will be used to sign/author the underlying records.
   *
   * @beta
   */
  get permissions() {
    return {
      /**
       * Request permission for a specific scope.
       */
      request: async(request: Omit<CreateRequestParams, 'author'>): Promise<PermissionRequest> => {
        const { message } = await this.permissionsApi.createRequest({
          ...request,
          author: this.delegateDid ?? this.connectedDid,
        });

        const requestParams = {
          connectedDid : this.delegateDid ?? this.connectedDid,
          agent        : this.agent,
          message,
        };

        return await PermissionRequest.parse(requestParams);
      },
      /**
       * Grant permission for a specific scope to a grantee DID.
       */
      grant: async(request: Omit<CreateGrantParams, 'author'>): Promise<PermissionGrant> => {
        const { message } = await this.permissionsApi.createGrant({
          ...request,
          author: this.delegateDid ?? this.connectedDid,
        });

        const grantParams = {
          connectedDid : this.delegateDid ?? this.connectedDid,
          agent        : this.agent,
          message,
        };

        return await PermissionGrant.parse(grantParams);
      },
      /**
       * Query permission requests. You can filter by protocol and specify if you want to query a remote DWN.
       */
      queryRequests: async(request: FetchRequestsRequest= {}): Promise<PermissionRequest[]> => {
        const { from, ...params } = request;
        const fetchResponse = await this.permissionsApi.fetchRequests({
          ...params,
          author : this.delegateDid ?? this.connectedDid,
          target : from ?? this.delegateDid ?? this.connectedDid,
          remote : from !== undefined,
        });

        const requests: PermissionRequest[] = [];
        for (const permission of fetchResponse) {
          const requestParams = {
            connectedDid : this.delegateDid ?? this.connectedDid,
            agent        : this.agent,
            message      : permission.message,
          };
          requests.push(await PermissionRequest.parse(requestParams));
        }

        return requests;
      },
      /**
       * Query permission grants. You can filter by grantee, grantor, protocol and specify if you want to query a remote DWN.
       */
      queryGrants: async(request: FetchGrantsRequest = {}): Promise<PermissionGrant[]> => {
        const { checkRevoked, from, ...params } = request;
        const remote = from !== undefined;
        const author = this.delegateDid ?? this.connectedDid;
        const target = from ?? this.delegateDid ?? this.connectedDid;
        const fetchResponse = await this.permissionsApi.fetchGrants({
          ...params,
          author,
          target,
          remote,
        });

        const grants: PermissionGrant[] = [];
        for (const permission of fetchResponse) {
          const grantParams = {
            connectedDid : this.delegateDid ?? this.connectedDid,
            agent        : this.agent,
            message      : permission.message,
          };

          if (checkRevoked) {
            const grantRecordId = permission.grant.id;
            if(await this.permissionsApi.isGrantRevoked({ author, target, grantRecordId, remote })) {
              continue;
            }
          }
          grants.push(await PermissionGrant.parse(grantParams));
        }

        return grants;
      }
    };
  }

  /**
   * API to interact with DWN protocols (e.g., `dwn.protocols.configure()`).
   */
  get protocols() {
    return {
      /**
       * Configure method, used to setup a new protocol (or update) with the passed definitions
       */
      configure: async (request: ProtocolsConfigureRequest): Promise<ProtocolsConfigureResponse> => {

        const agentRequest:ProcessDwnRequest<DwnInterface.ProtocolsConfigure> = {
          author        : this.connectedDid,
          messageParams : request.message,
          messageType   : DwnInterface.ProtocolsConfigure,
          target        : this.connectedDid
        };

        if (this.delegateDid) {
          const { message: delegatedGrant } = await this.permissionsApi.getPermissionForRequest({
            connectedDid : this.connectedDid,
            delegateDid  : this.delegateDid,
            protocol     : request.message.definition.protocol,
            delegate     : true,
            cached       : true,
            messageType  : agentRequest.messageType
          });

          agentRequest.messageParams = {
            ...agentRequest.messageParams,
            delegatedGrant
          };
          agentRequest.granteeDid = this.delegateDid;
        }

        const agentResponse = await this.agent.processDwnRequest(agentRequest);

        const { message, messageCid, reply: { status }} = agentResponse;
        const response: ProtocolsConfigureResponse = { status };

        if (status.code < 300) {
          const metadata = { author: this.connectedDid, messageCid };
          response.protocol = new Protocol(this.agent, message, metadata);
        }

        return response;
      },

      /**
       * Query the available protocols
       */
      query: async (request: ProtocolsQueryRequest): Promise<ProtocolsQueryResponse> => {
        const agentRequest: ProcessDwnRequest<DwnInterface.ProtocolsQuery> = {
          author        : this.connectedDid,
          messageParams : request.message,
          messageType   : DwnInterface.ProtocolsQuery,
          target        : request.from || this.connectedDid
        };

        if (this.delegateDid) {
          // We attempt to get a grant within a try catch, if there is no grant we will still sign the query with the delegate DID's key
          // If the protocol is public, the query should be successful. This allows the app to query for public protocols without having a grant.

          try {
            const { grant: { id: permissionGrantId } } = await this.permissionsApi.getPermissionForRequest({
              connectedDid : this.connectedDid,
              delegateDid  : this.delegateDid,
              protocol     : request.message.filter.protocol,
              cached       : true,
              messageType  : agentRequest.messageType
            });

            agentRequest.messageParams = {
              ...agentRequest.messageParams,
              permissionGrantId
            };
            agentRequest.granteeDid = this.delegateDid;
          } catch(_error:any) {
            // if a grant is not found, we should author the request as the delegated DID to get public protocols
            agentRequest.author = this.delegateDid;
          }
        }

        let agentResponse: DwnResponse<DwnInterface.ProtocolsQuery>;

        if (request.from) {
          agentResponse = await this.agent.sendDwnRequest(agentRequest);
        } else {
          agentResponse = await this.agent.processDwnRequest(agentRequest);
        }

        const reply = agentResponse.reply;
        const { entries = [], status  } = reply;

        const protocols = entries.map((entry) => {
          const metadata = { author: this.connectedDid };
          return new Protocol(this.agent, entry, metadata);
        });

        return { protocols, status };
      }
    };
  }

  /**
   * API to interact with DWN records (e.g., `dwn.records.create()`).
   */
  get records() {

    return {
      /**
       * Alias for the `write` method
       */
      create: async (request: RecordsCreateRequest): Promise<RecordsCreateResponse> => {
        return this.records.write(request);
      },

      /**
       * Write a record based on an existing one (useful for updating an existing record)
       */
      createFrom: async (request: RecordsCreateFromRequest): Promise<RecordsWriteResponse> => {
        const { author: inheritedAuthor, ...inheritedProperties } = request.record.toJSON();

        // If `data` is being updated then `dataCid` and `dataSize` must not be present.
        if (request.data !== undefined) {
          delete inheritedProperties.dataCid;
          delete inheritedProperties.dataSize;
        }

        // If `published` is set to false, ensure that `datePublished` is undefined. Otherwise, DWN SDK's schema validation
        // will throw an error if `published` is false but `datePublished` is set.
        if (request.message?.published === false && inheritedProperties.datePublished !== undefined) {
          delete inheritedProperties.datePublished;
          delete inheritedProperties.published;
        }

        // If the request changes the `author` or message `descriptor` then the deterministic `recordId` will change.
        // As a result, we will discard the `recordId` if either of these changes occur.
        if (!isEmptyObject(request.message) || (request.author && request.author !== inheritedAuthor)) {
          delete inheritedProperties.recordId;
        }

        return this.records.write({
          data    : request.data,
          message : {
            ...inheritedProperties,
            ...request.message,
          },
        });
      },

      /**
       * Delete a record
       */
      delete: async (request: RecordsDeleteRequest): Promise<DwnResponseStatus> => {
        const agentRequest: ProcessDwnRequest<DwnInterface.RecordsDelete> = {
          /**
           * The `author` is the DID that will sign the message and must be the DID the Web5 app is
           * connected with and is authorized to access the signing private key of.
           */
          author        : this.connectedDid,
          messageParams : request.message,
          messageType   : DwnInterface.RecordsDelete,
          /**
           * The `target` is the DID of the DWN tenant under which the delete will be executed.
           * If `from` is provided, the delete operation will be executed on a remote DWN.
           * Otherwise, the record will be deleted on the local DWN.
           */
          target        : request.from || this.connectedDid
        };

        if (this.delegateDid) {
          const { message: delegatedGrant } = await this.permissionsApi.getPermissionForRequest({
            connectedDid : this.connectedDid,
            delegateDid  : this.delegateDid,
            protocol     : request.protocol,
            delegate     : true,
            cached       : true,
            messageType  : agentRequest.messageType
          });

          agentRequest.messageParams = {
            ...agentRequest.messageParams,
            delegatedGrant
          };
          agentRequest.granteeDid = this.delegateDid;
        }

        let agentResponse: DwnResponse<DwnInterface.RecordsDelete>;

        if (request.from) {
          agentResponse = await this.agent.sendDwnRequest(agentRequest);
        } else {
          agentResponse = await this.agent.processDwnRequest(agentRequest);
        }

        const { reply: { status } } = agentResponse;

        return { status };
      },
      /**
       * Query a single or multiple records based on the given filter
       */
      query: async (request: RecordsQueryRequest): Promise<RecordsQueryResponse> => {
        const agentRequest: ProcessDwnRequest<DwnInterface.RecordsQuery> = {
          /**
           * The `author` is the DID that will sign the message and must be the DID the Web5 app is
           * connected with and is authorized to access the signing private key of.
           */
          author        : this.connectedDid,
          messageParams : request.message,
          messageType   : DwnInterface.RecordsQuery,
          /**
           * The `target` is the DID of the DWN tenant under which the query will be executed.
           * If `from` is provided, the query operation will be executed on a remote DWN.
           * Otherwise, the local DWN will be queried.
           */
          target        : request.from || this.connectedDid
        };

        if (this.delegateDid) {
          // if we don't find a delegated grant, we will attempt to query signing as the delegated DID
          // This is to allow the API caller to query public records without needing to impersonate the delegate.
          //
          // NOTE: When a read-only DwnApi is implemented, callers should use that instead when they don't have an explicit permission.
          // This should fail if a permission is not found.
          // TODO: https://github.com/TBD54566975/web5-js/issues/898
          try {
            const { message: delegatedGrant } = await this.permissionsApi.getPermissionForRequest({
              connectedDid : this.connectedDid,
              delegateDid  : this.delegateDid,
              protocol     : request.protocol,
              delegate     : true,
              cached       : true,
              messageType  : agentRequest.messageType
            });

            agentRequest.messageParams = {
              ...agentRequest.messageParams,
              delegatedGrant
            };
            agentRequest.granteeDid = this.delegateDid;
          } catch(_error:any) {
            // if a grant is not found, we should author the request as the delegated DID to get public records
            agentRequest.author = this.delegateDid;
          }
        }


        let agentResponse: DwnResponse<DwnInterface.RecordsQuery>;

        if (request.from) {
          agentResponse = await this.agent.sendDwnRequest(agentRequest);
        } else {
          agentResponse = await this.agent.processDwnRequest(agentRequest);
        }

        const reply = agentResponse.reply;
        const { entries = [], status, cursor } = reply;

        const records = entries.map((entry) => {

          const recordOptions = {
            /**
             * Extract the `author` DID from the record entry since records may be signed by the
             * tenant owner or any other entity.
             */
            author       : getRecordAuthor(entry),
            /**
             * Set the `connectedDid` to currently connected DID so that subsequent calls to
             * {@link Record} instance methods, such as `record.update()` are executed on the
             * local DWN even if the record was returned by a query of a remote DWN.
             */
            connectedDid : this.connectedDid,
            /**
             * If the record was returned by a query of a remote DWN, set the `remoteOrigin` to
             * the DID of the DWN that returned the record. The `remoteOrigin` property will be used
             * to determine which DWN to send subsequent read requests to in the event the data
             * payload exceeds the threshold for being returned with queries.
             */
            remoteOrigin : request.from,
            delegateDid  : this.delegateDid,
            ...entry as DwnMessage[DwnInterface.RecordsWrite]
          };
          const record = new Record(this.agent, recordOptions, this.permissionsApi);
          return record;
        });

        return { records, status, cursor };
      },

      /**
       * Read a single record based on the given filter
       */
      read: async (request: RecordsReadRequest): Promise<RecordsReadResponse> => {
        const agentRequest: ProcessDwnRequest<DwnInterface.RecordsRead> = {
          /**
           * The `author` is the DID that will sign the message and must be the DID the Web5 app is
           * connected with and is authorized to access the signing private key of.
           */
          author        : this.connectedDid,
          messageParams : request.message,
          messageType   : DwnInterface.RecordsRead,
          /**
           * The `target` is the DID of the DWN tenant under which the read will be executed.
           * If `from` is provided, the read operation will be executed on a remote DWN.
           * Otherwise, the read will occur on the local DWN.
           */
          target        : request.from || this.connectedDid
        };
        if (this.delegateDid) {
          // if we don't find a delegated grant, we will attempt to read signing as the delegated DID
          // This is to allow the API caller to read public records without needing to impersonate the delegate.
          //
          // NOTE: When a read-only DwnApi is implemented, callers should use that instead when they don't have an explicit permission.
          // This should fail if a permission is not found.
          // TODO: https://github.com/TBD54566975/web5-js/issues/898

          try {
            const { message: delegatedGrant } = await this.permissionsApi.getPermissionForRequest({
              connectedDid : this.connectedDid,
              delegateDid  : this.delegateDid,
              protocol     : request.protocol,
              delegate     : true,
              cached       : true,
              messageType  : agentRequest.messageType
            });

            agentRequest.messageParams = {
              ...agentRequest.messageParams,
              delegatedGrant
            };
            agentRequest.granteeDid = this.delegateDid;
          } catch(_error:any) {
            // if a grant is not found, we should author the request as the delegated DID to get public records
            agentRequest.author = this.delegateDid;
          }
        }

        let agentResponse: DwnResponse<DwnInterface.RecordsRead>;

        if (request.from) {
          agentResponse = await this.agent.sendDwnRequest(agentRequest);
        } else {
          agentResponse = await this.agent.processDwnRequest(agentRequest);
        }

        const { reply: { record: responseRecord, status } } = agentResponse;

        let record: Record;
        if (200 <= status.code && status.code <= 299) {
          const recordOptions = {
            /**
             * Extract the `author` DID from the record since records may be signed by the
             * tenant owner or any other entity.
             */
            author       : getRecordAuthor(responseRecord),
            /**
             * Set the `connectedDid` to currently connected DID so that subsequent calls to
             * {@link Record} instance methods, such as `record.update()` are executed on the
             * local DWN even if the record was read from a remote DWN.
             */
            connectedDid : this.connectedDid,
            /**
             * If the record was returned by reading from a remote DWN, set the `remoteOrigin` to
             * the DID of the DWN that returned the record. The `remoteOrigin` property will be used
             * to determine which DWN to send subsequent read requests to in the event the data
             * payload must be read again (e.g., if the data stream is consumed).
             */
            remoteOrigin : request.from,
            delegateDid  : this.delegateDid,
            ...responseRecord,
          };

          record = new Record(this.agent, recordOptions, this.permissionsApi);
        }

        return { record, status };
      },

      /**
       * Subscribes to records based on the given filter and emits events to the `subscriptionHandler`.
       *
       * @param request must include the `message` with the subscription filter and the `subscriptionHandler` to process the events.
       * @returns the subscription status and the subscription object used to close the subscription.
       */
      subscribe: async (request: RecordsSubscribeRequest): Promise<RecordsSubscribeResponse> => {
        const agentRequest: ProcessDwnRequest<DwnInterface.RecordsSubscribe> = {
          /**
           * The `author` is the DID that will sign the message and must be the DID the Web5 app is
           * connected with and is authorized to access the signing private key of.
           */
          author        : this.connectedDid,
          messageParams : request.message,
          messageType   : DwnInterface.RecordsSubscribe,
          /**
           * The `target` is the DID of the DWN tenant under which the subscribe operation will be executed.
           * If `from` is provided, the subscribe operation will be executed on a remote DWN.
           * Otherwise, the local DWN will execute the subscribe operation.
           */
          target        : request.from || this.connectedDid,

          /**
           * The handler to process the subscription events.
           */
          subscriptionHandler: SubscriptionUtil.recordSubscriptionHandler({
            agent          : this.agent,
            connectedDid   : this.connectedDid,
            delegateDid    : this.delegateDid,
            permissionsApi : this.permissionsApi,
            request
          })
        };

        if (this.delegateDid) {
          // if we don't find a delegated grant, we will attempt to subscribe signing as the delegated DID
          // This is to allow the API caller to subscribe to public records without needing to impersonate the delegate.
          //
          // NOTE: When a read-only DwnApi is implemented, callers should use that instead when they don't have an explicit permission.
          // This should fail if a permission is not found.
          // TODO: https://github.com/TBD54566975/web5-js/issues/898
          try {
            const { message: delegatedGrant } = await this.permissionsApi.getPermissionForRequest({
              connectedDid : this.connectedDid,
              delegateDid  : this.delegateDid,
              protocol     : request.protocol,
              delegate     : true,
              cached       : true,
              messageType  : agentRequest.messageType
            });

            agentRequest.messageParams = {
              ...agentRequest.messageParams,
              delegatedGrant
            };
            agentRequest.granteeDid = this.delegateDid;
          } catch(_error:any) {
            // if a grant is not found, we should author the request as the delegated DID to get public records
            agentRequest.author = this.delegateDid;
          }
        };

        let agentResponse: DwnResponse<DwnInterface.RecordsSubscribe>;

        if (request.from) {
          agentResponse = await this.agent.sendDwnRequest(agentRequest);
        } else {
          agentResponse = await this.agent.processDwnRequest(agentRequest);
        }

        const reply = agentResponse.reply;
        const { status, subscription } = reply;

        return { status, subscription };
      },

      /**
       * Writes a record to the DWN
       *
       * As a convenience, the Record instance returned will cache a copy of the data.  This is done
       * to maintain consistency with other DWN methods, like RecordsQuery, that include relatively
       * small data payloads when returning RecordsWrite message properties. Regardless of data
       * size, methods such as `record.data.stream()` will return the data when called even if it
       * requires fetching from the DWN datastore.
       */
      write: async (request: RecordsWriteRequest): Promise<RecordsWriteResponse> => {
        const { dataBlob, dataFormat } = dataToBlob(request.data, request.message?.dataFormat);

        const dwnRequestParams: ProcessDwnRequest<DwnInterface.RecordsWrite> = {
          store         : request.store,
          messageType   : DwnInterface.RecordsWrite,
          messageParams : {
            ...request.message,
            dataFormat
          },
          author     : this.connectedDid,
          target     : this.connectedDid,
          dataStream : dataBlob
        };

        // if impersonation is enabled, fetch the delegated grant to use with the write operation
        if (this.delegateDid) {
          const { message: delegatedGrant } = await this.permissionsApi.getPermissionForRequest({
            connectedDid : this.connectedDid,
            delegateDid  : this.delegateDid,
            protocol     : request.message.protocol,
            delegate     : true,
            cached       : true,
            messageType  : dwnRequestParams.messageType
          });

          dwnRequestParams.messageParams = {
            ...dwnRequestParams.messageParams,
            delegatedGrant
          };
          dwnRequestParams.granteeDid = this.delegateDid;
        };

        const agentResponse = await this.agent.processDwnRequest(dwnRequestParams);

        const { message: responseMessage, reply: { status } } = agentResponse;

        let record: Record;
        if (200 <= status.code && status.code <= 299) {
          const recordOptions = {
            /**
             * Assume the author is the connected DID since the record was just written to the
             * local DWN.
             */
            author       : this.connectedDid,
            /**
             * Set the `connectedDid` to currently connected DID so that subsequent calls to
             * {@link Record} instance methods, such as `record.update()` are executed on the
             * local DWN.
             */
            connectedDid : this.connectedDid,
            encodedData  : dataBlob,
            delegateDid  : this.delegateDid,
            ...responseMessage,
          };

          record = new Record(this.agent, recordOptions, this.permissionsApi);
        }

        return { record, status };
      },
    };
  }
}