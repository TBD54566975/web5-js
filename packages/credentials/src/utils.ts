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
export function getCurrentXmlSchema112Timestamp(): string {
  // Omit the milliseconds part from toISOString() output
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

/**
 * Converts a UNIX timestamp to an XML Schema 1.1.2 compliant date-time string, omitting milliseconds.
 *
 * This function takes a UNIX timestamp (number of seconds since the UNIX epoch) as input and converts it
 * to a date-time string formatted according to XML Schema 1.1.2 specifications, specifically omitting
 * the milliseconds component from the standard ISO 8601 format. This is useful for generating
 * timestamps for verifiable credentials and other applications requiring precision to the second
 * without the need for millisecond granularity.
 *
 * @param timestampInSeconds The UNIX timestamp to convert, measured in seconds.
 * @example
 * ```ts
 * const issuanceDate = getXmlSchema112Timestamp(1633036800); // "2021-10-01T00:00:00Z"
 * ```
 *
 * @returns A date-time string in the format "yyyy-MM-ddTHH:mm:ssZ", compliant with XML Schema 1.1.2, based on the provided UNIX timestamp.
 */
export function getXmlSchema112Timestamp(timestampInSeconds: number): string {
  const date = new Date(timestampInSeconds * 1000);

  // Format the date to an ISO string and then remove milliseconds
  return date.toISOString().replace(/\.\d{3}/, '');
}

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
export function getFutureXmlSchema112Timestamp(secondsInFuture: number): string {
  const futureDate = new Date(Date.now() + secondsInFuture * 1000);
  return futureDate.toISOString().replace(/\.\d+Z$/, 'Z');
}

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
export function isValidXmlSchema112Timestamp(timestamp: string): boolean {
  // Format: yyyy-MM-ddTHH:mm:ssZ
  const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  if (!regex.test(timestamp)) {
    return false;
  }

  const date = new Date(timestamp);

  return !isNaN(date.getTime());
}

/**
 * Validates a timestamp string against the RFC 3339 format.
 *
 * This function checks whether the provided timestamp string conforms to the
 * RFC 3339 standard, which includes full date and time representations with
 * optional fractional seconds and a timezone offset. The format allows for
 * both 'Z' (indicating UTC) and numeric timezone offsets (e.g., "-07:00", "+05:30").
 * This validation ensures that the timestamp is not only correctly formatted
 * but also represents a valid date and time.
 *
 * @param timestamp - The timestamp string to validate.
 * @returns `true` if the timestamp is valid and conforms to RFC 3339, `false` otherwise.
 */
export function isValidRFC3339Timestamp(timestamp: string): boolean {
  // RFC 3339 format: yyyy-MM-ddTHH:mm:ss[.fractional-seconds]Z or yyyy-MM-ddTHH:mm:ss[.fractional-seconds]±HH:mm
  // This regex matches both 'Z' for UTC and timezone offsets like '-07:00'
  const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  if (!regex.test(timestamp)) {
    return false;
  }

  // Parsing the timestamp to a Date object to check validity
  const date = new Date(timestamp);

  // Checking if the date is an actual date
  return !isNaN(date.getTime());
}