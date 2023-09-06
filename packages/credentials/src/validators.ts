import type {
  VerifiableCredentialTypeV1,
  CredentialSubject,
  CredentialContextType,
} from './types.js';

import {
  DEFAULT_CONTEXT,
  DEFAULT_VC_TYPE,
  DEFAULT_VP_TYPE,
} from './types.js';

import { isValidXmlSchema112Timestamp } from './utils.js';

export class SsiValidator {
  static validateCredentialPayload(vc: VerifiableCredentialTypeV1): void {
    this.validateContext(vc['@context']);
    this.validateVcType(vc.type);
    this.validateCredentialSubject(vc.credentialSubject);
    if (vc.issuanceDate) this.validateTimestamp(vc.issuanceDate);
    if (vc.expirationDate) this.validateTimestamp(vc.expirationDate);
  }

  static validateContext(value: CredentialContextType | CredentialContextType[]): void {
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

  static validateCredentialSubject(value: CredentialSubject | CredentialSubject[]): void {
    if (Object.keys(value).length === 0) {
      throw new Error(`credentialSubject must not be empty`);
    }
  }

  static validateTimestamp(timestamp: string) {
    if(!isValidXmlSchema112Timestamp(timestamp)){
      throw new Error(`timestamp is not valid xml schema 112 timestamp`);
    }
  }

  static validateVpType(value: string | string[]): void {
    const input = this.asArray(value);
    if (input.length < 1 || input.indexOf(DEFAULT_VP_TYPE) === -1) {
      throw new TypeError(`type is missing default "${DEFAULT_VP_TYPE}"`);
    }
  }

  static asArray(arg: any | any[]): any[] {
    return Array.isArray(arg) ? arg : [arg];
  }
}
