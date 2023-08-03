export function getCurrentXmlSchema112Timestamp() : string {
    // Omit the milliseconds part from toISOString() output
    return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  }
  
  export function getFutureXmlSchema112Timestamp(secondsInFuture: number): string {
    const futureDate = new Date(Date.now() + secondsInFuture * 1000);
    return futureDate.toISOString().replace(/\.\d+Z$/, 'Z');
  }
  
  export function isValidXmlSchema112Timestamp(timestamp: string): boolean {
    // Format: yyyy-MM-ddTHH:mm:ssZ
    const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
    if (!regex.test(timestamp)) {
      return false;
    }
  
    const date = new Date(timestamp);
  
    return !isNaN(date.getTime());
  }