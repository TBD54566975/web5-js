import { expect } from 'chai';
import { ProfileApi } from '../../src/profile-api.js';
import { DidKeyApi } from '@tbd54566975/dids';

let profileApi: ProfileApi;

describe('ProfileApi', () => {
  before(() => {
    profileApi = new ProfileApi();
  });

  describe('deleteProfile', () => {
    it('deletes profile if it exists', async () => {
      const didKey = new DidKeyApi();
      const didState = await didKey.create();

      const profile = await profileApi.createProfile({
        name : didState.id,
        did  : didState,
      });
      expect(await profileApi.getProfile(profile.id)).to.exist;

      await profileApi.deleteProfile(profile.id);
      expect(await profileApi.getProfile(profile.id)).to.not.exist;
    });

    it('does not error when asked to delete profile that doesn\'t exist', async() => {
      const profileId = '123';
      expect(await profileApi.getProfile(profileId)).to.not.exist;
      expect(await profileApi.deleteProfile(profileId)).to.not.throw;
    });
  });
});
