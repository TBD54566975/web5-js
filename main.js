
import { DWeb, DWeb2, DWebNodeSDK, transport } from './src/dweb';
import { ManagedDid } from './src/did';
import { connect } from './src/connect';

const Web5 = {
  records: DWeb2.records,
  send: DWeb2.send,
  transport: transport
}

export {
  DWeb,
  connect,
  DWebNodeSDK,
  ManagedDid,
  Web5
}
