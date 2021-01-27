import { combineReducers } from 'redux'
import { History } from 'history'
import { connectRouter } from 'connected-react-router'

// export action creators
export { content } from './content'
export { game } from './game'
export { messages } from './messages'

import content from './content'
import game from './game'
import messages from './messages'

export default (history: History) => combineReducers({
  router: connectRouter(history),
  content,
  game,
  messages,
})
