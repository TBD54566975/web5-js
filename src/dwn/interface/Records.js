import { Interface } from './Interface.js';
import { dataToBytes } from '../../utils.js';

class Records extends Interface {
  constructor(dwn) {
    super(dwn, 'Records');
  }

  async delete(target, request) {
    return this.send('Delete', target, request);
  }

  async query(target, request) {
    return this.send('Query', target, request);
  }

  async write(target, request) {
    // Convert string/object data to bytes before further processing.
    const { dataBytes, dataFormat } = dataToBytes(request.data, request.message.dataFormat);
    return this.send('Write', target, {
      ...request,
      data: dataBytes,
      message: {
        ...request.message,
        dataFormat,
      },
    });
  }
}

export {
  Records,
};
