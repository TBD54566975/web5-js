import type { Web5Agent } from '@tbd54566975/web5-agent';
import type {
  MessageReply,
  RecordsReadOptions,
  RecordsQueryOptions,
  RecordsWriteMessage,
  RecordsWriteOptions,
  RecordsDeleteOptions,
  ProtocolsQueryOptions,
  ProtocolsConfigureOptions,
} from '@tbd54566975/dwn-sdk-js';

import { DwnInterfaceName, DwnMethodName, DataStream } from '@tbd54566975/dwn-sdk-js';

import { Record } from './record.js';
import { dataToBytes } from './utils.js';

export type RecordsWriteRequest = {
  author: string;
  data: unknown;
  message?: Omit<RecordsWriteOptions, 'authorizationSignatureInput' | 'data'>;
}

export type RecordsWriteResponse = MessageReply & {
  record?: Record
};

export type RecordsQueryRequest = {
  author: string;
  message: Omit<RecordsQueryOptions, 'authorizationSignatureInput'>;
}

export type RecordsQueryResponse = MessageReply & {
  records: Record[]
};

export type RecordsDeleteRequest = {
  author: string;
  message: Omit<RecordsDeleteOptions, 'authorizationSignatureInput'>;
}

export type RecordsDeleteResponse = MessageReply;

export type RecordsReadRequest = {
  author: string;
  message: Omit<RecordsReadOptions, 'authorizationSignatureInput'>;
}

export type RecordsReadResponse = MessageReply;

export type ProtocolsConfigureRequest = {
  author: string;
  message: Omit<ProtocolsConfigureOptions, 'authorizationSignatureInput'>;
}

export type ProtocolsQueryRequest = {
  author: string;
  message: Omit<ProtocolsQueryOptions, 'authorizationSignatureInput'>
}

export const DwnApi = (web5Agent: Web5Agent) => ({
  protocols: {
    async configure(target: string, request: ProtocolsConfigureRequest) {
      return await web5Agent.processDwnRequest({
        target         : target,
        author         : request.author,
        messageOptions : request.message,
        messageType    : DwnInterfaceName.Protocols + DwnMethodName.Configure
      });
    },
    async query(target: string, request: ProtocolsQueryRequest) {
      return await web5Agent.processDwnRequest({
        target         : target,
        author         : request.author,
        messageOptions : request.message,
        messageType    : DwnInterfaceName.Protocols + DwnMethodName.Query
      });
    }
  },
  records: {
    async write(target: string, request: RecordsWriteRequest): Promise<RecordsWriteResponse> {
      const { author, data, message: requestMessage } = request;
      const messageOptions: Partial<RecordsWriteOptions> = {
        ...requestMessage
      };

      let dataStream: _Readable.Readable;

      if (data instanceof Blob || data instanceof ReadableStream) {
        //! TODO: get dataSize and dataCid of data
      } else {
        const { dataBytes, dataFormat } = dataToBytes(request.data, messageOptions.dataFormat);
        messageOptions.data = dataBytes;
        messageOptions.dataFormat = dataFormat;
        dataStream = DataStream.fromBytes(dataBytes);
      }

      const resp = await web5Agent.processDwnRequest({
        author,
        dataStream,
        messageType: DwnInterfaceName.Records + DwnMethodName.Write,
        messageOptions,
        target
      });

      const { message: responseMessage, reply } = resp;

      if (reply.status.code >= 400) {
        throw new Error('TODO: figure out whether we are throwing an exception');
      }

      const recordOptions = {
        author,
        target,
        ...responseMessage as RecordsWriteMessage,
      };

      const record = new Record(web5Agent, recordOptions);

      return { ...reply, record };
    },

    async create(_target: string, _request: RecordsWriteRequest): Promise<RecordsWriteResponse> {
      // TODO: damn i guess we have to turn this into a class.
      throw new Error('method not implemented');
    },

    async query(target: string, request: RecordsQueryRequest): Promise<RecordsQueryResponse> {
      const resp = await web5Agent.processDwnRequest({
        messageType    : DwnInterfaceName.Records + DwnMethodName.Query,
        author         : request.author,
        target         : target,
        messageOptions : request.message,
      });

      const { reply } = resp;
      const records = reply.entries.map(entry => new Record(this.dwn, { ...entry, target, author: request.author }));

      return { ...reply, records };
    },

    // async read(target: string, request: RecordsReadRequest): Promise<RecordsReadResponse> {
    //   const resp = await web5Agent.processDwnRequest({
    //     messageType    : DwnInterfaceName.Records + DwnMethodName.Query,
    //     author         : request.author,
    //     target         : target,
    //     messageOptions : request.message,
    //   });

    //   const { reply } = resp;
    //   // TODO: pick up here tomorrow

    // },

    async delete(target: string, request: RecordsDeleteRequest): Promise<RecordsDeleteResponse> {
      const resp = await web5Agent.processDwnRequest({
        messageType    : DwnInterfaceName.Records + DwnMethodName.Delete,
        author         : request.author,
        target         : target,
        messageOptions : request.message,
      });

      const { reply } = resp;

      return {  ...reply };
    }
  }
});