import { expect } from 'chai';

import type { SyncEngine } from '../src/types/sync.js';

import { AgentSyncApi } from '../src/sync-api.js';

describe('AgentSyncApi', () => {

  describe('get agent', () => {
    it(`returns the 'agent' instance property`, async () => {
      // @ts-expect-error because we are only mocking a single property.
      const mockAgent: Web5ManagedAgent = {
        agentDid: 'did:method:abc123'
      };
      const mockSyncEngine: SyncEngine = {} as SyncEngine;
      const syncApi = new AgentSyncApi({ agent: mockAgent, syncEngine: mockSyncEngine });
      const agent = syncApi.agent;
      expect(agent).to.exist;
      expect(agent.agentDid).to.equal('did:method:abc123');
    });

    it(`throws an error if the 'agent' instance property is undefined`, () => {
      const mockSyncEngine: SyncEngine = {} as SyncEngine;
      const syncApi = new AgentSyncApi({ syncEngine: mockSyncEngine });
      expect(() =>
        syncApi.agent
      ).to.throw(Error, 'Unable to determine agent execution context');
    });
  });
});