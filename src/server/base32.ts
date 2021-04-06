// Crockford's base-32
const symbols = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'J',
  'K',
  'M',
  'N',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'V',
  'W',
  'X',
  'Y',
  'Z',
]

export function encodeBase32(buffer: Buffer) {
  let result = ''

  let n = 0
  let char = 0

  const addBit = (state: boolean) => {
    char <<= 1
    if (state) {
      char |= 1
    }
    n++
    if (n == 5) {
      result += symbols[char]
      char = 0
      n = 0
    }
  }

  for (let i = 0; i < buffer.length; i++) {
    const next = buffer[i]

    for (let j = 0x80; j > 0; j >>= 1) {
      addBit(Boolean(next & j))
    }
  }
  if (n > 0) {
    for (let j = n; j < 5; j++) {
      addBit(false)
    }
  }

  return result
}

export function normalizeBase32(n: string): string {
  return n
    .toUpperCase()
    .replace(/[Oo]/g, '0')
    .replace(/[iIlL]/g, '1')
    .replace(/[-]/g, '')
}
