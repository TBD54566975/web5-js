import type { Web5Agent } from '@web5/agent';

/**
 * The VC API is used to issue, present and verify VCs
 *
 * @beta
 */
export class VcApi {
  private agent: Web5Agent;
  private connectedDid: string;

  constructor(options: { agent: Web5Agent, connectedDid: string }) {
    this.agent = options.agent;
    this.connectedDid = options.connectedDid;
  }

  /**
   * Issues a VC to the subject did
   *
   * @param issuer The issuer URI of the credential, as a [String].
   * @param subject The subject URI of the credential, as a [String].
   * @param dataType The type of the credential, as a [String].
   * @param data The credential data, as a generic type [T].
   * @param expirationDate The expiration date.
   * @return A VerifiableCredential JWT.
   */
  async create(issuer: string, subject: string, dataType: string, data: any, expirationDate?: string): Promise<string> {
    const agentResponse = await this.agent.processVcRequest({
      issuer         : issuer,
      subject        : subject,
      dataType       : dataType,
      data           : data,
      expirationDate : expirationDate
    });

    const { vcJwt } = agentResponse;
    return vcJwt;
  }
}