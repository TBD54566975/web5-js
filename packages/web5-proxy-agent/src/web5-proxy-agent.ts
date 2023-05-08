import type { DwnRequest, DwnResponse, Web5Agent } from '@tbd54566975/web5-agent';

export class Web5ProxyAgent implements Web5Agent {
  processDwnRequest(message: DwnRequest): Promise<DwnResponse> {
    throw new Error('Method not implemented.');
  }
}