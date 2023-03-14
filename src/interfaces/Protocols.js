import { Interface } from './Interface';

class Protocols extends Interface {
  constructor(web5) {
    super(web5, 'Protocols');
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
