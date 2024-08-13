import { utils as cryptoUtils } from '@web5/crypto';

export class TestDataGenerator {
  /**
   * Generates a random byte array of given length.
   */
  static randomBytes(length: number): Uint8Array {
    return cryptoUtils.randomBytes(length);
  }

  /**
   * Generate a random number of given length.
   */
  static randomDigits(length: number): number {
    let result = 0;
    for(let i = 0; i < length; i++) {
      result = result * 10 + Math.floor(Math.random() * 10);
    }
    return result;
  }

  /**
   * Generates a random JavaScript object of given length in bytes.
   */
  static randomJson(length: number): object {
    // Start with an empty object.
    let obj = {};

    // Generate properties until the JSON string is close to the desired length.
    let lessThanDesiredLength = true;
    while (lessThanDesiredLength) {
      // Use a random key and value to avoid any optimization that might occur
      // from using the same key and value repeatedly.
      let key = Math.random().toString(36).substring(2);
      let value = Math.random().toString(36).substring(2);

      // Calculate the size of the new property (including quotes and colon).
      let propertySize = key.length + value.length + 4;

      // If the new property fits within the desired size, add it to the object.
      const currentLength = JSON.stringify(obj).length;

      if (currentLength + propertySize <= length) {
        obj[key] = value;
      } else if (length - currentLength > 5) {
        const padLength = length - currentLength - 4;
        obj[0] = TestDataGenerator.randomDigits(padLength);
        lessThanDesiredLength = false;
      } else {
        lessThanDesiredLength = false;
      }
    }

    return obj;
  }

  /**
   * Generates a random alpha-numeric string of given length.
   */
  static randomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    // Select characters randomly.
    let randomChars: string[] = [];
    for (let i = 0; i < length; i++) {
      randomChars.push(charset.charAt(Math.floor(Math.random() * charset.length)));
    }

    return randomChars.join('');
  }
}