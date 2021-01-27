import { combineReducers } from 'redux'

// export action creators
export { content } from './content'
export { game } from './game'
export { messages } from './messages'

import content from './content'
import game from './game'
import messages from './messages'

export default combineReducers({
  content,
  game,
  messages,
})
