/**
 * Retrieves the current timestamp in XML Schema 1.1.2 date-time format.
 *
 * This function omits the milliseconds part from the ISO 8601 timestamp, returning a date-time
 * string in the format "yyyy-MM-ddTHH:mm:ssZ".
 *
 * @returns The current timestamp in XML Schema 1.1.2 format.
 *
 * @example
 * const currentTimestamp = getCurrentXmlSchema112Timestamp(); // "2023-08-23T12:34:56Z"
 */
export function getCurrentXmlSchema112Timestamp(): string {
  // Omit the milliseconds part from toISOString() output
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

/**
 * Calculates a future timestamp in XML Schema 1.1.2 date-time format based on a given number of
 * seconds.
 *
 * This function takes a number of seconds and adds it to the current timestamp, returning a
 * date-time string in the format "yyyy-MM-ddTHH:mm:ssZ" without milliseconds.
 *
 * @param secondsInFuture - The number of seconds to project into the future.
 * @returns The future timestamp in XML Schema 1.1.2 format.
 *
 * @example
 * const futureTimestamp = getFutureXmlSchema112Timestamp(60); // "2023-08-23T12:35:56Z"
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
 * @param timestamp - The timestamp string to validate.
 * @returns `true` if the timestamp is valid, `false` otherwise.
 *
 * @example
 * const isValid = isValidXmlSchema112Timestamp('2023-08-23T12:34:56Z'); // true
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