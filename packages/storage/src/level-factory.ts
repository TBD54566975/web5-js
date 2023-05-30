import { AbstractLevel, AbstractDatabaseOptions } from 'abstract-level';
import { Level } from 'level';

function countConstructorArguments(classDef: any) {
  const constructorString = classDef.toString();
  const constructorArgs = constructorString.slice(
    constructorString.indexOf('(') + 1,
    constructorString.indexOf(')')
  );
  return constructorArgs.split(',').filter((arg: string) => arg.trim() !== '_').length;
}

type LevelConstructorWithOptionsWithoutLocation<T> = new (options?: AbstractDatabaseOptions<string, string> | undefined) => T
type LevelConstructorWithOptionsAndLocation<T> = new (location?: string | undefined, options?: AbstractDatabaseOptions<string, string> | undefined) => T

export class LevelFactory {
  public static createLevel(
    location: string,
    options?: AbstractDatabaseOptions<string, string>
  ): Level<string, string> {
    return new Level(location, options);
  }

  public static createAbstractLevel<T extends AbstractLevel<string | Buffer | Uint8Array>>(
    levelClass: LevelConstructorWithOptionsWithoutLocation<T> & LevelConstructorWithOptionsAndLocation<T>,
    location?: string | undefined,
    options?: AbstractDatabaseOptions<string, string> | undefined
  ): T {
    const args = countConstructorArguments(levelClass);
    // hackish but incredibly, memory-level doesn't respect the abstract-level interface 100%. others might as well.
    if (args === 1) {
      return new levelClass(options);
    } else if (args > 1) {
      return new levelClass(location, options);
    } else {
      throw new Error('Invalid constructor arguments');
    }
  }
}