import { v4 as uuidv4 } from 'uuid';

import { Web5Agent, VcResponse } from '@tbd54566975/web5-agent';
import { UnionMessageReply, RecordsWriteMessage } from '@tbd54566975/dwn-sdk-js';

import type { VerifiableCredential, CredentialSchemaType } from '@tbd54566975/credentials/';
import { getCurrentXmlSchema112Timestamp, isValidXmlSchema112Timestamp } from '@tbd54566975/credentials';

import { Record } from './record.js';

export type VcCreateRequest = {
  credentialSubject: any;
  kid?: string;
  credentialSchema?: CredentialSchemaType | CredentialSchemaType[];
  expirationDate?: string;
}

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

  async create(request: VcCreateRequest): Promise<VcCreateResponse> {
    if (!request.credentialSubject || typeof request.credentialSubject !== 'object') {
      throw new Error('credentialSubject not valid');
    }

    if (request?.expirationDate && !isValidXmlSchema112Timestamp(request?.expirationDate)) {
      throw new Error('expirationDate not valid');
    }

    const vc: VerifiableCredential = {
      id                : uuidv4(),
      '@context'        : ['https://www.w3.org/2018/credentials/v1'],
      credentialSubject : request.credentialSubject,
      type              : ['VerifiableCredential'],
      issuer            : this.#connectedDid ,
      issuanceDate      : getCurrentXmlSchema112Timestamp(),
      credentialSchema  : request?.credentialSchema,
      expirationDate    : request?.expirationDate,
    };

    const agentResponse: VcResponse  = await this.#web5Agent.processVcRequest({
      author : this.#connectedDid,
      target : this.#connectedDid,
      vc     : vc,
      kid    : request.kid
    });

    const { message, reply: { status } } = agentResponse;
    const responseMessage = message as RecordsWriteMessage;

    let record: Record;
    if (200 <= status.code && status.code <= 299) {
      const recordOptions = {
        author      : this.#connectedDid,
        encodedData : new Blob([agentResponse.vcJwt], { type: 'application/vc+jwt' }),
        target      : this.#connectedDid,
        ...responseMessage,
      };

      record = new Record(this.#web5Agent, recordOptions);
    }

    return { record: record, status: status, vcJwt: agentResponse.vcJwt };
  }
}