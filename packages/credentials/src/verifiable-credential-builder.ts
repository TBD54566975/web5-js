import type { VerifiableCredential, CredentialSubject, Issuer } from './types.js';
import { getCurrentXmlSchema112Timestamp, isXmlSchema112Timestamp } from './utils.js';

export class VerifiableCredentialBuilder {
  verifiableCredential: VerifiableCredential;

  constructor(credentialSubject: CredentialSubject | CredentialSubject[], issuer: Issuer) {
    const context = ['https://www.w3.org/2018/credentials/v1'];
    const types: string[] = ['VerifiableCredential'];

    this.verifiableCredential = {
      '@context'        : context,
      credentialSubject : credentialSubject,
      issuer            : issuer,
      type              : types,
      issuanceDate      : getCurrentXmlSchema112Timestamp(),
    };
  }

  addContext(context: string | string[]): VerifiableCredentialBuilder  {
    if (!context || context === '' || context.length === 0) {
      throw new Error('context cannot be empty');
    }

    let contextArray = Array.isArray(context) ? context : [context];
    let combined = [...this.verifiableCredential['@context'], ...contextArray];

    this.verifiableCredential['@context'] = combined;

    return this;
  }

  addType(type: string | string[]): VerifiableCredentialBuilder  {
    if (!type || type === '' || type.length === 0) {
      throw new Error('type cannot be empty');
    }

    let typeArray = Array.isArray(type) ? type : [type];

    if (!Array.isArray(this.verifiableCredential.type)) {
      this.verifiableCredential.type = [this.verifiableCredential.type] as string[];
    }

    this.verifiableCredential.type = [...new Set([...this.verifiableCredential.type, ...typeArray])];
    return this;
  }

  setId(id: string): VerifiableCredentialBuilder  {
    if (!id || id === '') {
      throw new Error('id cannot be empty');

    }
    this.verifiableCredential.id = id;
    return this;
  }

  setIssuer(issuer: Issuer): VerifiableCredentialBuilder  {
    if (!issuer || Object.keys(issuer).length === 0) {
      throw new Error('issuer must be a non-empty object');
    }

    this.verifiableCredential.issuer = issuer;
    return this;
  }

  setIssuanceDate(issuanceDate: string | Date): VerifiableCredentialBuilder  {
    if (!issuanceDate || issuanceDate === '') {
      throw new Error('issuanceDate cannot be empty');
    }

    if (typeof issuanceDate === 'object' && issuanceDate instanceof Date) {
      issuanceDate = issuanceDate.toISOString().replace(/\.\d+Z$/, 'Z');
    }

    if (isXmlSchema112Timestamp(issuanceDate) === false) {
      throw new Error('issuanceDate is not a valid XMLSCHEMA11-2 timestamp');
    }

    this.verifiableCredential.issuanceDate = issuanceDate;
    return this;
  }

  setExpirationDate(expirationDate: string | Date): VerifiableCredentialBuilder  {
    if (!expirationDate || expirationDate === '') {
      throw new Error('expirationDate cannot be empty');
    }

    if (typeof expirationDate === 'object' && expirationDate instanceof Date) {
      expirationDate = expirationDate.toISOString().replace(/\.\d+Z$/, 'Z');
    }

    if (isXmlSchema112Timestamp(expirationDate) === false) {
      throw new Error('expirationDate is not a valid XMLSCHEMA11-2 timestamp');
    }

    this.verifiableCredential.expirationDate = expirationDate;
    return this;
  }


  build(): VerifiableCredential {
    return this.verifiableCredential;
  }
}