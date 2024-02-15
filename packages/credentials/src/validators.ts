import type {
  ICredentialContextType,
  ICredentialSubject
} from '@sphereon/ssi-types';

import {
  DEFAULT_CONTEXT,
  DEFAULT_VC_TYPE,
  VerifiableCredential
} from './verifiable-credential.js';

import { isValidXmlSchema112Timestamp } from './utils.js';
import { DEFAULT_VP_TYPE } from './verifiable-presentation.js';

export class SsiValidator {
  static validateCredentialPayload(vc: VerifiableCredential): void {
    this.validateContext(vc.vcDataModel['@context']);
    this.validateVcType(vc.type);
    this.validateCredentialSubject(vc.vcDataModel.credentialSubject);
    if (vc.vcDataModel.issuanceDate) this.validateTimestamp(vc.vcDataModel.issuanceDate);
    if (vc.vcDataModel.expirationDate) this.validateTimestamp(vc.vcDataModel.expirationDate);
  }

  static validateContext(value: ICredentialContextType | ICredentialContextType[]): void {
    const input = this.asArray(value);
    if (input.length < 1 || input.indexOf(DEFAULT_CONTEXT) === -1) {
      throw new Error(`@context is missing default context "${DEFAULT_CONTEXT}"`);
    }
  }

  static validateVcType(value: string | string[]): void {
    const input = this.asArray(value);
    if (input.length < 1 || input.indexOf(DEFAULT_VC_TYPE) === -1) {
      throw new Error(`type is missing default "${DEFAULT_VC_TYPE}"`);
    }
  }

  static validateVpType(value: string | string[]): void {
    const input = this.asArray(value);
    if (input.length < 1 || input.indexOf(DEFAULT_VP_TYPE) === -1) {
      throw new Error(`type is missing default "${DEFAULT_VP_TYPE}"`);
    }
  }

  static validateCredentialSubject(value: ICredentialSubject | ICredentialSubject[]): void {
    if (Object.keys(value).length === 0) {
      throw new Error(`credentialSubject must not be empty`);
    }
  }

  static validateTimestamp(timestamp: string) {
    if(!isValidXmlSchema112Timestamp(timestamp)){
      throw new Error(`timestamp is not valid xml schema 112 timestamp`);
    }
  }

  static asArray(arg: any | any[]): any[] {
    return Array.isArray(arg) ? arg : [arg];
  }
}