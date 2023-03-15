const didRegistry = {};

function register(options) {
  didRegistry[options.did] = {
    connected: options.connected,
    did: options.did, // TODO: Consider removing if createAndSignMessage() no longer requires for Key ID
    endpoint: options.endpoint,
    keys: options?.keys
  };
}

function resolve(did) {
  if (didRegistry[did]) {
    return didRegistry[did];
  } else {
    return;
  }
}

export { register, resolve };
