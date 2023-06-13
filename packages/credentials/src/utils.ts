export function getCurrentTimestamp() : string {
  return new Date().toISOString();
}

export function isRFC3339Timestamp(timestamp: string): boolean {
  if (typeof timestamp !== 'string') {
    return false;
  }

  return !isNaN(Date.parse(timestamp));
}