import {
  Intersection,
  Literal,
  Optional,
  StructureType,
  Tuple,
  Union,
  validate,
} from '../src/structure'

declare const foo: unknown

describe('validate', () => {
  it('should validate booleans', () => {
    const isBoolean = validate(Boolean)

    expect(isBoolean(42)).toBe(false)
    expect(isBoolean(43)).toBe(false)
    expect(isBoolean(true)).toBe(true)
    expect(isBoolean(false)).toBe(true)
    expect(isBoolean(null)).toBe(false)
    expect(isBoolean('hello, world')).toBe(false)
  })

  it('should validate literal booleans', () => {
    const isFalse = validate(Literal(false))

    expect(isFalse(42)).toBe(false)
    expect(isFalse(false)).toBe(true)
    expect(isFalse(true)).toBe(false)
    expect(isFalse(null)).toBe(false)
    expect(isFalse('hello, world')).toBe(false)
  })

  it('should validate numbers', () => {
    const isNumber = validate(Number)

    expect(isNumber(42)).toBe(true)
    expect(isNumber(43)).toBe(true)
    expect(isNumber(true)).toBe(false)
    expect(isNumber(null)).toBe(false)
    expect(isNumber('hello, world')).toBe(false)
  })

  it('should validate literal numbers', () => {
    const is42 = validate(Literal(42))

    expect(is42(42)).toBe(true)
    expect(is42(43)).toBe(false)
    expect(is42(true)).toBe(false)
    expect(is42(null)).toBe(false)
    expect(is42('hello, world')).toBe(false)
  })

  it('should validate strings', () => {
    const isString = validate(String)

    expect(isString(42)).toBe(false)
    expect(isString(null)).toBe(false)
    expect(isString(true)).toBe(false)
    expect(isString('hello')).toBe(true)
    expect(isString('hello, world')).toBe(true)
  })

  it('should validate literal strings', () => {
    const isHello = validate(Literal('hello'))

    expect(isHello(42)).toBe(false)
    expect(isHello(null)).toBe(false)
    expect(isHello(true)).toBe(false)
    expect(isHello('hello')).toBe(true)
    expect(isHello('hello, world')).toBe(false)
  })

  it('should validate type unions', () => {
    const isUnion = validate(Union(Number, Literal('hello')))

    expect(isUnion(42)).toBe(true)
    expect(isUnion(null)).toBe(false)
    expect(isUnion(true)).toBe(false)
    expect(isUnion('hello')).toBe(true)
    expect(isUnion('hello, world')).toBe(false)
  })

  it('should validate type intersections', () => {
    const isIntersection = validate(
      Intersection({ height: Number }, { width: Number }, { unit: String }),
    )

    expect(isIntersection({ width: 2 })).toBe(false)
    expect(isIntersection({ height: 4 })).toBe(false)
    expect(isIntersection({ unit: 'in' })).toBe(false)
    expect(isIntersection({ width: 2, height: 4 })).toBe(false)
    expect(isIntersection({ height: 4, unit: 'in' })).toBe(false)
    expect(isIntersection({ width: '2', height: '4', unit: 'in' })).toBe(false)

    expect(isIntersection({ width: 2, height: 4, unit: 'in' })).toBe(true)

    expect(isIntersection(42)).toBe(false)
    expect(isIntersection(null)).toBe(false)
    expect(isIntersection(true)).toBe(false)
    expect(isIntersection('hello')).toBe(false)
    expect(isIntersection('hello, world')).toBe(false)
  })

  it('should validate tuples', () => {
    const isTuple = validate(Tuple(Number, Boolean))

    expect(isTuple([42, false])).toBe(true)
    expect(isTuple([42, false, 'matching prefix is enough'])).toBe(true)
    expect(isTuple(null)).toBe(false)
    expect(isTuple(['hello', true])).toBe(false)
    expect(isTuple('hello')).toBe(false)
    expect(isTuple([])).toBe(false)
  })

  it('should validate arrays', () => {
    const isArrayOfNumbers = validate(Array(Number))

    expect(isArrayOfNumbers([])).toBe(true)
    expect(isArrayOfNumbers([1])).toBe(true)
    expect(isArrayOfNumbers([1, 2, 3])).toBe(true)
    expect(isArrayOfNumbers([1, 2, 3, 'hello'])).toBe(false)
    expect(isArrayOfNumbers(null)).toBe(false)
    expect(isArrayOfNumbers(['hello', true])).toBe(false)
    expect(isArrayOfNumbers('hello')).toBe(false)
  })

  it('should validate objects', () => {
    const isObject = validate({
      type: Literal('type'),
      payload: Tuple(Number, Boolean),
    })

    expect(isObject({ type: 'type', payload: [42, false] })).toBe(true)
    expect(isObject([42, false, 'matching prefix is enough'])).toBe(false)
    expect(isObject(null)).toBe(false)
    expect(isObject(['hello', true])).toBe(false)
    expect(isObject('hello')).toBe(false)
    expect(isObject([])).toBe(false)
  })

  it('should validate objects with optional fields', () => {
    const isObject = validate({
      type: Literal('type'),
      payload: Optional(Tuple(Number, Boolean)),
    })

    expect(isObject({ type: 'type', payload: [42, false] })).toBe(true)
    expect(isObject({ type: 'type', payload: undefined })).toBe(true)
    expect(isObject({ type: 'type' })).toBe(true)

    expect(isObject({ type: 'type', payload: 'hello' })).toBe(false)
  })

  it('should validate recursive structure', () => {
    const node = {
      item: Number,
      next: () => Union(Literal(null), node),
    }
    const isList = validate(node)

    expect(isList({ item: 1, next: null })).toBe(true)
    expect(isList({ item: 1, next: { item: 2, next: null } })).toBe(true)
    expect(
      isList({ item: 1, next: { item: 2, next: { item: 3, next: null } } }),
    ).toBe(true)
    expect(isList({ item: 1, next: { item: 'hello', next: null } })).toBe(false)
    expect(isList(null)).toBe(false)
    expect(isList(['hello', true])).toBe(false)
    expect(isList('hello')).toBe(false)
    expect(isList([])).toBe(false)
  })
})
