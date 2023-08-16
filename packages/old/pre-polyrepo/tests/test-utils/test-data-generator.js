import * as ion from '../../src/did/methods/ion.js';
import { Jws, RecordsWrite } from '@tbd54566975/dwn-sdk-js';

export class TestDataGenerator {

  static async generateDid() {
    return ion.create();
  }

  static generateJson(sizeBytes) {
    const itemCount = sizeBytes/1024;
    const items = [];

    for (let i = 0; i < itemCount; i++) {
      items.push({
        id: i + 1,
        name: `Item ${i + 1}`,
        description: `This is a description for item`.padEnd(936, ' '),
        value: 1000,
        tags: ['tag1', 'tag2', 'tag3'],
      });
    }
    items.push({ id: 123456789 });

    return { items };
  }

  /**
   * Generates a random alpha-numeric string.
   */
  static randomString(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    // pick characters randomly
    let randomString = '';
    for (let i = 0; i < length; i++) {
      randomString += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return randomString;
  };

  /**
   * Generates a random byte array of given length.
   */
  static randomBytes(length) {
    const randomBytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }

    return randomBytes;
  };
}
