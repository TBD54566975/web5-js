import type { AbstractBatchOperation, AbstractBatchDelOperation } from 'abstract-level';

import { Level } from 'level';
import flat from 'flat';

const { flatten } = flat;

export type Record = {
  id: string,
  [prop: string]: unknown
};

export type RangeFilter = {
  gt?: any,
  gte?: any,
  lt?: any,
  lte?: any
};

export type TermFilter = string | number | boolean

export type Filter = {
  [prop: string]: TermFilter | TermFilter[] | RangeFilter
}

export class ProfileIndex {
  level: Level<string, string>;

  constructor(private location = 'data/agent/profiles-index') {
    this.level = new Level(location);
  }

  async delete(id: string): Promise<void> {
    const ops: AbstractBatchDelOperation<typeof this.level, string>[] = [];

    let keyPrefixes: string | string[] = await this.level.get(`__${id}__meta`);
    if (!keyPrefixes) {
      return;
    }

    keyPrefixes = keyPrefixes.split('@');

    for (let keyPrefix of keyPrefixes) {
      const op = { type: 'del' as const, key: `${keyPrefix}~${id}` };
      ops.push(op);
    }

    ops.push({ type: 'del' as const, key: `__${id}__meta` });

    await this.level.batch(ops);
  }

  async put(record: Record): Promise<void> {
    const flattenedRecord: Record = flatten(record);
    let { id } = flattenedRecord;

    let keyPrefixes: string[] = [];
    const ops: AbstractBatchOperation<typeof this.level, string, string>[] = [];
    for (let property in flattenedRecord) {
      if (property === 'id') {
        continue;
      }

      const propVal = flattenedRecord[property];
      const keyPrefix = `${property}~${propVal}`;
      const key = `${keyPrefix}~${id}`;

      ops.push({ type: 'put', key, value: id });
      keyPrefixes.push(keyPrefix);
    }

    ops.push({ type: 'put', key: `__${id}__meta`, value: keyPrefixes.join('@')  });

    await this.level.batch(ops);
  }

  async query(filter: Filter): Promise<Array<string>> {
    const matches: { [docId: string]: number } = {};
    const promises: Promise<void>[] = [];

    for (let propertyName in filter) {
      const propertyValue = filter[propertyName];

      if (typeof propertyValue === 'object' && propertyValue !== null) {
        if (Array.isArray(propertyValue)) {
          // OR query
          for (let value of propertyValue) {
            const promise = this.buildTermQuery(propertyName, value, matches);
            promises.push(promise);
          }
        } else {
          const promise = this.buildRangeQuery(propertyName, propertyValue, matches);
          promises.push(promise);
        }
      } else {
        const promise = this.buildTermQuery(propertyName, propertyValue, matches);
        promises.push(promise);
      }
    }

    const numFilters = Object.keys(filter).length;
    const docIds: string[] = [];
    await Promise.all(promises);

    for (let docId in matches) {
      if (matches[docId] === numFilters) {
        docIds.push(docId);
      }
    }

    return docIds;
  }

  async buildTermQuery(propertyName: string, propertyValue: unknown, matches: { [docId: string]: number }): Promise<void> {
    const key = `${propertyName}~${propertyValue}`;
    const iteratorOptions = {
      gt: `${key}~`
    };

    for await (let doc of this.level.iterator(iteratorOptions)) {
      const [k, val] = doc;
      if (!k.includes(key)) {
        break;
      }

      if (val in matches) {
        matches[val] += 1;
      } else {
        matches[val] = 1;
      }
    }
  }

  async buildRangeQuery(propertyName: string, range: RangeFilter, matches: { [docId: string]: number }): Promise<void> {
    const key = `${propertyName}`;
    const iteratorOptions: { [key: string]: any } = {};

    for (let inequality in range) {
      iteratorOptions[inequality] = `${propertyName}~${range[inequality as keyof RangeFilter]}`;
    }

    for await (let doc of this.level.iterator(iteratorOptions)) {
      const [k, val] = doc;
      if (!k.includes(key)) {
        break;
      }

      if (val in matches) {
        matches[val] += 1;
      } else {
        matches[val] = 1;
      }
    }
  }

  async clear(): Promise<void> {
    this.level.clear();
  }
}