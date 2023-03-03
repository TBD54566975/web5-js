export class ManagedDid {
  constructor() {
    this.connected = false;
    this.did;
    this.endpoint;
    this.keyChain;
    this.keypair;
  }

  toString() {
    return this.did;
  }
}