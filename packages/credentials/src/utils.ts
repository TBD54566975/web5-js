export function getCurrentXmlSchema112Timestamp() : string {
  // Omit the milliseconds part from toISOString() output
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}