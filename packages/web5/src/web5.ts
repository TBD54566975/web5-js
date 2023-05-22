import type { Web5Agent } from '@tbd54566975/web5-agent';
import type { SyncManager } from '@tbd54566975/web5-user-agent';
import type { DidState, DidMethodApi, DidResolverCache, DwnServiceEndpoint } from '@tbd54566975/dids';

// import  { Web5ProxyAgent } from '@tbd54566975/web5-proxy-agent';
import { Dwn } from '@tbd54566975/dwn-sdk-js';
import { Web5UserAgent, ProfileApi, SyncApi } from '@tbd54566975/web5-user-agent';
import { DidIonApi, DidKeyApi, utils as didUtils } from '@tbd54566975/dids';

import { DwnApi } from './dwn-api.js';
import { DidApi } from './did-api.js';
import { AppStorage } from './app-storage.js';
import { getRandomInt } from './utils.js';
import { DidResolutionCache } from './did-resolution-cache.js';

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
    didMethodApis : [new DidIonApi(), new DidKeyApi()],
    cache         : new DidResolutionCache()
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

    const dwn = await Dwn.create();
    const syncManager = new SyncApi({
      profileManager : profileApi,
      didResolver    : Web5.did.resolver,
      dwn            : dwn
    });

    if (!profile) {
      const dwnUrls = await Web5.getDwnHosts();
      let ionCreateOptions;

      if (dwnUrls.length > 0) {
        ionCreateOptions = await DidIonApi.generateDwnConfiguration(dwnUrls);
      }

      const defaultProfileDid = await this.did.create('ion', ionCreateOptions);
      // setting id & name as the app's did to make migration easier
      profile = await profileApi.createProfile({
        name        : appDidState.id,
        did         : defaultProfileDid,
        connections : [appDidState.id],
      });

      await syncManager.registerProfile(profile.did.id);
    }

    const agent = await Web5UserAgent.create({
      profileManager : profileApi,
      didResolver    : Web5.did.resolver,
      syncManager    : syncManager,
      dwn            : dwn,
    });

    const connectedDid = profile.did.id;
    const web5 = new Web5({ appStorage: appStorage, web5Agent: agent, connectedDid });

    Web5.#enqueueNextSync(syncManager, 1_000);

    return { web5, did: connectedDid };
  }

  /**
   * dynamically selects up to 4 dwn hosts
   */
  static async getDwnHosts() {
    const response = await fetch('https://dwn.tbddev.org/.well-known/did.json');

    const didDoc = await response.json();
    const [ service ] = didUtils.getServices(didDoc, { id: '#dwn', type: 'DecentralizedWebNode' });
    const { nodes } = <DwnServiceEndpoint>service.serviceEndpoint;

    // allocate up to 2 nodes for a user.
    const numNodesToAllocate = Math.min(Math.floor(nodes.length / 2), 2);
    const dwnUrls = new Set([]);

    for (let i = 0; i < numNodesToAllocate; i += 1) {
      const nodeIdx = getRandomInt(0, nodes.length);
      const dwnUrl = nodes[nodeIdx];

      try {
        const healthCheck = await fetch(`${dwnUrl}/health`);
        if (healthCheck.status === 200) {
          dwnUrls.add(dwnUrl);
        }
      } catch(e) {
        // ignore healthcheck failures and try the next node.
      }
    }

    return Array.from(dwnUrls);
  }

  static #enqueueNextSync(syncManager: SyncManager, delay = 1_000) {
    setTimeout(async () => {
      try {
        await syncManager.push();
        await syncManager.pull();

        return this.#enqueueNextSync(syncManager, delay);
      } catch(e) {
        console.error('Sync failed due to error: ', e);
      }
    }, delay);
  }
}