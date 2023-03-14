import { Interface } from './Interface';

class Records extends Interface{
  constructor(web5) {
    super(web5, 'Records');
  }

  async delete(target, request) {
    return this.send('Delete', target, request);
  }

  async query(target, request) {
    return this.send('Query', target, request);
  }

  async write(target, request) {
    return this.send('Write', target, request);
  }
}

export {
  Records,
};
