import type { Jwk } from './jwk.js';

export interface JoseHeaderParams {
  // Content Type
  cty?: string;
  // JWK Set URL
  jku?: string;
  // JSON Web Key
  jwk?: Jwk;
  // Key ID
  kid?: string;
  // Type
  typ?: string;
  // X.509 Certificate Chain
  x5c?: string[];
  // X.509 Certificate SHA-1 Thumbprint
  x5t?: string;
  // X.509 URL
  x5u?: string;
}