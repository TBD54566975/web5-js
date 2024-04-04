import { Convert, universalTypeOf } from '@web5/common';

/**
 * Converts various data types to a `Blob` object, automatically detecting the data type or using
 * the specified `dataFormat` to set the Blob's MIME type.
 *
 * This function supports plain text, JSON objects, binary data (Uint8Array, ArrayBuffer), and Blob
 * inputs and will attempt to automatically detect the type of the data if `dataFormat` is not
 * explicitly provided.
 *
 * @beta
 *
 * @example
 * ```ts
 * // Convert a JSON object to a Blob
 * const { dataBlob, dataFormat } = dataToBlob({ key: 'value' }, 'application/json');
 *
 * // Convert a plain text string to a Blob without specifying dataFormat
 * const { dataBlob: textBlob } = dataToBlob('Hello, world!');
 *
 * // Convert binary data to a Blob
 * const binaryData = new Uint8Array([0, 1, 2, 3]);
 * const { dataBlob: binaryBlob } = dataToBlob(binaryData);
 * ```
 *
 * @param data - The data to be converted into a `Blob`. This can be a string, an object, binary
 *               data (Uint8Array or ArrayBuffer), or a Blob.
 * @param dataFormat - An optional MIME type string that specifies the format of the data. Common
 *                     types include 'text/plain' for string data, 'application/json' for JSON
 *                     objects, and 'application/octet-stream' for binary data. If not provided, the
 *                     function will attempt to detect the format based on the data type or default
 *                     to 'application/octet-stream'.
 * @returns An object containing the `dataBlob`, a Blob representation of the input data, and
 *          `dataFormat`, the MIME type of the data as determined by the function or specified by the caller.
 * @throws An error if the data type is not supported or cannot be converted to a Blob.
 */
export function dataToBlob(data: any, dataFormat?: string): {
  /** A Blob representation of the input data. */
  dataBlob: Blob;
  /** The MIME type of the data. */
  dataFormat: string;
} {
  let dataBlob: Blob;

  // Check for Object or String, and if neither, assume bytes.
  const detectedType = universalTypeOf(data);
  if (dataFormat === 'text/plain' || detectedType === 'String') {
    dataBlob = new Blob([data], { type: 'text/plain' });
  } else if (dataFormat === 'application/json' || detectedType === 'Object') {
    const dataBytes = Convert.object(data).toUint8Array();
    dataBlob = new Blob([dataBytes], { type: 'application/json' });
  } else if (detectedType === 'Uint8Array' || detectedType === 'ArrayBuffer') {
    dataBlob = new Blob([data], { type: 'application/octet-stream' });
  } else if (detectedType === 'Blob') {
    dataBlob = data;
  } else {
    throw new Error('data type not supported.');
  }

  dataFormat = dataFormat || dataBlob.type || 'application/octet-stream';

  return { dataBlob, dataFormat };
}

/**
 * The `SendCache` class provides a static caching mechanism to optimize the process of sending
 * records to remote DWN targets by minimizing redundant sends.
 *
 * It maintains a cache of record IDs and their associated target DIDs to which they have been sent.
 * This helps in avoiding unnecessary network requests and ensures efficient data synchronization
 * across Decentralized Web Nodes (DWNs).
 *
 * The cache employs a simple eviction policy to maintain a manageable size, ensuring that the cache
 * does not grow indefinitely and consume excessive memory resources.
 *
 * @beta
 */
export class SendCache {
  /**
   * A private static map that serves as the core storage mechanism for the cache. It maps record
   * IDs to a set of target DIDs, indicating which records have been sent to which targets.
  */
  private static cache = new Map<string, Set<string>>();

  /**
   * The maximum number of entries allowed in the cache. Once this limit is exceeded, the oldest
   * entries are evicted to make room for new ones. This limit applies both to the number of records
   * and the number of targets per record.
   */
  private static sendCacheLimit = 100;

  /**
   * Checks if a given record ID has been sent to a specified target DID. This method is used to
   * determine whether a send operation is necessary or if it can be skipped to avoid redundancy.
   *
   * @param id - The unique identifier of the record.
   * @param target - The DID of the target to check against.
   * @returns A boolean indicating whether the record has been sent to the target.
   */
  public static check(id: string, target: string): boolean {
    let targetCache = SendCache.cache.get(id);
    return targetCache ? targetCache.has(target) : false;
  }

  /**
   * Adds or updates an entry in the cache for a given record ID and target DID. If the cache
   * exceeds its size limit, the oldest entry is removed. This method ensures that the cache
   * reflects the most recent sends.
   *
   * @param id - The unique identifier of the record.
   * @param target - The DID of the target to which the record has been sent.
   */
  public static set(id: string, target: string): void {
    let targetCache = SendCache.cache.get(id) || new Set();
    SendCache.cache.delete(id);
    SendCache.cache.set(id, targetCache);
    if (this.cache.size > SendCache.sendCacheLimit) {
      const firstRecord = SendCache.cache.keys().next().value;
      SendCache.cache.delete(firstRecord);
    }
    targetCache.delete(target);
    targetCache.add(target);
    if (targetCache.size > SendCache.sendCacheLimit) {
      const firstTarget = targetCache.keys().next().value;
      targetCache.delete(firstTarget);
    }
  }
}