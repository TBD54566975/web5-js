import { Web5Agent } from '@tbd54566975/web5-agent';
import type { VerifiableCredential } from '../../credentials/src/types.js';

import { getCurrentXmlSchema112Timestamp } from '../../credentials/src/utils.js';
import { v4 as uuidv4 } from 'uuid';
import { dataToBlob } from './utils.js';
import { Record } from './record.js';

import { DwnInterfaceName, DwnMethodName, RecordsWriteMessage, RecordsWriteOptions } from '@tbd54566975/dwn-sdk-js';
import { RecordsWriteResponse } from './dwn-api.js';

export type VcCreateResponse = RecordsWriteResponse & {
  vc: VerifiableCredential;
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

    // const jwtVc = await this._signVC(vc);

    const { record, status } = await this._writeRecord(vc);
    return { record, status, vc };
  }

  private async _writeRecord(vc: VerifiableCredential) {
    const messageOptions: Partial<RecordsWriteOptions> = { ...{ schema: 'vc/vc', dataFormat: 'application/json' } };

    const { dataBlob, dataFormat } = dataToBlob(vc, 'application/json');
    messageOptions.dataFormat = dataFormat;

    const agentResponse = await this.#web5Agent.processDwnRequest({
      author      : this.#connectedDid,
      dataStream  : dataBlob,
      messageOptions,
      messageType : DwnInterfaceName.Records + DwnMethodName.Write,
      store       : true,
      target      : this.#connectedDid
    });

    const { message, reply: { status } } = agentResponse;
    const responseMessage = message as RecordsWriteMessage;

    let record: Record;
    if (200 <= status.code && status.code <= 299) {
      const recordOptions = {
        author      : this.#connectedDid,
        encodedData : dataBlob,
        target      : this.#connectedDid,
        ...responseMessage,
      };

      record = new Record(this.#web5Agent, recordOptions);

      return { record, status };
    }
  }

  // TODO: This is a stub
  private async _signVC(vc: VerifiableCredential): Promise<string> {
    const vcStr = JSON.stringify(vc);
    const encoder = new TextEncoder();
    const uint8array = encoder.encode(vcStr);

    const keyManager = await this.#web5Agent.getKeyManager();

    // Need to generate keypair outside of this function?
    const keyPair = await keyManager.generateKey({
      algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
      extractable : false,
      keyUsages   : ['sign', 'verify']
    });

    const signature = await keyManager.sign({
      algorithm : { name: 'ECDSA', hash: 'SHA-256' },
      keyRef    : keyPair.privateKey.id,
      data      : uint8array,
    });

    const uint8Array = new Uint8Array(signature);
    const signatureString = new TextDecoder('utf-8').decode(uint8Array);

    return signatureString;
  }
}