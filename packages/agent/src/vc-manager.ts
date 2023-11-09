import { Jose } from '@web5/crypto';
import { utils as didUtils } from '@web5/dids';
import { VerifiableCredential } from '@web5/credentials';
import { Signer } from '@tbd54566975/dwn-sdk-js';
import { isManagedKeyPair } from './utils.js';

import type { VcResponse, ProcessVcRequest, Web5ManagedAgent } from './types/agent.js';

export type VcManagerOptions = { agent?: Web5ManagedAgent; }

export class VcManager {
  /**
   * Holds the instance of a `Web5ManagedAgent` that represents the current
   * execution context for the `KeyManager`. This agent is utilized
   * to interact with other Web5 agent components. It's vital
   * to ensure this instance is set to correctly contextualize
   * operations within the broader Web5 agent framework.
   */
  private _agent?: Web5ManagedAgent;

  constructor(options: VcManagerOptions) {
    const { agent } = options;
    this._agent = agent;
  }

  /**
   * Retrieves the `Web5ManagedAgent` execution context.
   * If the `agent` instance proprety is undefined, it will throw an error.
   *
   * @returns The `Web5ManagedAgent` instance that represents the current execution
   * context.
   *
   * @throws Will throw an error if the `agent` instance property is undefined.
   */
  get agent(): Web5ManagedAgent {
    if (this._agent === undefined) {
      throw new Error('VcManager: Unable to determine agent execution context.');
    }

    return this._agent;
  }

  set agent(agent: Web5ManagedAgent) {
    this._agent = agent;
  }

  /**
   * Processes a request to create and sign a verifiable credential.
   * The process involves creating a VC object with the provided data, constructing a signer,
   * and signing the VC with the signer's sign function. The resultant VC is a JWT (JSON Web Token).
   */
  async processRequest(request: ProcessVcRequest): Promise<VcResponse> {
    const { dataType, issuer, subject, data } = request;
    const vc = VerifiableCredential.create(dataType, issuer, subject, data);

    const vcSigner = await this.constructVcSigner(issuer);
    const vcSignOptions = {
      issuerDid  : issuer,
      subjectDid : subject,
      kid        : issuer + '#' + issuer.split(':')[2],
      signer     : vcSigner.sign
    };

    const vcJwt = await vc.sign(vcSignOptions);
    return {vcJwt: vcJwt};
  }

  private async constructVcSigner(author: string): Promise<Signer> {
    // const signingKeyId = await this.getAuthorSigningKeyId({ did: author });
    const signingKeyId = await this.agent.didManager.getDefaultSigningKey({ did: author });

    if (!signingKeyId) {
      throw new Error (`VcManager: Unable to determine signing key id for author: '${author}'`);
    }

    /**
     * DID keys stored in KeyManager use the canonicalId as an alias, so
     * normalize the signing key ID before attempting to retrieve the key.
     */
    const parsedDid = didUtils.parseDid({ didUrl: signingKeyId });
    if (!parsedDid) {
      throw new Error(`DidIonMethod: Unable to parse DID: ${signingKeyId}`);
    }

    const normalizedDid = parsedDid.did.split(':', 3).join(':');
    const normalizedSigningKeyId = `${normalizedDid}#${parsedDid.fragment}`;
    const signingKey = await this.agent.keyManager.getKey({ keyRef: normalizedSigningKeyId });

    if (!isManagedKeyPair(signingKey)) {
      throw new Error(`VcManager: Signing key not found for author: '${author}'`);
    }

    const { alg } = Jose.webCryptoToJose(signingKey.privateKey.algorithm);
    if (alg === undefined) {
      throw Error(`No algorithm provided to sign with key ID ${signingKeyId}`);
    }

    return {
      keyId     : signingKeyId,
      algorithm : alg,
      sign      : async (content: Uint8Array): Promise<Uint8Array> => {
        return await this.agent.keyManager.sign({
          algorithm : signingKey.privateKey.algorithm,
          data      : content,
          keyRef    : normalizedSigningKeyId
        });
      }
    };
  }
}