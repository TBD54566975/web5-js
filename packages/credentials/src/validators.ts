import type {
  ICredentialContextType,
  ICredentialSubject
} from '@sphereon/ssi-types';

import { Validator as JsonSchemaValidator } from 'jsonschema';

import {
  CredentialSchema,
  DEFAULT_VC_CONTEXT,
  DEFAULT_VC_TYPE,
  VcDataModel,
  VerifiableCredential
} from './verifiable-credential.js';

import { isValidRFC3339Timestamp, isValidXmlSchema112Timestamp } from './utils.js';
import { DEFAULT_VP_TYPE } from './verifiable-presentation.js';

const jsonSchemaValidator = new JsonSchemaValidator();

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
    if (input.length < 1 || input.indexOf(DEFAULT_VC_CONTEXT) === -1) {
      throw new Error(`@context is missing default context "${DEFAULT_VC_CONTEXT}"`);
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
    if(!isValidXmlSchema112Timestamp(timestamp) && !isValidRFC3339Timestamp(timestamp)){
      throw new Error(`timestamp is not valid xml schema 112 timestamp`);
    }
  }

  static async validateCredentialSchema(vcDataModel: VcDataModel): Promise<void> {
    const credentialSchema = vcDataModel.credentialSchema as CredentialSchema | CredentialSchema[];

    if (!credentialSchema || (Array.isArray(credentialSchema) && credentialSchema.length === 0)) {
      throw new Error('Credential schema is missing or empty');
    }

    const schemaId = Array.isArray(credentialSchema) ? credentialSchema[0].id : credentialSchema.id;

    let jsonSchema;
    try {
      const response = await fetch(schemaId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      jsonSchema = await response.json();
    } catch (error: any) {
      throw new Error(`Failed to fetch schema from ${schemaId}: ${error.message}`);
    }

    const validationResult = jsonSchemaValidator.validate(vcDataModel, jsonSchema);

    if (!validationResult.valid) {
      throw new Error(`Schema Validation Errors: ${JSON.stringify(validationResult.errors)}`);
    }
  }

  static asArray(arg: any | any[]): any[] {
    return Array.isArray(arg) ? arg : [arg];
  }
}