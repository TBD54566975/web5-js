import { Interface } from './Interface.js';

class Protocols extends Interface {
  constructor(dwn) {
    super(dwn, dwn.SDK.DwnInterfaceName.Protocols);
  }

  async configure(target, request) {
    return this.send(this.dwn.SDK.DwnMethodName.Configure, target, request);
  }

  async query(target, request) {
    return this.send(this.dwn.SDK.DwnMethodName.Query, target, request);
  }
}

export {
  Protocols,
};
