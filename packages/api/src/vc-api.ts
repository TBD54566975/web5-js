import type { Web5ManagedAgent } from '@web5/agent';

import { VerifiableCredential, VerifiableCredentialTypeV1 } from '@web5/credentials';

export class VcApi {
  private agent: Web5ManagedAgent;
  private connectedDid: string;

  constructor(options: { agent: Web5ManagedAgent, connectedDid: string }) {
    this.agent = options.agent;
    this.connectedDid = options.connectedDid;
  }

  getKeyId(did: string): string {
    const secondColonIndex = did.indexOf(':', 4); // start search for : from the method portion
    const methodSpecificId = did.substring(secondColonIndex + 1);
    const keyId = `${did}#${methodSpecificId}`;
    return keyId;
  }

  getSigner(keyId: string) {
    const km = this.agent.keyManager;

    return async function (data: Uint8Array): Promise<Uint8Array> {
      const key = await km.getKey({ keyRef: keyId });
      // @ts-ignore
      const algorithm = key.algorithm || key.publicKey.algorithm;
      const signature = await km.sign({ data, keyRef: keyId, algorithm });
      return signature;
    };

  }

  async create({ verifiableCredential, subjectDid }: { verifiableCredential: VerifiableCredentialTypeV1, subjectDid: string }) {
    const keyId = this.getKeyId(this.connectedDid);

    const verifiableCredentialJWT = await VerifiableCredential.create({
      kid       : keyId,
      issuerDid : this.connectedDid,
      subjectDid,
      signer    : this.getSigner(keyId)
    }, undefined, verifiableCredential);

    return verifiableCredentialJWT;
  }
}