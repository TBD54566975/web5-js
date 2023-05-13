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
  didMethodApis?: DidMethodApi[];
  didResolutionCache?: DidResolverCache;
}

type Web5Options = {
  web5Agent: Web5Agent;
  appStorage?: AppStorage;
  connectedDid: string;
};

export class Web5 {
  appStorage: AppStorage;
  dwn: DwnApi;
  #connectedDid: string;

  static did = new DidApi({
    didMethodApis: [new DidIonApi(), new DidKeyApi()]
  });

  get did() {
    return Web5.did;
  }

  private static APP_DID_KEY = 'WEB5_APP_DID';

  private constructor(options: Web5Options) {
    this.#connectedDid = options.connectedDid;
    this.dwn = new DwnApi(options.web5Agent, this.#connectedDid);
    this.appStorage ||= new AppStorage();
  }

  static async connect(_options: Web5ConnectOptions = {}) {
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

    const agent = await Web5UserAgent.create({ profileManager: profileApi, didResolver: Web5.did.resolver });
    const connectedDid = profile.did.id;

    const web5 = new Web5({ appStorage: appStorage, web5Agent: agent, connectedDid });

    return { web5, did: connectedDid };
  }
}