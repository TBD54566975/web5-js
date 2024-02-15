import type { Web5ManagedAgent } from './types/agent.js';

export async function getDwnStoreAuthor({ agent, context, didUri }: {
  agent: Web5ManagedAgent;
  context?: string;
  didUri?: string;
}): Promise<string> {
  // If `context` is specified, DWN messages will be signed by this DID.
  if (context) return context;

  // If Agent has an agentDid, use it to sign DWN messages.
  if (agent.agentDid) return agent.agentDid.uri;

  // If `context`, `agent.agentDid`, and `didUri` are undefined, throw error.
  if (!didUri) {
    throw new Error(`DidStore: Failed to determine author: 'agent.agentDid', 'context', and 'didUri' are undefined`);
  }

  // If both `context` and `agent.agentDid` are undefined but `did` is given, assume the
  // Agent's KeyManager contains a private key for the given `did` and use it to sign DWN
  // messages.
  //
  // Note: The KeyManager is NOT checked for performance reasons. The KeyManager will throw an
  // error if the private key is not found, so we can avoid the extra lookup.
  return didUri;
}