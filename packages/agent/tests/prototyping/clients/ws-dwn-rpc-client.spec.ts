import type { Dwn } from '@tbd54566975/dwn-sdk-js';

import { expect } from 'chai';
import { Convert } from '@web5/common';

import type { PortableIdentity } from '../../../src/types/identity.js';

import { AgentDwnApi } from '../../../src/dwn-api.js';
import { TestAgent } from '../../utils/test-agent.js';
import { testDwnUrl } from '../../utils/test-config.js';

// NOTE: @noble/secp256k1 requires globalThis.crypto polyfill for node.js <=18: https://github.com/paulmillr/noble-secp256k1/blob/main/README.md#usage
// Remove when we move off of node.js v18 to v20, earliest possible time would be Oct 2023: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';
import { WebSocketDwnRpcClient } from '../../../src/prototyping/clients/web-socket-clients.js';
import { BearerIdentity } from '../../../src/bearer-identity.js';
// @ts-expect-error - globalThis.crypto and webcrypto are of different types.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

let testDwnUrls: string[] = [testDwnUrl];

describe('WebSocketDwnRpcClient', () => {
  let connection: WebSocketDwnRpcClient;

  beforeEach(async () => {
    connection = new WebSocketDwnRpcClient();
  });

  describe('sendRequest', () => {
  });
});