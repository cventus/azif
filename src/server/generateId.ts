import crypto from 'crypto'
import { promisify } from 'util'
import { encodeBase32 } from './base32'

export const randomBytes = promisify(crypto.randomBytes)

// Generate ID with 50 random bits
export const generateId = async (): Promise<string> => {
  const buf = await randomBytes(7) // 7 bytes = 56 bits
  return encodeBase32(buf).substr(0, 10)
}
