export function getCurrentXmlSchema112Timestamp() : string {
  // Omit the milliseconds part from toISOString() output
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

export function getFutureXmlSchema112Timestamp(secondsInFuture: number): string {
  // Create a new Date object for the current time plus the specified number of seconds
  const futureDate = new Date(Date.now() + secondsInFuture * 1000); // convert seconds to milliseconds

  // Omit the milliseconds part from toISOString() output
  return futureDate.toISOString().replace(/\.\d+Z$/, 'Z');
}