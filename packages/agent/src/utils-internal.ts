import type { Jwk, KeyIdentifier, KmsExportKeyParams, KmsGetPublicKeyParams, KmsSignParams } from '@web5/crypto';

import { Ed25519, LocalKeyManager, computeJwkThumbprint } from '@web5/crypto';

import type { Web5PlatformAgent } from './types/agent.js';

/**
 * Internal utility functions used by the Web5 platform agent that are not intended for public use
 * and are not exported in the public API.
 */

/**
 * Separator used to join the tenant DID and the DID URI that is used to prefix all lookups in the
 * Agent data stores, including the DWN-backed store's index and the in-memory store's map.
 */
export const TENANT_SEPARATOR = '^';

export class DeterministicKeyGenerator extends LocalKeyManager {
  private _predefinedKeys: Map<KeyIdentifier, Jwk>;
  private _keyGenerator: IterableIterator<KeyIdentifier>;

  constructor() {
    super();
    this._predefinedKeys = new Map();
    this._keyGenerator = this._predefinedKeys.keys();
  }

  public async addPredefinedKeys({ privateKeys }: { privateKeys: Jwk[] }): Promise<void> {
    const predefinedKeys: { [keyUri: KeyIdentifier]: Jwk } = {};

    for (const key of privateKeys) {
      // If the key ID is undefined, set it to the JWK thumbprint.
      key.kid ??= await computeJwkThumbprint({ jwk: key });

      // Compute the key URI for the key.
      const keyUri = await this.getKeyUri({ key });

      // Store the key.
      predefinedKeys[keyUri] = key;
    }

    // Store the keys.
    this._predefinedKeys = new Map(Object.entries(predefinedKeys));

    // Reset the key generator to use the new keys.
    this._keyGenerator = this._predefinedKeys.keys();
  }

  public async exportKey({ keyUri }:
    KmsExportKeyParams
  ): Promise<Jwk> {
    // Get the private key from the key store.
    const privateKey = this._predefinedKeys.get(keyUri);

    // Throw an error if the key is not found.
    if (!privateKey) {
      throw new Error(`DeterministicKeyGenerator.exportKey: Key not found: ${keyUri}`);
    }

    return privateKey;
  }

  public async generateKey(_params: {
    algorithm: 'Ed25519' | 'secp256k1' | 'secp256r1'
  }): Promise<KeyIdentifier> {
    // Get the next key from the array of predefined keys.
    const { value: keyUri, done } = this._keyGenerator.next();

    // Throw an error if the generator is empty and there are no more keys to return.
    if (done) {
      throw new Error('Ran out of predefined keys');
    }

    return keyUri;
  }

  public async getPublicKey({ keyUri }:
      KmsGetPublicKeyParams
  ): Promise<Jwk> {
    // Get the private key from the key store.
    const privateKey = this._predefinedKeys.get(keyUri);

    // Throw an error if the key is not found.
    if (!privateKey) {
      throw new Error(`DeterministicKeyGenerator.getPublicKey: Key not found: ${keyUri}`);
    }

    // Get the public key properties from the private JWK.
    const { d, ...publicKey } = privateKey;

    return publicKey;
  }

  public async sign({ keyUri, data }:
    KmsSignParams
  ): Promise<Uint8Array> {
    // Get the private key from the key store.
    const privateKey = this._predefinedKeys.get(keyUri);

    // Throw an error if the key is not found.
    if (!privateKey) {
      throw new Error(`DeterministicKeyGenerator.sign: Key not found: ${keyUri}`);
    }

    // Sign the data.
    const signature = await Ed25519.sign({ data, key: privateKey });

    return signature;
  }
}

/**
 * Determines the tenant identifier (DID) for data store operations based on the provided
 * parameters.
 *
 * The function identifies the tenant using a priority order:
 * 1. directly provided tenant DID,
 * 2. the agent's DID,
 * 3. or a specified DID URI.
 *
 * This approach ensures operations are isolated by DID, supporting multi-tenancy.
 *
 * @param params - The parameters for determining the tenant.
 * @param params.agent - The Web5 platform agent instance.
 * @param [params.tenant] - An optional tenant DID. If provided, it takes precedence.
 * @param [params.didUri] - An optional DID URI to use if no tenant DID or agent DID is available.
 * @returns A promise that resolves to the tenant DID.
 * @throws Throws an error if it fails to determine the tenant from the provided inputs.
 */
export async function getDataStoreTenant({ agent, tenant, didUri }: {
  agent: Web5PlatformAgent;
  tenant?: string;
  didUri?: string;
}): Promise<string> {
  // Check if a tenant identifier (DID) is explicitly provided and return it immediately if so.
  // This is the highest priority to ensure explicit tenant isolation.
  if (tenant) return tenant;

  // If the agent's DID is available, return it as the tenant identifier.
  // This allows using the agent's own identity as a fallback tenant.
  if (agent.agentDid) return agent.agentDid.uri;

  // Throw an error if neither tenant, agent.agentDid, nor didUri are provided,
  // as it's not possible to determine the tenant identifier without any of these.
  if (!didUri) {
    throw new Error(`Failed to determine tenant DID: 'agent.agentDid', 'tenant', and 'didUri' are undefined`);
  }

  // Return the DID URI as the tenant identifier if both `tenant` and `agent.agentDid` are undefined
  // but a `didUri` is provided. This assumes the agent has the necessary permissions and keys
  // associated with the provided DID for data store operations.
  //
  // Note: This assumes the Agent's key manager has the private key for the given DID URI. No
  // explicit check is made here for performance reasons, relying on downstream processes to
  // validate access rights.
  return didUri;
}