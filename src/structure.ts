export const Tag: unique symbol = Symbol('Tag')
export const LiteralValue: unique symbol = Symbol('Literal')

export interface Literal<T extends null | boolean | number | string> {
  [LiteralValue]: T
}

export const Literal = <T extends null | boolean | number | string>(
  literal: T,
): Literal<T> =>
  Object.defineProperty({}, LiteralValue, { value: literal, enumerable: true })

type TaggedArray<T extends [...unknown[]], TagName extends string> = {
  [Tag]: TagName
  structures: {
    readonly [key in Exclude<keyof T, keyof []>]: T[key]
  }
}

export type Tuple<T extends [...unknown[]]> = TaggedArray<T, 'tuple'>
export type Union<T extends [...unknown[]]> = TaggedArray<T, 'union'>
export type Intersection<T extends [...unknown[]]> = TaggedArray<
  T,
  'intersection'
>

function makeTaggedArray<T extends unknown[], TagName extends string>(
  array: T,
  tag: TagName,
): TaggedArray<T, TagName> {
  return Object.defineProperty({ structures: array }, Tag, {
    value: tag,
    enumerable: false,
    configurable: true,
    writable: false,
  })
}

export function Tuple<T extends [...unknown[]]>(...members: T): Tuple<T> {
  return makeTaggedArray(members, 'tuple')
}

export const Union = <T extends [...unknown[]]>(...members: T): Union<T> => {
  return makeTaggedArray(members, 'union')
}

export const Intersection = <T extends [...unknown[]]>(
  ...members: T
): Intersection<T> => {
  return makeTaggedArray(members, 'intersection')
}

type UnionOfTuple<T extends [...unknown[]]> = T[number] extends infer U
  ? StructureType<U>
  : never

type UnionToIntersection<U> = (
  U extends unknown ? (arg: StructureType<U>) => void : never
) extends (arg: infer I) => void
  ? I
  : never
type Wrap<T extends unknown[]> = { [key in keyof T]: [T[key]] }
type Unwrap<T> = T extends [unknown] ? T[0] : never
type ProjectTuple<T extends unknown[]> = T[Exclude<keyof T, keyof []>]

type IntersectionOfTuple<T extends unknown[]> = Unwrap<
  UnionToIntersection<ProjectTuple<Wrap<T>>>
>

type MapStructureType<T> = { [key in keyof T]: StructureType<T[key]> }

export type StructureType<T> = T extends Literal<infer U>
  ? U
  : T extends typeof Boolean
  ? boolean
  : T extends typeof Number
  ? number
  : T extends typeof String
  ? string
  : T extends Union<infer U>
  ? UnionOfTuple<U>
  : T extends Intersection<infer U>
  ? IntersectionOfTuple<U>
  : T extends Tuple<infer U>
  ? MapStructureType<U>
  : T extends unknown[]
  ? MapStructureType<T>
  : T extends Readonly<Record<string, unknown>>
  ? { -readonly [key in keyof T]: StructureType<T[key]> }
  : T extends () => infer U
  ? StructureType<U>
  : never

type Predicate = (value: unknown) => boolean

function hasField<O, F extends PropertyKey>(
  object: O,
  field: F,
): object is O & { [key in F]: unknown } {
  return Object.prototype.hasOwnProperty.call(object, field)
}

function validateUnion<T>(
  structures: readonly unknown[],
): (value: unknown) => value is T {
  if (structures.length === 0) {
    throw new Error('at least one element required')
  }
  const predicates = structures.map((s) => validate(s))

  return (value: unknown): value is T => {
    return predicates.some((p) => p(value))
  }
}

function validateIntersection<T>(
  structures: readonly unknown[],
): (value: unknown) => value is T {
  if (structures.length === 0) {
    throw new Error('at least one element required')
  }
  const predicates = structures.map((s) => validate(s))

  return (value: unknown): value is T => {
    return predicates.every((p) => p(value))
  }
}

function validateTuple<T>(
  structures: readonly unknown[],
): (value: unknown) => value is T {
  const predicates = structures.map(
    (s, i) => [i, validate(s)] as [number, Predicate],
  )
  return (value: unknown): value is T => {
    if (!Array.isArray(value)) {
      return false
    }
    for (const [i, predicate] of predicates) {
      if (!predicate(value[i])) {
        return false
      }
    }
    return true
  }
}

function validateArray<T>(
  structures: readonly unknown[],
): (value: unknown) => value is T {
  if (structures.length !== 1) {
    throw new Error('one element required')
  }
  const predicate = validate(structures[0])

  return (value: unknown): value is T => {
    return Array.isArray(value) && value.every(predicate)
  }
}

function validateObject<T>(
  structures: unknown,
): (value: unknown) => value is T {
  if (typeof structures !== 'object') {
    throw new TypeError('argument must be an object')
  }
  if (structures === null) {
    throw new TypeError('argument must not be null')
  }
  type Predicate = (value: unknown) => boolean
  const predicates: [string, Predicate][] = Object.entries(structures).map(
    ([key, value]) => {
      return [key, validate(value)] as [string, Predicate]
    },
  )

  return (value: unknown): value is T => {
    if (typeof value !== 'object') {
      return false
    }
    if (value === null) {
      return false
    }
    for (const [key, predicate] of predicates) {
      if (!hasField(value, key)) {
        return false
      }
      if (!predicate(value[key])) {
        return false
      }
    }
    return true
  }
}

const lazyCache: WeakMap<
  () => unknown,
  (value: unknown) => value is unknown
> = new WeakMap()

// The parameter `structure` must hav by StructureType
export function validate<T extends unknown>(
  structure: T,
): (value: unknown) => value is StructureType<T> {
  // Constant value
  if (hasField(structure, LiteralValue)) {
    const literal = structure[LiteralValue]
    return (value: unknown): value is StructureType<T> => value === literal
  }

  // Basic type
  if (structure === Boolean) {
    return (value: unknown): value is StructureType<T> =>
      typeof value === 'boolean'
  }
  if (structure === Number) {
    return (value: unknown): value is StructureType<T> =>
      typeof value === 'number'
  }
  if (structure === String) {
    return (value: unknown): value is StructureType<T> =>
      typeof value === 'string'
  }

  // Tuple, union, or intersection
  if (hasField(structure, Tag)) {
    if (!hasField(structure, 'structures')) {
      throw new Error()
    }
    if (!Array.isArray(structure.structures)) {
      throw new Error()
    }
    const tag = structure[Tag]
    if (tag === 'union') {
      return validateUnion(structure.structures)
    } else if (tag === 'intersection') {
      return validateIntersection(structure.structures)
    } else if (tag === 'tuple') {
      return validateTuple(structure.structures)
    } else {
      throw new Error(`Unsupported tag: ${tag}`)
    }
  }

  // Array
  if (Array.isArray(structure)) {
    return validateArray(structure)
  }

  // Lazy evaluated
  if (typeof structure === 'function') {
    // Fingers crossed
    const lazy = structure as () => unknown
    return (value: unknown): value is StructureType<T> => {
      let predicate = lazyCache.get(lazy as () => unknown)
      if (!predicate) {
        predicate = validate<unknown>(structure())
        lazyCache.set(lazy, predicate)
      }
      return predicate(value)
    }
  }

  // Object
  return validateObject(structure)
}