import type { DidState } from '@tbd54566975/dids';
import type { Web5Agent } from '@tbd54566975/web5-agent';

import  { Web5ProxyAgent } from '@tbd54566975/web5-proxy-agent';
import  { Web5UserAgent, ProfileApi } from '@tbd54566975/web5-user-agent';
import { DidResolver, DidIonApi, DidKeyApi } from '@tbd54566975/dids';

import { DwnApi } from './dwn-api.js';
import { DidApi } from './did-api.js';
import { AppStorage } from './app-storage.js';

// TODO: discuss what other options we want
export type Web5ConnectOptions = {
  web5Agent?: Web5Agent;
  // TODO: discuss whether this should be something that the user can provide. could also just ask for methodResolvers
  didResolver?: DidResolver;
}

export class Web5 {
  dwn: ReturnType<typeof DwnApi>;
  did: ReturnType<typeof DidApi>;

  private static APP_DID_KEY = 'WEB5_APP_DID';

  constructor(web5Agent: Web5Agent) {
    this.dwn = DwnApi(web5Agent);

    const DidIon = new DidIonApi();
    const DidKey = new DidKeyApi();
    const didResolver = new DidResolver({ methodResolvers: [DidIon, DidKey] });

    this.did = DidApi(didResolver);
  }

  static async connect() {
    const DidKey = new DidKeyApi();
    const DidIon = new DidIonApi();

    // load app's did
    const appStorage = new AppStorage();
    const cachedAppDidState = await appStorage.get(Web5.APP_DID_KEY);
    let appDidState: DidState;

    if (cachedAppDidState) {
      appDidState = JSON.parse(cachedAppDidState);
    } else {
      appDidState = await DidKey.create();
      appStorage.set(Web5.APP_DID_KEY, JSON.stringify(appDidState));
    }

    // TODO: sniff to see if remote agent is available
    // TODO: if available,connect to remote agent using Web5ProxyAgent

    // fall back to instantiating local agent
    const profileApi = new ProfileApi();
    let [ profile ] = await profileApi.listProfiles();

    // create enc. keys

    if (!profile) {
      const defaultProfileDid = await DidIon.create();
      // setting id & name as the app's did to make migration easier
      profile = await profileApi.createProfile({
        name        : appDidState.id,
        did         : defaultProfileDid,
        connections : [appDidState.id],
      });
    }

    const agent = await Web5UserAgent.create({ profileManager: profileApi });
    const web5 = new Web5(agent);

    return { web5, did: profile.did.id };
  }
}