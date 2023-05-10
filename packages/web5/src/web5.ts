import type { DidState, DidMethodApi, DidResolverCache } from '@tbd54566975/dids';
import type { Web5Agent } from '@tbd54566975/web5-agent';

// import  { Web5ProxyAgent } from '@tbd54566975/web5-proxy-agent';
import  { Web5UserAgent, ProfileApi } from '@tbd54566975/web5-user-agent';
import { DidIonApi, DidKeyApi } from '@tbd54566975/dids';

import { DwnApi } from './dwn-api.js';
import { DidApi } from './did-api.js';
import { AppStorage } from './app-storage.js';

// TODO: discuss what other options we want
export type Web5ConnectOptions = {
  web5Agent?: Web5Agent;
  // TODO: discuss whether this should be something that the user can provide. could also just ask for methodResolvers
  didMethodApis?: DidMethodApi[];
  didResolutionCache?: DidResolverCache;
}

export type Web5Options = {
  web5Agent: Web5Agent;
  appStorage?: AppStorage;
};

export class Web5 {
  appStorage: AppStorage;
  dwn: ReturnType<typeof DwnApi>;

  static did = new DidApi({
    didMethodApis: [new DidIonApi(), new DidKeyApi()]
  });

  private static APP_DID_KEY = 'WEB5_APP_DID';

  constructor(options: Web5Options) {
    this.dwn = DwnApi(options.web5Agent);
    this.appStorage ||= new AppStorage();
  }

  static async connect() {
    // load app's did
    const appStorage = new AppStorage();
    const cachedAppDidState = await appStorage.get(Web5.APP_DID_KEY);
    let appDidState: DidState;

    if (cachedAppDidState) {
      appDidState = JSON.parse(cachedAppDidState);
    } else {
      appDidState = await this.did.create('key');
      appStorage.set(Web5.APP_DID_KEY, JSON.stringify(appDidState));
    }

    // TODO: sniff to see if remote agent is available
    // TODO: if available,connect to remote agent using Web5ProxyAgent

    // fall back to instantiating local agent
    const profileApi = new ProfileApi();
    let [ profile ] = await profileApi.listProfiles();

    // create enc. keys

    if (!profile) {
      // TODO: add good samaritan nodes here when they're ready

      const defaultProfileDid = await this.did.create('ion');
      // setting id & name as the app's did to make migration easier
      profile = await profileApi.createProfile({
        name        : appDidState.id,
        did         : defaultProfileDid,
        connections : [appDidState.id],
      });
    }

    const agent = await Web5UserAgent.create({ profileManager: profileApi });
    const web5 = new Web5({ appStorage: appStorage, web5Agent: agent });

    return { web5, did: profile.did.id };
  }
}