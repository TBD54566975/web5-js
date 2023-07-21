import { Web5Agent } from '@tbd54566975/web5-agent';
import type { VerifiableCredential } from '../../credentials/src/types.js';

import { getCurrentXmlSchema112Timestamp } from '../../credentials/src/utils.js';
import { v4 as uuidv4 } from 'uuid';
import { UnionMessageReply} from '@tbd54566975/dwn-sdk-js';

import { Record } from './record.js';

export type VcCreateResponse = {
  status: UnionMessageReply['status'];
  record?: Record
};

export class VcApi {
  #web5Agent: Web5Agent;
  #connectedDid: string;

  constructor(agent: Web5Agent, connectedDid: string) {
    this.#web5Agent = agent;
    this.#connectedDid = connectedDid;
  }

  // TODO: Add CreateOptions for more robust VC creation
  async create(credentialSubject: any): Promise<VcCreateResponse> {
    if (!credentialSubject || typeof credentialSubject !== 'object') {
      throw new Error('credentialSubject not valid');
    }

    const vc: VerifiableCredential = {
      id                : uuidv4(),
      '@context'        : ['https://www.w3.org/2018/credentials/v1'],
      credentialSubject : credentialSubject,
      type              : ['VerifiableCredential'],
      issuer            : { id: this.#connectedDid },
      issuanceDate      : getCurrentXmlSchema112Timestamp(),
    };

    const agentResponse: VcCreateResponse  = await this.#web5Agent.processVcRequest({
      author : this.#connectedDid,
      target : this.#connectedDid,
      vc     : vc
    });

    return agentResponse;
  }
}