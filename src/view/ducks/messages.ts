import { defineActions } from './lib'
import { Action } from './actions'
import { Reducer } from 'redux'
import { DieRoll } from '../../game/dice'

export const messages = defineActions('messages', {
  add: (message: Message) => ({ message }),
  remove: (messageId: Message['id']) => ({ messageId }),
})

interface MessageCommon {
  id: string
  author: string
  time: string
}

export interface DieRollMessage extends MessageCommon {
  type: 'roll'
  roll: DieRoll[]
}

export interface ChatMessage extends MessageCommon {
  type: 'chat'
  text: string
}

export type Message = DieRollMessage | ChatMessage

export interface MessageState {
  messages: Message[]
}

const defaultState: MessageState = {
  messages: [],
}

const reducer: Reducer<MessageState, Action> = (
  state = defaultState,
  action = { type: undefined },
) => {
  switch (action.type) {
    case 'messages/add':
      return {
        messages: [action.message, ...state.messages],
      }

    case 'messages/remove':
      return {
        messages: state.messages.filter((msg) => msg.id !== action.messageId),
      }

    default:
      return state
  }
}

export default reducer
