export function isFailedConditionalCheck(e: unknown) {
  if (e === null) return false
  if (typeof e !== 'object') return false
  const { code } = e as Record<'code', string>
  return code === 'ConditionalCheckFailedException'
}

export interface Page<Item, Token> {
  results: Item[]
  token?: Token
}
