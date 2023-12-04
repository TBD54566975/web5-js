import type { DwnResponse, Web5Agent } from '@web5/agent';
import type {
  RecordsReadOptions,
  RecordsQueryOptions,
  RecordsWriteMessage,
  RecordsWriteOptions,
  RecordsDeleteOptions,
  ProtocolsQueryOptions,
  RecordsQueryReplyEntry,
  ProtocolsConfigureMessage,
  ProtocolsConfigureOptions,
  ProtocolsConfigureDescriptor,
} from '@tbd54566975/dwn-sdk-js';

import { isEmptyObject } from '@web5/common';
import { DwnInterfaceName, DwnMethodName, RecordsWrite } from '@tbd54566975/dwn-sdk-js';

import { Record } from './record.js';
import { dataToBlob } from './utils.js';
import { Protocol } from './protocol.js';

/**
 * Status code and detailed message for a response.
 *
 * @beta
 */
export type ResponseStatus = {
  status: {
    code: number;
    detail: string;
  };
};

/**
 * Request to setup a protocol with its definitions
 *
 * @beta
 */
export type ProtocolsConfigureRequest = {
  message: Omit<ProtocolsConfigureOptions, 'signer'>;
}

/**
 * Response for the protocol configure request
 *
 * @beta
 */
export type ProtocolsConfigureResponse = ResponseStatus & {
  protocol?: Protocol;
}

/**
 * Represents each entry on the protocols query reply
 *
 * @beta
 */
export type ProtocolsQueryReplyEntry = {
  descriptor: ProtocolsConfigureDescriptor;
};

/**
 * Request to query protocols
 *
 * @beta
 */
export type ProtocolsQueryRequest = {
  from?: string;
  message: Omit<ProtocolsQueryOptions, 'signer'>
}

/**
 * Response with the retrieved protocols
 *
 * @beta
 */
export type ProtocolsQueryResponse = ResponseStatus & {
  protocols: Protocol[];
}

/**
 * Type alias for {@link RecordsWriteRequest}
 *
 * @beta
 */
export type RecordsCreateRequest = RecordsWriteRequest;

/**
 * Type alias for {@link RecordsWriteResponse}
 *
 * @beta
 */
export type RecordsCreateResponse = RecordsWriteResponse;

/**
 * Request to create a record from an existing one (useful for updating an existing record)
 *
 * @beta
 */
export type RecordsCreateFromRequest = {
  author: string;
  data: unknown;
  message?: Omit<RecordsWriteOptions, 'signer'>;
  record: Record;
}

/**
 * Request to delete a record from the DWN
 *
 * @beta
 */
export type RecordsDeleteRequest = {
  from?: string;
  message: Omit<RecordsDeleteOptions, 'signer'>;
}

/**
 * Request to query records from the DWN
 *
 * @beta
 */
export type RecordsQueryRequest = {
  /** The from property indicates the DID to query from and return results. */
  from?: string;
  message: Omit<RecordsQueryOptions, 'signer'>;
}

/**
 * Response for the query request
 *
 * @beta
 */
export type RecordsQueryResponse = ResponseStatus & {
  records?: Record[]

  /** If there are additional results, the messageCid of the last record will be returned as a pagination cursor. */
  cursor?: string;
};

/**
 * Request to read a record from the DWN
 *
 * @beta
 */
export type RecordsReadRequest = {
  /** The from property indicates the DID to read from and return results fro. */
  from?: string;
  message: Omit<RecordsReadOptions, 'signer'>;
}

/**
 * Response for the read request
 *
 * @beta
 */
export type RecordsReadResponse = ResponseStatus & {
  record: Record;
};

/**
 * Request to write a record to the DWN
 *
 * @beta
 */
export type RecordsWriteRequest = {
  data: unknown;
  message?: Omit<Partial<RecordsWriteOptions>, 'signer'>;
  store?: boolean;
}

/**
 * Response for the write request
 *
 * @beta
 */
export type RecordsWriteResponse = ResponseStatus & {
  record?: Record
};

/**
 * Interface to interact with DWN Records and Protocols
 *
 * @beta
 */
export class DwnApi {
  private agent: Web5Agent;
  private connectedDid: string;

  constructor(options: { agent: Web5Agent, connectedDid: string }) {
    this.agent = options.agent;
    this.connectedDid = options.connectedDid;
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
        const agentResponse = await this.agent.processDwnRequest({
          target         : this.connectedDid,
          author         : this.connectedDid,
          messageOptions : request.message,
          messageType    : DwnInterfaceName.Protocols + DwnMethodName.Configure
        });

        const { message, messageCid, reply: { status }} = agentResponse;
        const response: ProtocolsConfigureResponse = { status };

        if (status.code < 300) {
          const metadata = { author: this.connectedDid, messageCid };
          response.protocol = new Protocol(this.agent, message as ProtocolsConfigureMessage, metadata);
        }

        return response;
      },

      /**
       * Query the available protocols
       */
      query: async (request: ProtocolsQueryRequest): Promise<ProtocolsQueryResponse> => {
        const agentRequest = {
          author         : this.connectedDid,
          messageOptions : request.message,
          messageType    : DwnInterfaceName.Protocols + DwnMethodName.Query,
          target         : request.from || this.connectedDid
        };

        let agentResponse: DwnResponse;

        if (request.from) {
          agentResponse = await this.agent.sendDwnRequest(agentRequest);
        } else {
          agentResponse = await this.agent.processDwnRequest(agentRequest);
        }

        const { reply: { entries = [], status } } = agentResponse;

        const protocols = entries.map((entry: ProtocolsQueryReplyEntry) => {
          const metadata = { author: this.connectedDid, };

          // FIXME: dwn-sdk-js actually returns the entire ProtocolsConfigure message,
          //        but the type claims that it returns the message without authorization.
          //        When dwn-sdk-js fixes the type, we should remove `as ProtocolsConfigureMessage`
          return new Protocol(this.agent, entry as ProtocolsConfigureMessage, metadata);
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

        // Remove target from inherited properties since target is being explicitly defined in method parameters.
        delete inheritedProperties.target;


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
      delete: async (request: RecordsDeleteRequest): Promise<ResponseStatus> => {
        const agentRequest = {
          /**
           * The `author` is the DID that will sign the message and must be the DID the Web5 app is
           * connected with and is authorized to access the signing private key of.
           */
          author         : this.connectedDid,
          messageOptions : request.message,
          messageType    : DwnInterfaceName.Records + DwnMethodName.Delete,
          /**
           * The `target` is the DID of the DWN tenant under which the delete will be executed.
           * If `from` is provided, the delete operation will be executed on a remote DWN.
           * Otherwise, the record will be deleted on the local DWN.
           */
          target         : request.from || this.connectedDid
        };

        let agentResponse: DwnResponse;

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
        const agentRequest = {
          /**
           * The `author` is the DID that will sign the message and must be the DID the Web5 app is
           * connected with and is authorized to access the signing private key of.
           */
          author         : this.connectedDid,
          messageOptions : request.message,
          messageType    : DwnInterfaceName.Records + DwnMethodName.Query,
          /**
           * The `target` is the DID of the DWN tenant under which the query will be executed.
           * If `from` is provided, the query operation will be executed on a remote DWN.
           * Otherwise, the local DWN will be queried.
           */
          target         : request.from || this.connectedDid
        };

        let agentResponse: DwnResponse;

        if (request.from) {
          agentResponse = await this.agent.sendDwnRequest(agentRequest);
        } else {
          agentResponse = await this.agent.processDwnRequest(agentRequest);
        }

        const { reply: { entries, status, cursor } } = agentResponse;

        const records = entries.map((entry: RecordsQueryReplyEntry) => {
          const recordOptions = {
            /**
             * Extract the `author` DID from the record entry since records may be signed by the
             * tenant owner or any other entity.
             */
            author       : RecordsWrite.getAuthor(entry),
            /**
             * Set the `target` DID to currently connected DID so that subsequent calls to
             * {@link Record} instance methods, such as `record.update()` are executed on the
             * local DWN even if the record was returned by a query of a remote DWN.
             */
            target       : this.connectedDid,
            /**
             * If the record was returned by a query of a remote DWN, set the `remoteTarget` to
             * the DID of the DWN that returned the record. The `remoteTarget` will be used to
             * determine which DWN to send subsequent read requests to in the event the data payload
             * exceeds the threshold for being returned with queries.
             */
            remoteTarget : request.from,
            ...entry as RecordsWriteMessage
          };
          const record = new Record(this.agent, recordOptions);
          return record;
        });

        return { records, status, cursor };
      },

      /**
       * Read a single record based on the given filter
       */
      read: async (request: RecordsReadRequest): Promise<RecordsReadResponse> => {
        const agentRequest = {
          /**
           * The `author` is the DID that will sign the message and must be the DID the Web5 app is
           * connected with and is authorized to access the signing private key of.
           */
          author         : this.connectedDid,
          messageOptions : request.message,
          messageType    : DwnInterfaceName.Records + DwnMethodName.Read,
          /**
           * The `target` is the DID of the DWN tenant under which the read will be executed.
           * If `from` is provided, the read operation will be executed on a remote DWN.
           * Otherwise, the read will occur on the local DWN.
           */
          target         : request.from || this.connectedDid
        };

        let agentResponse: DwnResponse;

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
            author       : RecordsWrite.getAuthor(responseRecord),
            /**
             * Set the `target` DID to currently connected DID so that subsequent calls to
             * {@link Record} instance methods, such as `record.update()` are executed on the
             * local DWN even if the record was read from a remote DWN.
             */
            target       : this.connectedDid,
            /**
             * If the record was returned by a query of a remote DWN, set the `remoteTarget` to
             * the DID of the DWN that returned the record. The `remoteTarget` will be used to
             * determine which DWN to send subsequent read requests to in the event the data payload
             * exceeds the threshold for being returned with queries.
             */
            remoteTarget : request.from,
            ...responseRecord,
          };

          record = new Record(this.agent, recordOptions);
        }

        return { record, status };
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
        const messageOptions: Partial<RecordsWriteOptions> = {
          ...request.message
        };

        const { dataBlob, dataFormat } = dataToBlob(request.data, messageOptions.dataFormat);
        messageOptions.dataFormat = dataFormat;

        const agentResponse = await this.agent.processDwnRequest({
          author      : this.connectedDid,
          dataStream  : dataBlob,
          messageOptions,
          messageType : DwnInterfaceName.Records + DwnMethodName.Write,
          store       : request.store,
          target      : this.connectedDid
        });

        const { message, reply: { status } } = agentResponse;
        const responseMessage = message as RecordsWriteMessage;

        let record: Record;
        if (200 <= status.code && status.code <= 299) {
          const recordOptions = {
            /**
             * Assume the author is the connected DID since the record was just written to the
             * local DWN.
             */
            author      : this.connectedDid,
            encodedData : dataBlob,
            /**
             * Set the `target` DID to currently connected DID so that subsequent calls to
             * {@link Record} instance methods, such as `record.update()` are executed on the
             * local DWN.
             */
            target      : this.connectedDid,
            ...responseMessage,
          };

          record = new Record(this.agent, recordOptions);
        }

        return { record, status };
      },
    };
  }
}