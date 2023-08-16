/**
 * Checks whether the given object has any properties.
 */
export function isEmptyObject(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  if (Object.getOwnPropertySymbols(obj).length > 0) {
    return false;
  }

  return Object.keys(obj).length === 0;
}

/**
 * Recursively removes all properties with an empty object or array as its value from the given object.
 */
export function removeEmptyObjects(obj: Record<string, unknown>): void {
  Object.keys(obj).forEach(key => {
    if (typeof(obj[key]) === 'object') {
      // recursive remove empty object or array properties in nested objects
      removeEmptyObjects(obj[key] as Record<string, unknown>);
    }

    if (isEmptyObject(obj[key])) {
      delete obj[key];
    }
  });
}

/**
 * Recursively removes all properties with `undefined` as its value from the given object.
 */
export function removeUndefinedProperties(obj: Record<string, unknown>): void {
  Object.keys(obj).forEach(key => {
    if (obj[key] === undefined) {
      delete obj[key];
    } else if (typeof(obj[key]) === 'object') {
      removeUndefinedProperties(obj[key] as Record<string, unknown>); // recursive remove `undefined` properties in nested objects
    }
  });
}