// import type { CreateKeyResponse, KMSClientConfig } from '@aws-sdk/client-kms';
// import type { GenerateKeyOptions, GenerateKeyOptionTypes, KeyManagementSystem, GenerateKeyType, Web5Crypto } from '../../types-key-manager.js';

// import { KMSClient, CreateKeyCommand, CreateKeyCommandInput } from '@aws-sdk/client-kms';

// export type AwsKmsOptions = {
//   kmsClientOptions: KMSClientConfig;
// }

// export class AwsKms implements KeyManagementSystem {
//   #client: KMSClient;

//   constructor(options: AwsKmsOptions) {
//     this.#client = new KMSClient(options.kmsClientOptions);
//   }

//   async generateKey<T extends GenerateKeyOptionTypes>(options: GenerateKeyOptions<T>): Promise<GenerateKeyType<T>> {
//     const createKeyCommandInput = transformGenerateKeyOptions(options);
//     const command = new CreateKeyCommand(createKeyCommandInput);
//     const response = await this.#client.send(command) as CreateKeyResponse;

//     response.KeyMetadata;

//     return null as any;
//   }
// }

// export function transformGenerateKeyOptions<T extends GenerateKeyOptionTypes>(options: GenerateKeyOptions<T>): CreateKeyCommandInput {
//   const createKeyCommandInput: CreateKeyCommandInput = {
//     KeyUsage: getKeyUsage(options.algorithm, options.keyUsages),
//   };

//   return createKeyCommandInput;
// }

// export function getKeyUsage(algorithm: GenerateKeyOptionTypes, keyUsage: Web5Crypto.KeyUsage[]): CreateKeyCommandInput['KeyUsage'] {
//   if ((algorithm.name === 'HMAC') && keyUsage.includes('sign') && keyUsage.includes('verify')) {
//     return 'GENERATE_VERIFY_MAC';
//   } else if (keyUsage.includes('sign') && keyUsage.includes('verify')) {
//     return 'SIGN_VERIFY';
//   } else if (keyUsage.includes('encrypt') && keyUsage.includes('decrypt')) {
//     return 'ENCRYPT_DECRYPT';
//   }
// }
