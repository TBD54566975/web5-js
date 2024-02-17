import type { Web5ManagedAgent } from './types/agent.js';

/**
 * Separator used to join the tenant DID and the DID URI that is used to prefix all lookups in both
 * the DWN store index and in-memory store.
 */
export const TENANT_SEPARATOR = '^';

export async function getDwnStoreTenant({ agent, tenant, didUri }: {
  agent: Web5ManagedAgent;
  tenant?: string;
  didUri?: string;
}): Promise<string> {
  // If `tenant` is specified, DWN messages will be signed by this DID.
  if (tenant) return tenant;

  // If Agent has an agentDid, use it to sign DWN messages.
  if (agent.agentDid) return agent.agentDid.uri;

  // If `tenant`, `agent.agentDid`, and `didUri` are undefined, throw error.
  if (!didUri) {
    throw new Error(`DidStore: Failed to determine author: 'agent.agentDid', 'tenant', and 'didUri' are undefined`);
  }

  // If both `tenant` and `agent.agentDid` are undefined but `did` is given, assume the
  // Agent's KeyManager contains a private key for the given `did` and use it to sign DWN
  // messages.
  //
  // Note: The KeyManager is NOT checked for performance reasons. The KeyManager will throw an
  // error if the private key is not found, so we can avoid the extra lookup.
  return didUri;
}