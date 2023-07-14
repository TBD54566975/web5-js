import { Web5Agent } from '@tbd54566975/web5-agent';
import type { VerifiableCredential } from '../../credentials/src/types.js';

import { getCurrentXmlSchema112Timestamp } from '../../credentials/src/utils.js';
import { v4 as uuidv4 } from 'uuid';

import { DwnApi, RecordsWriteResponse } from './dwn-api.js';

export type VcCreateResponse = RecordsWriteResponse & {
  vc: VerifiableCredential;
  vcJwt: string;
};

export class VcApi {
  #web5Agent: Web5Agent;
  #connectedDid: string;
  #dwn: DwnApi;

  constructor(agent: Web5Agent, connectedDid: string, dwn: DwnApi) {
    this.#web5Agent = agent;
    this.#connectedDid = connectedDid;
    this.#dwn = dwn;
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

    const vcJwt = await this.#web5Agent.sign(vc);

    const { status, record } = await this.#dwn.records.write({
      data    : vcJwt,
      message : {
        dataFormat: 'application/vc+jwt'
      }
    });

    return { status, record, vc, vcJwt};
  }
}