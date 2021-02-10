import { combineReducers } from 'redux'
import { History } from 'history'
import { connectRouter } from 'connected-react-router'

// import reducers
import content from './content'
import game from './game'
import messages from './messages'
import connection from './connection'

// export action creators
export { content } from './content'
export { game } from './game'
export { messages } from './messages'
export { connection } from './connection'

export default (history: History) =>
  combineReducers({
    router: connectRouter(history),
    connection,
    content,
    game,
    messages,
  })
