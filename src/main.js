
// import * as DID from './dids';
import { DWeb, DWebNodeSDK, transports } from './dweb';
import * as DID from './did';
import { connect } from './connect';

const Web5 = {
  did: DID,
  protocols: DWeb.protocols,
  records: DWeb.records,
  send: DWeb.send,
  transports: transports
};

export {
  connect,
  DWebNodeSDK,
  Web5,
  DWeb
};
