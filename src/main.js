import * as DID from './did';
import { DWeb, DWebNodeSDK, transports } from './dweb';
import { connect } from './connect';

const Web5 = {
  connect: connect,
  did: DID,
  protocols: DWeb.protocols,
  records: DWeb.records,
  send: DWeb.send,
  transports: transports
};

export {
  DWebNodeSDK,
  Web5,
  DWeb
};
