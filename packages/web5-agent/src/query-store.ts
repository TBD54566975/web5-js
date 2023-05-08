export interface QueryStore<T> {
  put(entry: T): Promise<void>;
  get(id: string): Promise<T>;
  query(filter: Filter): Promise<T[]>;
  delete(): Promise<void>;
}


export type Filter = {
  [property: string]: EqualFilter | OneOfFilter | RangeFilter
};

export type EqualFilter = string | number | boolean;

export type OneOfFilter = EqualFilter[];

/**
 * "greater than" or "greater than or equal to" range condition. `gt` and `gte` are mutually exclusive.
 */
export type GT = ({ gt: string } & { gte?: never }) | ({ gt?: never } & { gte: string });

/**
 * "less than" or "less than or equal to" range condition. `lt`, `lte` are mutually exclusive.
 */
export type LT = ({ lt: string } & { lte?: never }) | ({ lt?: never } & { lte: string });

/**
 * Ranger filter. 1 condition is required.
 */
export type RangeFilter = (GT | LT) & Partial<GT> & Partial<LT>;