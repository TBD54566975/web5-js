import type { Web5PlatformAgent } from './agent.js';
import type { KeyManager } from '../prototyping/crypto/types/key-manager.js';
export interface AgentKeyManager extends KeyManager {
  agent: Web5PlatformAgent;
}