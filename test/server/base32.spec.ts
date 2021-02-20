import { encodeBase32, normalizeBase32 } from '../../src/server/base32'

describe('encodeBase32()', () => {
  it('should encode "1" to "64"', async () => {
    expect(encodeBase32(Buffer.from('1'))).toBe('64')
  })

  it('should encode "12" to "64S0"', async () => {
    expect(encodeBase32(Buffer.from('12'))).toBe('64S0')
  })

  it('should encode "123" to "64S36"', async () => {
    expect(encodeBase32(Buffer.from('123'))).toBe('64S36')
  })

  it('should encode "1234" to "64S36D0"', async () => {
    expect(encodeBase32(Buffer.from('1234'))).toBe('64S36D0')
  })

  it('should encode "abcde" to "C5H66S35"', async () => {
    expect(encodeBase32(Buffer.from('abcde'))).toBe('C5H66S35')
  })

  it('should encode "abcdef" to "C5H66S35CR"', async () => {
    expect(encodeBase32(Buffer.from('abcdef'))).toBe('C5H66S35CR')
  })

  it('should encode "hello world" to D1JPRV3F5GG7EVVJDHJ0', async () => {
    expect(encodeBase32(Buffer.from('hello, world'))).toBe(
      'D1JPRV3F5GG7EVVJDHJ0',
    )
  })
})

describe('normalizeBase32()', () => {
  it('should make upper case', async () => {
    expect(normalizeBase32('abc')).toBe('ABC')
  })

  it('should replace "LlIi" with ones', async () => {
    expect(normalizeBase32('blindBLIND')).toBe('B11NDB11ND')
  })

  it('should replace "Oo" with zeores', async () => {
    expect(normalizeBase32('whoaWHOA')).toBe('WH0AWH0A')
  })

  it('should remove hyphens', async () => {
    expect(normalizeBase32('123-456-789')).toBe('123456789')
  })
})
