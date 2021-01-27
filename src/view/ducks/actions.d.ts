import { content } from './content'
import { messages } from './messages'
import { game } from './game'

type ActionTypesOf<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<string, (...args: any[]) => Record<string, unknown>>
> = ReturnType<T[keyof T]>

export type Action =
  | { type: undefined }
  | ActionTypesOf<typeof content>
  | ActionTypesOf<typeof messages>
  | ActionTypesOf<typeof game>
