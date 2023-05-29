import { AbstractLevel, AbstractDatabaseOptions } from 'abstract-level';
import { Level } from 'level';

export type LevelType = Level<string, string> | AbstractLevel<string>;

export class LevelFactory {
  public static createLevel(
    location: string,
    options?: AbstractDatabaseOptions<string, string>
  ): Level<string, string> {
    return new Level(location, options);
  }

  public static createAbstractLevel<T extends AbstractLevel<string>>(
    levelClass: new (location: string, options?: AbstractDatabaseOptions<string, string>) => T,
    location: string,
    options?: AbstractDatabaseOptions<string, string>
  ): T {
    return new levelClass(location, options);
  }
}