import type { KeyIdentifier } from '@web5/crypto';

import type { DidKeySet } from '../methods/did-method.js';

export interface DidIonKeySet extends DidKeySet {
  recoveryKeyUri?: KeyIdentifier;
  updateKeyUri?: KeyIdentifier;
}