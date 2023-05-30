import type { AbstractLevel } from 'abstract-level';

export type StorageFor = 'appStorage' | 'did' | 'profileIndex' | 'profileStore' | 'syncApi';

export type LevelType<T extends AbstractLevel<string | Buffer | Uint8Array> = AbstractLevel<string | Buffer | Uint8Array>> = T;

export type Storage<T extends AbstractLevel<string | Buffer | Uint8Array>> = {
    [key in StorageFor]?: LevelType<T>;
}

