import { expect } from 'chai';
import { TestAgent } from '../common/utils/test-user-agent.js';

let testAgent: TestAgent;
let did: string;

describe('[Node only] Web5UserAgent', () => {
  before(async () => {
    testAgent = await TestAgent.create();
  });

  beforeEach(async () => {
    await testAgent.clearStorage();
    ({ did } = await testAgent.createProfile());
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('processDwnRequest', () => {
    xit('can accept Blobs');
  });
});