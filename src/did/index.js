import * as DIDMethods from './methods';
import { memoryCache } from '../utils';
import { generateKeyPair } from '@decentralized-identity/ion-tools';

const localRegistry = memoryCache();

async function create(method, options) {
  const api = await getMethodAPI(method);
  return api.create(options);
}

function deregister(did) {
  localRegistry.del(did);
}

async function getDidDocument(did, options = {}) {
  await resolve(did, options).then(response => response.didDocument).catch(_ => { return null; });
}

async function getEndpoints(did, options = {}) {
  let doc = await getDidDocument(did, options);
  return doc?.services?.filter(service => {
    if (options.id && service.id !== options?.id) return false;
    if (options.type && service.type !== options?.type) return false;
    return true;
  });
}

async function getKeys(did, options = {}) {
  let doc = await getDidDocument(did, options);
  return doc?.verificationMethods?.filter(method => {
    if (options.id && method.id !== options?.id) return false;
    return true;
  });
}

async function getMethodAPI(name) {
  name = name.split(':')[1] || name;
  let method = DIDMethods[name];
  if (!method) throw `Unsupported method: ${name}`;
  return method;
}

function register(options) {
  localRegistry.set(options.did, {
    connected: options.connected,
    did: options.did, // TODO: Consider removing if createAndSignMessage() no longer requires for Key ID
    endpoint: options.endpoint,
    keys: options?.keys
  });
}

async function resolve(did, options = {}) {
  // Check local DID registry cache before attempting DID resolution.
  const registryEntry = localRegistry.get(did);
  if (registryEntry) {
    return registryEntry;
  } else {
    const api = await getMethodAPI(did);
    try {
      const result = await api.resolve(did);
      if (options.cache) {
        localRegistry.set(did, result);
      }
      return result;
    }
    catch (e) {
      return null;
    }
  }
}

export {
  create,
  deregister,
  generateKeyPair,
  getEndpoints,
  getKeys,
  getMethodAPI,
  register,
  resolve,
};
