import { DwnConstant } from '@tbd54566975/dwn-sdk-js';

import { Interface } from './interface.js';
import { Record } from '../models/record.js';
import { dataToBytes, isEmptyObject } from '../../utils.js';

export class Records extends Interface {
  constructor(dwn) {
    super(dwn, 'Records');
  }

  async create(...args) {
    return this.write(...args);
  }

  async createFrom(target, request) {
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

    return this.write(target, {
      author: request.author || inheritedAuthor,
      data: request.data,
      message: {
        ...inheritedProperties,
        ...request.message,
      },
    });
  } 

  async delete(target, request) {
    const response = await this.send('Delete', target, request);
    return response;
  }

  async read(target, request) {
    const response = await this.send('Read', target, request);

    let record;
    if (response?.record) {
      record = new Record(this.dwn, { ...response.record, target, author: request.author });
    }

    return { ...response, record };
  }

  async query(target, request) {
    const response = await this.send('Query', target, request);
    const entries = response.entries.map(entry => new Record(this.dwn, { ...entry, target, author: request.author }));

    return { ...response, entries };
  }

  async write(target, request) {
    let dataBytes, dataFormat;
    if (request?.data) {
      // If `data` is specified, convert string/object data to bytes before further processing.
      ({ dataBytes, dataFormat } = dataToBytes(request.data, request.message?.dataFormat));
    } else {
      // If not, `dataFormat` must be specified in the request message.
      dataFormat = request.message.dataFormat;
    }

    const response = await this.send('Write', target, {
      ...request,
      data: dataBytes,
      message: {
        ...request.message,
        dataFormat,
      },
    });

    let record;
    if (response?.message) {
      // Include data if `dataSize` is less than DWN 'max data size allowed to be encoded'.
      const encodedData = (response.message?.descriptor?.dataSize <= DwnConstant.maxDataSizeAllowedToBeEncoded) ? dataBytes : null;
      
      record = new Record(this.dwn, { ...response.message, encodedData, target, author: request.author });
    }

    return { ...response, record };
  }
}
