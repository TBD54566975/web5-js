import type { DidState } from '@tbd54566975/dids';
import type { Web5Agent } from '@tbd54566975/web5-agent';

import  { Web5ProxyAgent } from '@tbd54566975/web5-proxy-agent';
import  { Web5UserAgent, ProfileApi } from '@tbd54566975/web5-user-agent';
import { DidResolver, DidIonApi, DidKeyApi } from '@tbd54566975/dids';

import { DwnApi } from './dwn-api.js';
import { DidApi } from './did-api.js';

// TODO: discuss what other options we want
export type Web5ConnectOptions = {
  web5Agent?: Web5Agent;
  // TODO: discuss whether this should be something that the user can provide. could also just ask for methodResolvers
  didResolver?: DidResolver;
}

export class Web5 {
  dwn: ReturnType<typeof DwnApi>;
  did: ReturnType<typeof DidApi>;

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
    const cachedAppDidState = localStorage.getItem('WEB5_APP_DID');
    const appDidState: DidState = cachedAppDidState ? <DidState>JSON.parse(cachedAppDidState) : DidKey.create();

    // TODO: sniff to see if remote agent is available
    // TODO: if available,connect to remote agent using Web5ProxyAgent
    // if not available, fall back to instantiating local agent

    const defaultProfileDid = await DidIon.create();
    const profileApi = new ProfileApi();

    // use app's did as id to make migration to desktop-agent easier
    const profile = await profileApi.getProfile(appDidState.id);

    if (!profile) {
      // setting id & name as the app's did to make migration easier
      await profileApi.createProfile({
        id          : appDidState.id,
        name        : appDidState.id,
        did         : defaultProfileDid as any, // TODO: need to figure out concrete return type for DidCreator
        connections : [appDidState.id],
      });
    }

    const agent = await Web5UserAgent.create({ profileManager: profileApi });
    const web5 = new Web5(agent);

    return { web5 };
  }
}