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

export type TechPreviewOptions = {
  dwnEndpoints?: string[];
}

// TODO: discuss what other options we want
export type Web5ConnectOptions = {
  web5Agent?: Web5Agent;
  didMethodApis?: DidMethodApi[];
  didResolutionCache?: DidResolverCache;
  techPreview?: TechPreviewOptions;
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

  static async connect(options: Web5ConnectOptions = {}) {
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
      const dwnUrls = options.techPreview?.dwnEndpoints || await Web5.getTechPreviewDwnEndpoints();
      const ionCreateOptions = await DidIonApi.generateDwnConfiguration(dwnUrls);
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
   * Dynamically selects up to 2 DWN endpoints that are provided
   * by default during the Tech Preview period.
   */
  static async getTechPreviewDwnEndpoints(): Promise<string[]> {
    const response = await fetch('https://dwn.tbddev.org/.well-known/did.json');

    // Return an empty array if dwn.tbddev.org is not responding.
    if (!response.ok) { return []; }

    const didDoc = await response.json();
    const [ service ] = didUtils.getServices(didDoc, { id: '#dwn', type: 'DecentralizedWebNode' });
    const { nodes } = <DwnServiceEndpoint>service.serviceEndpoint;

    // allocate up to 2 nodes for a user.
    const dwnUrls = new Set<string>();
    let attempts = 0;
    const numNodesToAllocate = Math.min(nodes.length, 2);

    while(dwnUrls.size < numNodesToAllocate && attempts < nodes.length) {
      const nodeIdx = getRandomInt(0, nodes.length);
      const dwnUrl = nodes[nodeIdx];

      try {
        const healthCheck = await fetch(`${dwnUrl}/health`);
        if (healthCheck.status === 200) {
          dwnUrls.add(dwnUrl);
        }
      } catch(e: unknown) {
        // Ignore healthcheck failures and try the next node.
      }

      attempts++;
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