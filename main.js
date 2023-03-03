
import { DWeb, DWebNodeSDK, transport } from './src/dweb';
import { ManagedDid } from './src/did';
import { connect } from './src/connect';

const Web5 = {
  records: DWeb.records,
  send: DWeb.send,
  transport: transport
}

export {
  connect,
  DWebNodeSDK,
  ManagedDid,
  Web5
}
