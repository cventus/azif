import { readLoggerLevels } from './LoggerService'

describe('readLoggerLevels()', () => {
  it('should parse a key-value config', () => {
    const config = readLoggerLevels('foo=info')
    expect(config).toEqual({ foo: 'info' })
  })

  it('should parse key-values separated by commas', () => {
    const config = readLoggerLevels('foo=info,bar=debug,baz=fatal')
    expect(config).toEqual({ foo: 'info', bar: 'debug', baz: 'fatal' })
  })

  it('should insensitive to whitespace', () => {
    const config = readLoggerLevels('foo = info,\nbar=debug ,\n baz=fatal')
    expect(config).toEqual({ foo: 'info', bar: 'debug', baz: 'fatal' })
  })

  it('should ignore invalid log levels', () => {
    const config = readLoggerLevels('foo=hello')
    expect(config).toEqual({})
  })
})
