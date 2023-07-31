import {
  Web5Agent,
  SendVcRequest,
  ProcessVcRequest,
  ProcessDwnRequest,
  VcResponse,
  SendDwnRequest,
  DwnResponse,
} from '@tbd54566975/web5-agent';

// TODO: concretely define json-rpc types specific to each Web5Agent interface method
// TODO: write http transport. that transport will be shareable with client for dwn-server
// TODO: write ws transport. that transport will be shareable with client for dwn-server
// TODO: figure out where to put DidConnect.
export class Web5ProxyAgent implements Web5Agent {
  processDwnRequest(_request: ProcessDwnRequest): Promise<DwnResponse> {
    throw new Error('Method not implemented.');
  }

  sendDwnRequest(_request: SendDwnRequest): Promise<DwnResponse> {
    throw new Error('Method not implemented.');
  }

  processVcRequest(_request: ProcessVcRequest): Promise<VcResponse> {
    throw new Error('Method not implemented.');
  }

  sendVcRequest(_request: SendVcRequest): Promise<VcResponse> {
    throw new Error('Method not implemented.');
  }
}