
import { DWeb, DWebNodeSDK, transports } from './src/dweb';
import { ManagedDid } from './src/did';
import { connect } from './src/connect';

const Web5 = {
  protocols: DWeb.protocols,
  records: DWeb.records,
  send: DWeb.send,
  transports: transports
}

export {
  connect,
  DWebNodeSDK,
  ManagedDid,
  Web5,
  DWeb
}
