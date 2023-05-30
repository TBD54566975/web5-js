import { expect } from 'chai';

import { Web5 } from '../src/web5.js';
import { TestAbstractLevel } from './test-utils/test-abstract-level.js';
import { Level } from 'level';
import { MemoryLevel } from 'memory-level';

let testAbstractLevel: TestAbstractLevel<MemoryLevel>;
let testLevel: TestAbstractLevel<Level>;

describe.only('web5.connect', () => {
  before(async () => {
    testLevel = TestAbstractLevel.createLevelStorage();
    testAbstractLevel = TestAbstractLevel.createAbstractStorage();

    await testLevel.clearStorage();
    await testAbstractLevel.clearStorage();
  });

  beforeEach(async () => {
    await testLevel.clearStorage();
    await testAbstractLevel.clearStorage();
  });

  after(async () => {
    await testLevel.clearStorage();
    await testAbstractLevel.clearStorage();
  });

  describe('connects with default storage', async () => {
    xit('level storage', async () => {
      const { web5, did: myDid } = await Web5.connect();
      expect(myDid).to.not.be.undefined;

      const otherDid = await web5.did.create('ion');
      expect(otherDid.id).to.not.be.undefined;
    }).timeout(10000);
  });

  describe('connects with custom storage', async () => {
    xit('level storage', async () => {

      const { web5, did: myDid } = await Web5.connect(undefined, testLevel.storage);

      expect(myDid).to.not.be.undefined;

      const WEB5_APP_DID = await testLevel.storage?.appStorage?.get('WEB5_APP_DID') || '';
      expect(JSON.parse(WEB5_APP_DID).id).to.not.be.undefined;
      expect(JSON.parse(WEB5_APP_DID).nonexisting).to.be.undefined;

      const PROFILE = await testLevel.storage?.profileStore?.get(`PROFILE_${myDid}`) || '';
      expect(PROFILE).to.not.be.undefined;
      expect(JSON.parse(PROFILE).did.id).to.be.equal(myDid);

      const REGISTERED_PROFILE = await testLevel.storage?.syncApi?.get(`!registeredProfiles!${myDid}`) || '';
      expect(REGISTERED_PROFILE).to.not.be.undefined;

      const otherDid = await web5.did.create('ion');
      expect(otherDid.id).to.not.be.undefined;
    }).timeout(10000);

    it.only('abstract-level storage', async () => {
      const { web5, did: myDid } = await Web5.connect<MemoryLevel>(undefined, testAbstractLevel.storage);
      expect(myDid).to.not.be.undefined;

      const WEB5_APP_DID = await testAbstractLevel.storage.appStorage?.get('WEB5_APP_DID') || '';
      expect(JSON.parse(WEB5_APP_DID).id).to.not.be.undefined;
      expect(JSON.parse(WEB5_APP_DID).nonexisting).to.be.undefined;

      const PROFILE = await testAbstractLevel.storage?.profileStore?.get(`PROFILE_${myDid}`) || '';
      expect(PROFILE).to.not.be.undefined;
      expect(JSON.parse(PROFILE).did.id).to.be.equal(myDid);

      const REGISTERED_PROFILE = await testAbstractLevel.storage?.syncApi?.get(`!registeredProfiles!${myDid}`) ;
      expect(REGISTERED_PROFILE).to.not.be.undefined;

      const otherDid = await web5.did.create('ion');
      expect(otherDid.id).to.not.be.undefined;
    }).timeout(10000);
  });
});