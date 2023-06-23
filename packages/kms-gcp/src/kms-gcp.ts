// import type { GenerateKeyOptions, GenerateKeyOptionTypes, KeyManagementSystem, GenerateKeyType } from '../../types-key-manager.js';

// import { KeyManagementServiceClient } from '@google-cloud/kms';

// export type GcpKmsOptions = {
//   projectId: string;
//   locationId: string;
//   keyRingId: string;
// }

// export class GcpKms implements KeyManagementSystem {
//   #client: KeyManagementServiceClient;
//   #keyRingName: string;

//   constructor(options: GcpKmsOptions) {
//     const { projectId, locationId, keyRingId } = options;
//     this.#client = new KeyManagementServiceClient();
//     this.#keyRingName = this.#client.keyRingPath(projectId, locationId, keyRingId);
//   }

//   async generateKey<T extends GenerateKeyOptionTypes>(_options: GenerateKeyOptions<T>): Promise<GenerateKeyType<T>> {
//     return null as any;
//   }
// }