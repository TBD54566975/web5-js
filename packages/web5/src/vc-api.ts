import { Web5Agent, VcResponse } from '@tbd54566975/web5-agent';
import type { VerifiableCredential } from '../../credentials/src/types.js';

import { getCurrentXmlSchema112Timestamp } from '../../credentials/src/utils.js';
import { v4 as uuidv4 } from 'uuid';
import { UnionMessageReply, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

import { Record } from './record.js';

export type VcCreateResponse = {
  status: UnionMessageReply['status'];
  record?: Record
  vcJwt?: string;
};

export class VcApi {
  #web5Agent: Web5Agent;
  #connectedDid: string;

  constructor(agent: Web5Agent, connectedDid: string) {
    this.#web5Agent = agent;
    this.#connectedDid = connectedDid;
  }

  // TODO: Add CreateOptions for more robust VC creation
  async create(credentialSubject: any, kid?: string): Promise<VcCreateResponse> {
    if (!credentialSubject || typeof credentialSubject !== 'object') {
      throw new Error('credentialSubject not valid');
    }

    const vc: VerifiableCredential = {
      id                : uuidv4(),
      '@context'        : ['https://www.w3.org/2018/credentials/v1'],
      credentialSubject : credentialSubject,
      type              : ['VerifiableCredential'],
      issuer            : this.#connectedDid ,
      issuanceDate      : getCurrentXmlSchema112Timestamp(),
    };

    const agentResponse: VcResponse  = await this.#web5Agent.processVcRequest({
      author : this.#connectedDid,
      target : this.#connectedDid,
      vc     : vc,
      kid    : kid
    });

    const { message, reply: { status } } = agentResponse;
    const responseMessage = message as RecordsWriteMessage;

    let record: Record;
    if (200 <= status.code && status.code <= 299) {
      const recordOptions = {
        author      : this.#connectedDid,
        encodedData : new Blob([agentResponse.vcJwt], { type: 'text/plain' }),
        target      : this.#connectedDid,
        ...responseMessage,
      };

      record = new Record(this.#web5Agent, recordOptions);
    }

    return { record: record, status: status, vcJwt: agentResponse.vcJwt };
  }
}