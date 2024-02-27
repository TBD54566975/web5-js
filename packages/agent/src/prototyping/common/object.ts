export function hasDuplicateProperties(...objects: Array<Record<string, any> | undefined>): boolean {
  const propertySet = new Set<string>();
  const objectsWithoutUndefined = objects.filter(Boolean); // Remove any undefined values

  for (const obj of objectsWithoutUndefined) {
    for (const key in obj) {
      if (propertySet.has(key)) {
        return true; // Return true if a duplicate property is found
      }
      propertySet.add(key);
    }
  }

  return false; // Return false if no duplicates are found
}