import type { Web5Agent } from '@web5/agent';
// import type { SyncManager } from '@tbd54566975/web5-user-agent';
// import type { DidState, DidMethodApi, DidResolverCache, DwnServiceEndpoint } from '@tbd54566975/dids';
// import type { DidState } from '@tbd54566975/dids';

// import ms from 'ms';

// import  { Web5ProxyAgent } from '@tbd54566975/web5-proxy-agent';
// import { Dwn } from '@tbd54566975/dwn-sdk-js';
// import { Web5UserAgent, ProfileApi, SyncApi } from '@tbd54566975/web5-user-agent';
import { Web5UserAgent } from '@web5/user-agent';
// import { DidIonApi, DidKeyApi, utils as didUtils } from '@tbd54566975/dids';

import { VcApi } from './vc-api.js';
import { DwnApi } from './dwn-api.js';
import { DidApi } from './did-api.js';
// import { AppStorage } from './app-storage.js';
// import { getRandomInt } from './utils.js';
// import { DidResolutionCache } from './did-resolution-cache.js';

/**
 * overrides to defaults configured for technical preview phase
 */
// export type TechPreviewOptions = {
//   /** overrides default dwnEndpoints provided for technical preview. see `Web5.#enqueueNextSync` */
//   dwnEndpoints?: string[];
// }

/**
 * optional overrides that can be provided when calling {@link Web5.connect}
 */
export type Web5ConnectOptions = {
  /** a custom {@link Web5Agent}. Defaults to creating an embedded {@link Web5UserAgent} if one isnt provided */
  agent?: Web5Agent;
  /** additional {@link DidMethodApi}s that can be used to create and resolve DID methods. defaults to did:key and did:ion */
  // didMethodApis?: DidMethodApi[];
  /** custom cache used to store DidResolutionResults. defaults to a {@link DidResolutionCache} */
  // didResolutionCache?: DidResolverCache;
  /** overrides to defaults configured for technical preview phase. See {@link TechPreviewOptions} */
  // techPreview?: TechPreviewOptions;
}

/**
 * @see {@link Web5ConnectOptions}
 */
type Web5Options = {
  agent: Web5Agent;
  // appStorage?: AppStorage;
  connectedDid: string;
};

export class Web5 {
  // appStorage: AppStorage;
  did: DidApi;
  dwn: DwnApi;
  vc: VcApi;
  private connectedDid: string;

  // private static APP_DID_KEY = 'WEB5_APP_DID';

  constructor(options: Web5Options) {
    const { agent, connectedDid } = options;
    this.connectedDid = connectedDid;
    this.did = new DidApi({ agent, connectedDid });
    this.dwn = new DwnApi({ agent, connectedDid });
    this.vc = new VcApi({ agent, connectedDid });
    // this.appStorage ||= new AppStorage();
  }

  /**
   * Connects to a {@link Web5Agent}. defaults to creating an embedded {@link Web5UserAgent} if one isn't provided
   * @param options - optional overrides
   * @returns
   */
  static async connect(options: Web5ConnectOptions = {}) {
    let { agent } = options;

    // load app's did
    // const appStorage = new AppStorage();
    // const cachedAppDidState = await appStorage.get(Web5.APP_DID_KEY);
    // let appDidState: DidState;

    // if (cachedAppDidState) {
    //   appDidState = JSON.parse(cachedAppDidState);
    // } else {
    //   appDidState = await this.did.create('key');
    //   appStorage.set(Web5.APP_DID_KEY, JSON.stringify(appDidState));
    // }

    // // TODO: sniff to see if remote agent is available
    // // TODO: if available,connect to remote agent using Web5ProxyAgent

    // // fall back to instantiating local agent
    // const profileApi = new ProfileApi();
    // let [ profile ] = await profileApi.listProfiles();

    // options.didMethodApis ??= [];

    // // override default cache used by `Web5.did`
    // Web5.did = new DidApi({
    //   didMethodApis : [new DidIonApi(), new DidKeyApi(), ...options.didMethodApis],
    //   cache         : options.didResolutionCache || new DidResolutionCache()
    // });

    // const dwn = await Dwn.create();
    // const syncManager = new SyncApi({
    //   profileManager : profileApi,
    //   didResolver    : Web5.did.resolver, // share the same resolver to share the same underlying cache
    //   dwn            : dwn
    // });

    // if (!profile) {
    //   const dwnUrls = options.techPreview?.dwnEndpoints || await Web5.getTechPreviewDwnEndpoints();
    //   const ionCreateOptions = await DidIonApi.generateDwnConfiguration(dwnUrls);
    //   const defaultProfileDid = await this.did.create('ion', ionCreateOptions);

    //   // setting id & name as the app's did to make migration easier
    //   profile = await profileApi.createProfile({
    //     name        : appDidState.id,
    //     did         : defaultProfileDid,
    //     connections : [appDidState.id],
    //   });

    //   await syncManager.registerProfile(profile.did.id);
    // }

    // const agent = await Web5UserAgent.create({
    //   profileManager : profileApi,
    //   didResolver    : Web5.did.resolver, // share the same resolver to share the same underlying cache
    //   syncManager    : syncManager,
    //   dwn            : dwn,
    // });

    // const connectedDid = profile.did.id;
    // const web5 = new Web5({ appStorage: appStorage, agent: agent, connectedDid });

    // Web5.#enqueueNextSync(syncManager, ms('2m'));

    if (agent === undefined) {
      agent = await Web5UserAgent.create();
    }


    const web5 = new Web5({ agent, connectedDid: 'did:key:123' });

    return { web5, did: 'did:key:123' };
  }

  // static #enqueueNextSync(syncManager: SyncManager, delay = 1_000) {
  //   setTimeout(async () => {
  //     try {
  //       await syncManager.push();
  //       await syncManager.pull();

  //       return this.#enqueueNextSync(syncManager, delay);
  //     } catch(e) {
  //       console.error('Sync failed due to error: ', e);
  //     }
  //   }, delay);
  // }
}