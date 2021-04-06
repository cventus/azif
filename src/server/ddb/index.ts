import type { DynamoDB } from 'aws-sdk'

export type TransactWriteItem = DynamoDB.DocumentClient.TransactWriteItem
export type Put = DynamoDB.DocumentClient.Put
export type Get = DynamoDB.DocumentClient.Get
export type Update = DynamoDB.DocumentClient.Update
export type Delete = DynamoDB.DocumentClient.Delete
export type DynamoDbSet = DynamoDB.DocumentClient.DynamoDbSet

export { DocumentClient, DynamoDB } from './DocumentClient'

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

export const ttl = (ttl: number): number => {
  const epoch = new Date().valueOf() / 1000
  return Math.ceil(epoch + Math.max(ttl, 0))
}

export interface Page<Item, Token> {
  results: Item[]
  token?: Token
}
