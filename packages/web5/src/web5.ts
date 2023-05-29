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
import { LevelType } from '@tbd54566975/storage';

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

  static did: DidApi | null = null;

  static initializeDid(store: LevelType) {
    this.did = new DidApi({
      didMethodApis : [new DidIonApi(), new DidKeyApi()],
      cache         : new DidResolutionCache(undefined, store),
    });
  }

  get did() {
    if (!Web5.did) {
      throw new Error('DidApi not initialized. Call Web5.initializeDid() first.');
    }
    return Web5.did;
  }

  private static APP_DID_KEY = 'WEB5_APP_DID';


  private constructor(options: Web5Options, levelStorage?: { appStorage: LevelType }) {
    this.#connectedDid = options.connectedDid;
    this.dwn = new DwnApi(options.web5Agent, this.#connectedDid);
    this.appStorage ||= new AppStorage(undefined, levelStorage.appStorage);
  }

  static async connect(options: Web5ConnectOptions = {}, levelStorage?: { appStorage: LevelType, profileApi: { profileStore: LevelType, profileIndex: LevelType }, did: LevelType, syncApi: LevelType }) {
    // load app's did
    const appStorage = new AppStorage(undefined, levelStorage.appStorage);
    const cachedAppDidState = await appStorage.get(Web5.APP_DID_KEY);
    let appDidState: DidState;

    Web5.initializeDid(levelStorage.did);

    if (cachedAppDidState) {
      appDidState = JSON.parse(cachedAppDidState);
    } else {
      appDidState = await this.did.create('key');
      appStorage.set(Web5.APP_DID_KEY, JSON.stringify(appDidState));
    }

    // TODO: sniff to see if remote agent is available
    // TODO: if available,connect to remote agent using Web5ProxyAgent

    // fall back to instantiating local agent
    const profileApi = new ProfileApi(undefined, levelStorage.profileApi);
    let [ profile ] = await profileApi.listProfiles();

    const dwn = await Dwn.create();
    const syncManager = new SyncApi({
      profileManager : profileApi,
      didResolver    : Web5.did.resolver,
      dwn            : dwn
    }, levelStorage.syncApi);

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
    const web5 = new Web5({ appStorage: appStorage, web5Agent: agent, connectedDid }, {appStorage: levelStorage.appStorage});

    Web5.#enqueueNextSync(syncManager, 1_000);

    return { web5, did: connectedDid };
  }

  /**
   * Dynamically selects up to 2 DWN endpoints that are provided
   * by default during the Tech Preview period.
   */
  static async getTechPreviewDwnEndpoints(): Promise<string[]> {
    let response: Response;
    try {
      response = await fetch('https://dwn.tbddev.org/.well-known/did.json');
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
    } catch(e) {
      console.warn('failed to get tech preview dwn endpoints:', e.message);
      return [];
    }

    const didDoc = await response.json();
    const [ service ] = didUtils.getServices(didDoc, { id: '#dwn', type: 'DecentralizedWebNode' });
    const { nodes } = <DwnServiceEndpoint>service.serviceEndpoint;

    // allocate up to 2 nodes for a user.
    const dwnUrls = new Set<string>();
    const numNodesToAllocate = Math.min(nodes.length, 2);

    for (let attempts = 0; attempts < nodes.length && dwnUrls.size < numNodesToAllocate; attempts += 1) {
      const nodeIdx = getRandomInt(0, nodes.length);
      const dwnUrl = nodes[nodeIdx];

      try {
        const healthCheck = await fetch(`${dwnUrl}/health`);
        if (healthCheck.ok) {
          dwnUrls.add(dwnUrl);
        }
      } catch(e: unknown) {
        // Ignore healthcheck failures and try the next node.
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