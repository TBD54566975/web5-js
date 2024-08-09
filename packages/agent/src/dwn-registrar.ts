import { Sha256, CryptoUtils } from '@web5/crypto';
import { concatenateUrl } from './utils.js';
import { Convert } from '@web5/common';

/**
 * A client for registering tenants with a DWN.
 */
export class DwnRegistrar {
  /**
   * Registers a new tenant with the given DWN.
   * NOTE: Assumes the user has already accepted the terms of service.
   * NOTE: Currently the DWN Server from `dwn-server` does not require user signature.
   * TODO: bring in types from `dwn-server`.
   */
  public static async registerTenant(dwnEndpoint: string, did: string): Promise<void> {

    const registrationEndpoint = concatenateUrl(dwnEndpoint, 'registration');
    const termsOfUseEndpoint = concatenateUrl(registrationEndpoint, 'terms-of-service');
    const proofOfWorkEndpoint = concatenateUrl(registrationEndpoint, 'proof-of-work');

    // fetch the terms-of-service
    const termsOfServiceGetResponse = await fetch(termsOfUseEndpoint, {
      method: 'GET',
    });

    if (termsOfServiceGetResponse.status !== 200) {
      const statusCode = termsOfServiceGetResponse.status;
      const statusText = termsOfServiceGetResponse.statusText;
      const errorText = await termsOfServiceGetResponse.text();
      throw new Error(`Failed fetching terms-of-service: ${statusCode} ${statusText}: ${errorText}`);
    }
    const termsOfServiceFetched = await termsOfServiceGetResponse.text();

    // fetch the proof-of-work challenge
    const proofOfWorkChallengeGetResponse = await fetch(proofOfWorkEndpoint, {
      method: 'GET',
    });
    const { challengeNonce, maximumAllowedHashValue} = await proofOfWorkChallengeGetResponse.json();

    // create registration data based on the hash of the terms-of-service and the DID
    const registrationData = {
      did,
      termsOfServiceHash: await DwnRegistrar.hashAsHexString(termsOfServiceFetched),
    };

    // compute the proof-of-work response nonce based on the the proof-of-work challenge and the registration data.
    const responseNonce = await DwnRegistrar.findQualifiedResponseNonce({
      challengeNonce,
      maximumAllowedHashValue,
      requestData: JSON.stringify(registrationData),
    });

    // send the registration request to the server
    const registrationRequest = {
      registrationData,
      proofOfWork: {
        challengeNonce,
        responseNonce,
      },
    };

    const registrationResponse = await fetch(registrationEndpoint, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify(registrationRequest),
    });

    if (registrationResponse.status !== 200) {
      const statusCode = registrationResponse.status;
      const statusText = registrationResponse.statusText;
      const errorText = await registrationResponse.text();
      throw new Error(`Registration failed: ${statusCode} ${statusText}: ${errorText}`);
    }
  }

  /**
   * Computes the SHA-256 hash of the given array of strings.
   */
  public static async hashAsHexString(input: string): Promise<string> {
    const hashAsBytes = await Sha256.digest({ data: Convert.string(input).toUint8Array()});
    const hashAsHex = Convert.uint8Array(hashAsBytes).toHex();
    return hashAsHex;
  }

  /**
   * Finds a response nonce that qualifies the difficulty requirement for the given proof-of-work challenge and request data.
   */
  public static async findQualifiedResponseNonce(input: {
    maximumAllowedHashValue: string;
    challengeNonce: string;
    requestData: string;
  }): Promise<string> {
    const startTime = Date.now();

    const { maximumAllowedHashValue, challengeNonce, requestData } = input;
    const maximumAllowedHashValueAsBigInt = BigInt(`0x${maximumAllowedHashValue}`);

    let iterations = 1;
    let responseNonce;
    let qualifiedSolutionNonceFound = false;
    do {
      responseNonce = await this.generateNonce();
      const computedHash = await DwnRegistrar.hashAsHexString(challengeNonce + responseNonce + requestData);
      const computedHashAsBigInt = BigInt(`0x${computedHash}`);

      qualifiedSolutionNonceFound = computedHashAsBigInt <= maximumAllowedHashValueAsBigInt;

      iterations++;
    } while (!qualifiedSolutionNonceFound);

    // Log final/successful iteration.
    console.log(
      `iterations: ${iterations}, time lapsed: ${Date.now() - startTime} ms`,
    );

    return responseNonce;
  }

  /**
   * Generates 32 random bytes expressed as a HEX string.
   */
  public static async generateNonce(): Promise<string> {
    const randomBytes = CryptoUtils.randomBytes(32);
    const hexString = Convert.uint8Array(randomBytes).toHex().toUpperCase();
    return hexString;
  }
}