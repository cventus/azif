export function hasErrorCode(e: unknown): e is Record<'code', string> {
  if (e === null) return false
  if (typeof e !== 'object') return false
  return true
}

export function isFailedConditionalCheck(e: unknown) {
  return hasErrorCode(e) && e.code === 'ConditionalCheckFailedException'
}

export function isTransactionCanceled(e: unknown) {
  return hasErrorCode(e) && e.code === 'TransactionCanceledException'
}

export function expressionNames(...names: string[]): Record<string, string> {
  return names.reduce(
    (result, name) => ({
      ...result,
      ['#' + name]: name,
    }),
    {},
  )
}

export interface Page<Item, Token> {
  results: Item[]
  token?: Token
}
