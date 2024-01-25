import type { KeyIdentifier } from '@web5/crypto';

import type { PortableDid } from '../methods/did-method.js';

export interface DidIonKeySet extends PortableDid {
  recoveryKeyUri?: KeyIdentifier;
  updateKeyUri?: KeyIdentifier;
}