/**
 * Represents a cryptographic key with associated multicodec metadata.
 *
 * The `KeyWithMulticodec` type encapsulates a cryptographic key along with optional multicodec
 * information. It is primarily used in functions that convert between cryptographic keys and their
 * string representations, ensuring that the key's format and encoding are preserved and understood
 * across different systems and applications.
 */
export type KeyWithMulticodec = {
  /**
   * A `Uint8Array` representing the raw bytes of the cryptographic key. This is the primary data of
   * the type and is essential for cryptographic operations.
   */
  keyBytes: Uint8Array,

  /**
   * An optional number representing the multicodec code. This code uniquely identifies the encoding
   * format or protocol associated with the key. The presence of this code is crucial for decoding
   * the key correctly in different contexts.
   */
  multicodecCode?: number,

  /**
   * An optional string representing the human-readable name of the multicodec. This name provides
   * an easier way to identify the encoding format or protocol of the key, especially when the
   * numerical code is not immediately recognizable.
   */
  multicodecName?: string
};