import type { Web5Agent } from '@tbd54566975/web5-agent';
import type { RecordsWriteOptions } from '@tbd54566975/dwn-sdk-js';

import { DwnInterfaceName, DwnMethodName, DataStream } from '@tbd54566975/dwn-sdk-js';

import { dataToBytes } from './utils.js';

export type RecordsWriteRequest = {
  author: string;
  data: unknown;
  message?: Omit<RecordsWriteOptions, 'authorizationSignatureInput' | 'data'>;
}

export const DwnApi = (web5Agent: Web5Agent) => ({
  records: {
    async write(target: string, request: RecordsWriteRequest) {
      const { author, data, message } = request;
      const messageOptions: Partial<RecordsWriteOptions> = {
        ...message
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
    }
  }
});