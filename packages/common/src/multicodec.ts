import { Convert } from './convert.js';

export type MulticodecDefinition<Code extends number> = {
  code: Code;
  codeBytes: Uint8Array;
  name: string;
}

/**
 * The `Multicodec` class provides an interface to prepend binary data
 * with a prefix that identifies the data that follows.
 * https://github.com/multiformats/multicodec/blob/master/table.csv
 *
 * Multicodec is a self-describing multiformat, it wraps other formats with
 * a tiny bit of self-description. A multicodec identifier is a
 * varint (variable integer) that indicates the format of the data.
 *
 * The canonical table of multicodecs can be access at the following URL:
 * https://github.com/multiformats/multicodec/blob/master/table.csv
 *
 * Example usage:
 *
 * ```ts
 * Multicodec.registerCodec({ code: 0xed, codeBytes: new Uint8Array([0xed, 0x01]), name: 'ed25519-pub' });
 * const prefixedData = Multicodec.addPrefix({ code: 0xed, data: new Uint8Array(32) });
 * ```
 */
export class Multicodec {
  /**
   * A static field containing a map of codec codes to their corresponding codec definitions.
   */
  static codecs = new Map<number, MulticodecDefinition<number>>();

  /**
   * A static field containing a map of codec names to their corresponding codes.
   */
  static registry = new Map<string, number>;

  /**
   * Adds a multicodec prefix to input data.
   *
   * @param options - The options for adding a prefix.
   * @param options.code - The codec code. Either the code or name must be provided.
   * @param options.name - The codec name. Either the code or name must be provided.
   * @param options.data - The data to be prefixed.
   * @returns The data with the added prefix as a Uint8Array.
   */
  public static addPrefix(options: {
    code?: number,
    name?: string,
    data: BufferSource,
  }): Uint8Array {
    const { code, name } = options;
    let prefix: Uint8Array | undefined;

    if (code) {
      prefix = Multicodec.codecs.get(code)?.codeBytes;
    } else if (name) {
      const code = Multicodec.registry.get(name);
      prefix = code ? Multicodec.codecs.get(code)!.codeBytes : undefined;
    } else {
      throw new Error(`Required parameter missing: 'code' or 'name'`);
    }

    if (prefix === undefined) {
      throw new Error(`Multicodec not found: ${code ?? name}`);
    }

    const data = Convert.bufferSource(options.data).toUint8Array();

    const dataWithPrefix = new Uint8Array(prefix.length + data.length);
    dataWithPrefix.set(prefix);
    dataWithPrefix.set(data, prefix.length);

    return dataWithPrefix;
  }

  /**
   * Registers a new codec in the Multicodec class.
   *
   * @param codec - The codec to be registered.
   */
  public static registerCodec(codec: MulticodecDefinition<number>) {
    Multicodec.codecs.set(codec.code, codec);
    Multicodec.registry.set(codec.name, codec.code);
  }
}

// Pre-defined registered codecs:
Multicodec.registerCodec({ code: 0xed, codeBytes: new Uint8Array([0xed, 0x01]), name: 'ed25519-pub' });
Multicodec.registerCodec({ code: 0x1300, codeBytes: new Uint8Array([0x80, 0x26]), name: 'ed25519-priv' });
Multicodec.registerCodec({ code: 0xec, codeBytes: new Uint8Array([0xec, 0x01]), name: 'x25519-pub' });
Multicodec.registerCodec({ code: 0x1302, codeBytes: new Uint8Array([0x82, 0x26]), name: 'x25519-priv' });
Multicodec.registerCodec({ code: 0xe7, codeBytes: new Uint8Array([0xe7, 0x01]), name: 'secp256k1-pub' });
Multicodec.registerCodec({ code: 0x1301, codeBytes: new Uint8Array([0x81, 0x26]), name: 'secp256k1-priv' });