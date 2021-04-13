import { Reducer } from 'redux'
import { ContentSet, ContentSetPreview } from '../../game/resources'
import { Action } from './actions'

export interface ContentState {
  previews?: ContentSetPreview[]
  sets: Record<string, ContentSet>
}

const defaultState: ContentState = {
  sets: {},
}

const reducer: Reducer<ContentState, Action> = (
  state = defaultState,
  action: Action = { type: undefined },
) => {
  switch (action.type) {
    case 'connection/response': {
      if (action.status === 'ok') {
        const { response } = action
        if (response.type === 'get') {
          if (response.resource === 'content-set') {
            const set = response.content
            return {
              ...state,
              sets: {
                ...state.sets,
                [set.id]: set,
              },
            }
          } else if (response.resource === 'content-list') {
            return {
              ...state,
              previews: response.list,
            }
          }
        }
        return state
      }
    }

    default:
      return state
  }
}

export default reducer
