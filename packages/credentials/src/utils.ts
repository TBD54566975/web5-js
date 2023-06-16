export function getCurrentXmlSchema112Timestamp() : string {
  // Omit the milliseconds part from toISOString() output
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

export function isXmlSchema112Timestamp(timestamp : string): boolean {
  if (isNaN(Date.parse(timestamp))) {
    return false;
  }
  // Omit the milliseconds part from toISOString() output
  const isoStr = new Date(timestamp).toISOString().replace(/\.\d+Z$/, 'Z');
  return isoStr === timestamp;
}