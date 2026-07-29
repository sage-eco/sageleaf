import 'reflect-metadata'

const EXCLUDE_FROM_DIFF_KEY = Symbol('excludeFromDiff')

/** Marks a scalar @Property field to be omitted from Change/ChangeEdit original/changes diff JSON
 *  (e.g. DB-computed or separately-managed fields like rank/rankOrder). Stack above @Property(). */
export function ExcludeFromDiff(): PropertyDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(EXCLUDE_FROM_DIFF_KEY, true, target, propertyKey)
  }
}

export function isExcludedFromDiff(target: object, propertyKey: string): boolean {
  return Reflect.getMetadata(EXCLUDE_FROM_DIFF_KEY, target, propertyKey) === true
}
