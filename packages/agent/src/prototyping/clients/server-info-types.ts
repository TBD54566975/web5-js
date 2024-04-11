import { KeyValueStore } from '@web5/common';

export type ServerInfo = {
  /** the maximum file size the user can request to store */
  maxFileSize: number,
  /**
   * an array of strings representing the server's registration requirements.
   *
   * ie. ['proof-of-work-sha256-v0', 'terms-of-service']
   * */
  registrationRequirements: string[],
  /** whether web socket support is enabled on this server */
  webSocketSupport: boolean,
}

export interface DwnServerInfoCache extends KeyValueStore<string, ServerInfo| undefined> {}

export interface DwnServerInfoRpc {
  /** retrieves the DWN Sever info, used to detect features such as WebSocket Subscriptions */
  getServerInfo(url: string): Promise<ServerInfo>;
}