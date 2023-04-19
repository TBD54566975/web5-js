import { Interface } from './interface.js';

class Protocols extends Interface {
  constructor(dwn) {
    super(dwn, 'Protocols');
  }

  async configure(target, request) {
    return this.send('Configure', target, request);
  }

  async query(target, request) {
    return this.send('Query', target, request);
  }
}

export {
  Protocols,
};
