import { Interface } from './Interface.js';
import { dataToBytes } from '../../utils.js';

class Records extends Interface {
  constructor(dwn) {
    super(dwn, dwn.SDK.DwnInterfaceName.Records);
  }

  async delete(target, request) {
    return this.send(this.dwn.SDK.DwnMethodName.Delete, target, request);
  }

  async read(target, request) {
    return this.send(this.dwn.SDK.DwnMethodName.Read, target, request);
  }

  async query(target, request) {
    return this.send(this.dwn.SDK.DwnMethodName.Query, target, request);
  }

  async write(target, request) {
    // Convert string/object data to bytes before further processing.
    const { dataBytes, dataFormat } = dataToBytes(request.data, request.message.dataFormat);
    return this.send(this.dwn.SDK.DwnMethodName.Write, target, {
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
