import type { VerifiableCredential, CredentialSubject, Issuer } from './types.js';
import { getCurrentTimestamp, isRFC3339Timestamp } from './utils.js';

export class VerifiableCredentialBuilder {
  verifiableCredential: VerifiableCredential;

  constructor(credentialSubject: CredentialSubject | CredentialSubject[], issuer: Issuer) {
    const contexts = ['https://www.w3.org/2018/credentials/v1'];
    const types: string[] = ['VerifiableCredential'];

    this.verifiableCredential = {
      '@context'        : contexts as ['https://www.w3.org/2018/credentials/v1', ...string[]],
      credentialSubject : credentialSubject,
      issuer            : issuer,
      type              : types,
      issuanceDate      : getCurrentTimestamp(),
    };
  }

  addContext(context: string[] | string): VerifiableCredentialBuilder  {
    if (!context || context === '' || context.length === 0) {
      throw new Error('context cannot be empty');
    }

    let contextArray = Array.isArray(context) ? context : [context];
    this.verifiableCredential['@context'] = [
      ...new Set([...this.verifiableCredential['@context'], ...contextArray])
    ] as ['https://www.w3.org/2018/credentials/v1', ...string[]];

    return this;
  }

  addType(type: string[] | string): VerifiableCredentialBuilder  {
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

  setID(id: string): VerifiableCredentialBuilder  {
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

  setIssuanceDate(issuanceDate: string): VerifiableCredentialBuilder  {
    if (!issuanceDate || issuanceDate === '') {
      throw new Error('issuanceDate cannot be empty');
    }

    if (isRFC3339Timestamp(issuanceDate) === false) {
      throw new Error('issuanceDate is not a valid RFC3339 timestamp');
    }

    this.verifiableCredential.issuanceDate = issuanceDate;
    return this;
  }

  setExpirationDate(expirationDate: string): VerifiableCredentialBuilder  {
    if (!expirationDate || expirationDate === '') {
      throw new Error('expirationDate cannot be empty');
    }

    if (isRFC3339Timestamp(expirationDate) === false) {
      throw new Error('expirationDate is not a valid RFC3339 timestamp');
    }

    this.verifiableCredential.expirationDate = expirationDate;
    return this;
  }


  build(): VerifiableCredential {
    return this.verifiableCredential;
  }
}