
import { DwnServerInfoCache, ServerInfo } from './server-info-types.js';

export class DwnServerInfoCacheNoOp implements DwnServerInfoCache {

  public async get(_dwnUrl: string): Promise<ServerInfo|undefined> {
    return;
  }

  public async set(_dwnUrl: string, _value: ServerInfo): Promise<void> {}

  public async delete(_dwnUrl: string): Promise<void> {}

  public async clear(): Promise<void> {}

  public async close(): Promise<void> {}
}