import * as DIDMethods from './methods';
import { memoryCache } from '../utils';
import { generateKeyPair } from '@decentralized-identity/ion-tools';

const localRegistry = memoryCache();

async function getMethodAPI(name) {
  name = name.split(':')[1] || name;
  let method = DIDMethods[name];
  if (!method) throw `Unsupported method: ${name}`;
  return method;
}

async function create(method, options) {
  const api = await getMethodAPI(method);
  return api.create(options);
}


// let cacheTimer;
// let cacheDuration = 1000 * 60 * 60;  // 1 hour default cache duration
// const resolverCache = {};

// function clearResolverCache() {
//   clearTimeout(cacheTimer);
//   const now = new Date().getTime();
//   for (let did in resolverCache) {
//     if (resolverCache[did].cachedAt + cacheDuration > now) {
//       delete resolverCache[did];
//     }
//   }
//   cacheTimer = setTimeout(clearResolverCache, cacheDuration);
// }

// clearResolverCache();

async function resolve(did, options = {}) {
  const registryEntry = await localRegistry.get(did);
  if (registryEntry) {
    return registryEntry;
  } else {
    const api = await getMethodAPI(did);
    try {
      const result = await api.resolve(did);
      // if (options.cache) {
      //   resolverCache[did] = {
      //     result,
      //     cachedAt: new Date().getTime()
      //   };
      // }
      return result;
    }
    catch (e) {
      return null;
    }
  }
}

async function getDidDocument(did, options = {}) {
  await resolve(did, options).then(response => response.didDocument).catch(_ => { return null; });
}

async function getKeys(did, options = {}) {
  let doc = await getDidDocument(did, options);
  return doc?.verificationMethods?.filter(method => {
    if (options.id && method.id !== options?.id) return false;
    return true;
  });
}

async function getEndpoints(did, options = {}) {
  let doc = await getDidDocument(did, options);
  return doc?.services?.filter(service => {
    if (options.id && service.id !== options?.id) return false;
    if (options.type && service.type !== options?.type) return false;
    return true;
  });
}

function register(options) {
  localRegistry.set(options.did, {
    connected: options.connected,
    did: options.did, // TODO: Consider removing if createAndSignMessage() no longer requires for Key ID
    endpoint: options.endpoint,
    keys: options?.keys
  });
}

export {
  create,
  resolve,
  getKeys,
  getEndpoints,
  getMethodAPI,
  generateKeyPair,
  register,
  // clearResolverCache
};
