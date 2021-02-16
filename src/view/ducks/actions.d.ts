import { content } from './content'
import { connection } from './connection'
import { messages } from './messages'
import { game } from './game'
import { LocationChangeAction } from 'connected-react-router'

type ActionTypesOf<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<string, (...args: any[]) => Record<string, unknown>>
> = ReturnType<T[keyof T]>

export type Action =
  | { type: undefined }
  | ActionTypesOf<typeof connection>
  | ActionTypesOf<typeof content>
  | ActionTypesOf<typeof messages>
  | ActionTypesOf<typeof game>
  | LocationChangeAction
