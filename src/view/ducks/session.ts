import { Reducer } from 'redux'
import { SessionState } from '../../game/resources'
import { Action } from './actions'

const reducer: Reducer<{ state?: SessionState }, Action> = (
  state = {},
  action = { type: undefined },
) => {
  if (action.type !== 'connection/response' || action.status !== 'ok') {
    return state
  }

  const { request, response } = action

  switch (response.type) {
    case 'login':
      return { state: response.session }

    case 'success':
      if (request.type === 'logout') {
        return {}
      }
  }

  return state
}

export default reducer
