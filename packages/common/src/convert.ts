import type { Multibase } from 'multiformats';

import { base58btc } from 'multiformats/bases/base58';
import { base64url } from 'multiformats/bases/base64';

import { isArrayBufferSlice, universalTypeOf } from './type-utils.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export class Convert {
  data: any;
  format: string;

  constructor(data: any, format: string) {
    this.data = data;
    this.format = format;
  }

  static arrayBuffer(data: ArrayBuffer): Convert {
    return new Convert(data, 'ArrayBuffer');
  }

  static base58Btc(data: string): Convert {
    return new Convert(data, 'Base58Btc');
  }

  static base64Url(data: string): Convert {
    return new Convert(data, 'Base64Url');
  }

  /**
   * Reference:
   * The BufferSource type is a TypeScript type that represents an ArrayBuffer
   * or one of the ArrayBufferView types, such a TypedArray (e.g., Uint8Array)
   * or a DataView.
   */
  static bufferSource(data: BufferSource): Convert {
    return new Convert(data, 'BufferSource');
  }

  static hex(data: string): Convert {
    if (typeof data !== 'string') {
      throw new TypeError('Hex input must be a string.');
    }
    if (data.length % 2 !== 0) {
      throw new TypeError('Hex input must have an even number of characters.');
    }
    return new Convert(data, 'Hex');
  }

  static multibase(data: string): Convert {
    return new Convert(data, 'Multibase');
  }

  static object(data: Record<string, any>): Convert {
    return new Convert(data, 'Object');
  }

  static string(data: string): Convert {
    return new Convert(data, 'String');
  }

  static uint8Array(data: Uint8Array): Convert {
    return new Convert(data, 'Uint8Array');
  }

  toArrayBuffer(): ArrayBuffer {
    switch (this.format) {

      case 'Base58Btc': {
        return base58btc.baseDecode(this.data).buffer;
      }

      case 'Base64Url': {
        return base64url.baseDecode(this.data).buffer;
      }

      case 'BufferSource': {
        const dataType = universalTypeOf(this.data);
        if (dataType === 'ArrayBuffer') {
          // Data is already an ArrayBuffer, No conversion is necessary.
          return this.data;
        } else if (ArrayBuffer.isView(this.data)) {
          // Data is a DataView or a different TypedArray (e.g., Uint16Array).
          if (isArrayBufferSlice(this.data)) {
            // Data is a slice of an ArrayBuffer. Return a new ArrayBuffer or ArrayBufferView of the same slice.
            return this.data.buffer.slice(this.data.byteOffset, this.data.byteOffset + this.data.byteLength);
          } else {
            // Data is a whole ArrayBuffer viewed as a different TypedArray or DataView. Return the whole ArrayBuffer.
            return this.data.buffer;
          }
        } else {
          throw new TypeError(`${this.format} value is not of type: ArrayBuffer, DataView, or TypedArray.`);
        }
      }

      case 'Hex': {
        return this.toUint8Array().buffer;
      }

      case 'String': {
        return this.toUint8Array().buffer;
      }

      case 'Uint8Array': {
        return this.data.buffer;
      }

      default:
        throw new TypeError(`Conversion from ${this.format} to ArrayBuffer is not supported.`);
    }
  }

  toBase58Btc(): string {
    switch (this.format) {

      case 'ArrayBuffer': {
        const u8a = new Uint8Array(this.data);
        return base58btc.baseEncode(u8a);
      }

      case 'Multibase': {
        return this.data.substring(1);
      }

      case 'Uint8Array': {
        return base58btc.baseEncode(this.data);
      }

      default:
        throw new TypeError(`Conversion from ${this.format} to Base58Btc is not supported.`);
    }
  }

  toBase64Url(): string {
    switch (this.format) {

      case 'ArrayBuffer': {
        const u8a = new Uint8Array(this.data);
        return base64url.baseEncode(u8a);
      }

      case 'BufferSource': {
        const u8a = this.toUint8Array();
        return base64url.baseEncode(u8a);
      }

      case 'Object': {
        const string = JSON.stringify(this.data);
        const u8a = textEncoder.encode(string);
        return base64url.baseEncode(u8a);
      }

      case 'String': {
        const u8a = textEncoder.encode(this.data);
        return base64url.baseEncode(u8a);
      }

      case 'Uint8Array': {
        return base64url.baseEncode(this.data);
      }

      default:
        throw new TypeError(`Conversion from ${this.format} to Base64Url is not supported.`);
    }
  }

  toHex(): string {
    // pre-calculating Hex values improves runtime by 6-10x.
    const hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));

    switch (this.format) {

      case 'ArrayBuffer': {
        const u8a = this.toUint8Array();
        return Convert.uint8Array(u8a).toHex();
      }

      case 'Base64Url': {
        const u8a = this.toUint8Array();
        return Convert.uint8Array(u8a).toHex();
      }

      case 'Uint8Array': {
        let hex = '';
        for (let i = 0; i < this.data.length; i++) {
          hex += hexes[this.data[i]];
        }
        return hex;
      }

      default:
        throw new TypeError(`Conversion from ${this.format} to Hex is not supported.`);
    }
  }

  toMultibase(): Multibase<any> {
    switch (this.format) {
      case 'Base58Btc': {
        return `z${this.data}`;
      }

      default:
        throw new TypeError(`Conversion from ${this.format} to Multibase is not supported.`);
    }
  }

  toObject(): object {
    switch (this.format) {

      case 'Base64Url': {
        const u8a = base64url.baseDecode(this.data);
        const string = textDecoder.decode(u8a);
        return JSON.parse(string);
      }

      case 'String': {
        return JSON.parse(this.data);
      }

      case 'Uint8Array': {
        const string = textDecoder.decode(this.data);
        return JSON.parse(string);
      }

      default:
        throw new TypeError(`Conversion from ${this.format} to Object is not supported.`);
    }
  }

  toString(): string {
    switch (this.format) {

      case 'ArrayBuffer': {
        return textDecoder.decode(this.data);
      }

      case 'Base64Url': {
        const u8a = base64url.baseDecode(this.data);
        return textDecoder.decode(u8a);
      }

      case 'Object': {
        return JSON.stringify(this.data);
      }

      case 'Uint8Array': {
        return textDecoder.decode(this.data);
      }

      default:
        throw new TypeError(`Conversion from ${this.format} to String is not supported.`);
    }
  }

  toUint8Array(): Uint8Array {
    switch (this.format) {

      case 'ArrayBuffer': {
        // Çreate Uint8Array as a view on the ArrayBuffer.
        // Note: The Uint8Array shares the same memory as the ArrayBuffer, so this operation is very efficient.
        return new Uint8Array(this.data);
      }

      case 'Base58Btc': {
        return base58btc.baseDecode(this.data);
      }

      case 'Base64Url': {
        return base64url.baseDecode(this.data);
      }

      case 'BufferSource': {
        const dataType = universalTypeOf(this.data);
        if (dataType === 'Uint8Array') {
          // Data is already a Uint8Array. No conversion is necessary.
          // Note: Uint8Array is a type of BufferSource.
          return this.data;
        } else if (dataType === 'ArrayBuffer') {
          // Data is an ArrayBuffer, create Uint8Array as a view on the ArrayBuffer.
          // Note: The Uint8Array shares the same memory as the ArrayBuffer, so this operation is very efficient.
          return new Uint8Array(this.data);
        } else if (ArrayBuffer.isView(this.data)) {
          // Data is a DataView or a different TypedArray (e.g., Uint16Array).
          return new Uint8Array(this.data.buffer, this.data.byteOffset, this.data.byteLength);
        } else {
          throw new TypeError(`${this.format} value is not of type: ArrayBuffer, DataView, or TypedArray.`);
        }
      }

      case 'Hex': {
        const u8a = new Uint8Array(this.data.length / 2);
        for (let i = 0; i < this.data.length; i += 2) {
          const byteValue = parseInt(this.data.substring(i, i + 2), 16);
          if (isNaN(byteValue)) {
            throw new TypeError('Input is not a valid hexadecimal string.');
          }
          u8a[i / 2] = byteValue;
        }
        return u8a;
      }

      case 'Object': {
        const string = JSON.stringify(this.data);
        return textEncoder.encode(string);
      }

      case 'String': {
        return textEncoder.encode(this.data);
      }

      default:
        throw new TypeError(`Conversion from ${this.format} to Uint8Array is not supported.`);
    }
  }
}