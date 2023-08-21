import type { DwnResponse, Web5Agent } from '@web5/agent';
import type {
  UnionMessageReply,
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
import { DwnInterfaceName, DwnMethodName } from '@tbd54566975/dwn-sdk-js';

import { Record } from './record.js';
import { Protocol } from './protocol.js';
import { dataToBlob } from './utils.js';

export type ProtocolsConfigureRequest = {
  message: Omit<ProtocolsConfigureOptions, 'authorizationSignatureInput'>;
}

export type ProtocolsConfigureResponse = {
  status: UnionMessageReply['status'];
  protocol?: Protocol;
}

export type ProtocolsQueryReplyEntry = {
  descriptor: ProtocolsConfigureDescriptor;
};

export type ProtocolsQueryRequest = {
  from?: string;
  message: Omit<ProtocolsQueryOptions, 'authorizationSignatureInput'>
}

export type ProtocolsQueryResponse = {
  protocols: Protocol[];
  status: UnionMessageReply['status'];
}

export type RecordsCreateRequest = RecordsWriteRequest;

export type RecordsCreateResponse = RecordsWriteResponse;

export type RecordsCreateFromRequest = {
  author: string;
  data: unknown;
  message?: Omit<RecordsWriteOptions, 'authorizationSignatureInput'>;
  record: Record;
}

export type RecordsDeleteRequest = {
  from?: string;
  message: Omit<RecordsDeleteOptions, 'authorizationSignatureInput'>;
}

export type RecordsDeleteResponse = {
  status: UnionMessageReply['status'];
};

export type RecordsQueryRequest = {
  /** The from property indicates the DID to query from and return results. */
  from?: string;
  message: Omit<RecordsQueryOptions, 'authorizationSignatureInput'>;
}

export type RecordsQueryResponse = {
  status: UnionMessageReply['status'];
  records?: Record[]
};

export type RecordsReadRequest = {
  /** The from property indicates the DID to read from and return results fro. */
  from?: string;
  message: Omit<RecordsReadOptions, 'authorizationSignatureInput'>;
}

export type RecordsReadResponse = {
  status: UnionMessageReply['status'];
  record: Record;
};

export type RecordsWriteRequest = {
  data: unknown;
  message?: Omit<Partial<RecordsWriteOptions>, 'authorizationSignatureInput'>;
  store?: boolean;
}

export type RecordsWriteResponse = {
  status: UnionMessageReply['status'];
  record?: Record
};

/**
 * TODO: Document class.
 */
export class DwnApi {
  private agent: Web5Agent;
  private connectedDid: string;

  constructor(options: { agent: Web5Agent, connectedDid: string }) {
    this.agent = options.agent;
    this.connectedDid = options.connectedDid;
  }

  /**
 * TODO: Document namespace.
 */
  get protocols() {
    return {
      /**
       * TODO: Document method.
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
       * TODO: Document method.
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

          return new Protocol(this.agent, entry, metadata);
        });

        return { protocols, status };
      }
    };
  }

  /**
   * TODO: Document namespace.
   */
  get records() {
    return {
      /**
       * TODO: Document method.
       */
      create: async (request: RecordsCreateRequest): Promise<RecordsCreateResponse> => {
        return this.records.write(request);
      },

      /**
       * TODO: Document method.
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
       * TODO: Document method.
       */
      delete: async (request: RecordsDeleteRequest): Promise<RecordsDeleteResponse> => {
        const agentRequest = {
          author         : this.connectedDid,
          messageOptions : request.message,
          messageType    : DwnInterfaceName.Records + DwnMethodName.Delete,
          target         : request.from || this.connectedDid
        };

        let agentResponse;

        if (request.from) {
          agentResponse = await this.agent.sendDwnRequest(agentRequest);
        } else {
          agentResponse = await this.agent.processDwnRequest(agentRequest);
        }

        //! TODO: (Frank -> Moe): This quirk is the result of how 4XX errors are being returned by `dwn-server`
        //!                       When DWN SDK returns 404, agentResponse is { status: { code: 404 }} and that's it.
        //!                       Need to decide how to resolve.
        let status;
        if (agentResponse.reply) {
          ({ reply: { status } } = agentResponse);
        } else {
          ({ status } = agentResponse);
        }

        return { status };
      },

      /**
       * TODO: Document method.
       */
      query: async (request: RecordsQueryRequest): Promise<RecordsQueryResponse> => {
        const agentRequest = {
          author         : this.connectedDid,
          messageOptions : request.message,
          messageType    : DwnInterfaceName.Records + DwnMethodName.Query,
          target         : request.from || this.connectedDid
        };

        let agentResponse;

        if (request.from) {
          agentResponse = await this.agent.sendDwnRequest(agentRequest);
        } else {
          agentResponse = await this.agent.processDwnRequest(agentRequest);
        }

        const { reply: { entries, status } } = agentResponse;

        const records = entries.map((entry: RecordsQueryReplyEntry) => {
          const recordOptions = {
            author : this.connectedDid,
            target : this.connectedDid,
            ...entry as RecordsWriteMessage
          };
          const record = new Record(this.agent, recordOptions);
          return record;
        });

        return { records, status };
      },

      /**
       * TODO: Document method.
       */
      read: async (request: RecordsReadRequest): Promise<RecordsReadResponse> => {
        const agentRequest = {
          author         : this.connectedDid,
          messageOptions : request.message,
          messageType    : DwnInterfaceName.Records + DwnMethodName.Read,
          target         : request.from || this.connectedDid
        };

        let agentResponse;

        if (request.from) {
          agentResponse = await this.agent.sendDwnRequest(agentRequest);
        } else {
          agentResponse = await this.agent.processDwnRequest(agentRequest);
        }

        //! TODO: (Frank -> Moe): This quirk is the result of how 4XX errors are being returned by `dwn-server`
        //!                       When DWN SDK returns 404, agentResponse is { status: { code: 404 }} and that's it.
        //!                       Need to decide how to resolve.
        let responseRecord;
        let status;
        if (agentResponse.reply) {
          ({ reply: { record: responseRecord, status } } = agentResponse);
        } else {
          ({ status } = agentResponse);
        }

        let record: Record;
        if (200 <= status.code && status.code <= 299) {
          const recordOptions = {
            author : this.connectedDid,
            target : this.connectedDid,
            ...responseRecord,
          };

          record = new Record(this.agent, recordOptions);
        }

        return { record, status };
      },

      /**
       * TODO: Document method.
       *
       * As a convenience, the Record instance returned will cache a copy of the data if the
       * data size, in bytes, is less than the DWN 'max data size allowed to be encoded'
       * parameter of 10KB. This is done to maintain consistency with other DWN methods,
       * like RecordsQuery, that include relatively small data payloads when returning
       * RecordsWrite message properties. Regardless of data size, methods such as
       * `record.data.stream()` will return the data when called even if it requires fetching
       * from the DWN datastore.
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
            author      : this.connectedDid,
            encodedData : dataBlob,
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