/**
 * Retrieves the current timestamp in XML Schema 1.1.2 date-time format.
 *
 * This function omits the milliseconds part from the ISO 8601 timestamp, returning a date-time
 * string in the format "yyyy-MM-ddTHH:mm:ssZ".
 *
 * @example
 * ```ts
 * const currentTimestamp = getCurrentXmlSchema112Timestamp(); // "2023-08-23T12:34:56Z"
 * ```
 *
 * @returns The current timestamp in XML Schema 1.1.2 format.
 */
export declare function getCurrentXmlSchema112Timestamp(): string;
/**
 * Calculates a future timestamp in XML Schema 1.1.2 date-time format based on a given number of
 * seconds.
 *
 * This function takes a number of seconds and adds it to the current timestamp, returning a
 * date-time string in the format "yyyy-MM-ddTHH:mm:ssZ" without milliseconds.
 *
 * @example
 * ```ts
 * const futureTimestamp = getFutureXmlSchema112Timestamp(60); // "2023-08-23T12:35:56Z"
 * ```
 *
 * @param secondsInFuture - The number of seconds to project into the future.
 * @returns The future timestamp in XML Schema 1.1.2 format.
 */
export declare function getFutureXmlSchema112Timestamp(secondsInFuture: number): string;
/**
 * Validates a timestamp string against the XML Schema 1.1.2 date-time format.
 *
 * This function checks whether the provided timestamp string conforms to the
 * format "yyyy-MM-ddTHH:mm:ssZ", without milliseconds, as defined in XML Schema 1.1.2.
 *
 * @example
 * ```ts
 * const isValid = isValidXmlSchema112Timestamp('2023-08-23T12:34:56Z'); // true
 * ```
 *
 * @param timestamp - The timestamp string to validate.
 * @returns `true` if the timestamp is valid, `false` otherwise.
 */
export declare function isValidXmlSchema112Timestamp(timestamp: string): boolean;
//# sourceMappingURL=utils.d.ts.map