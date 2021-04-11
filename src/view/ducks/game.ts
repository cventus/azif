import { Reducer } from 'redux'
import { GameState } from '../../game/resources'
import { Action } from './actions'

export type GamesState = {
  current: string | null,
  games: Record<string, GameState>
}

const defaultState: GamesState = {
  current: null,
  games: {},
}

const updateGame = (state: GamesState, game: GameState): GamesState => {
  const currentGame = state.games[game.id]
  if (!currentGame || currentGame.clock < game.clock) {
    return {
      ...state,
      games: {
        ...state.games,
        [game.id]: game,
      }
    }
  } else {
    return state
  }
}

const reducer: Reducer<GamesState, Action> = (
  state = defaultState,
  action = { type: undefined },
) => {
  switch (action.type) {
    case 'connection/response':
      if (action.status === 'ok') {
        switch (action.response.type) {
          case 'get':
            if (action.response.resource !== 'game') {
              return state
            }

          case 'create-game':
          case 'game-update':
            return updateGame(state, action.response.game)

        }
      }
      return state

    case 'connection/notification':
      if (action.notification.type === 'game-event') {
        return updateGame(state, action.notification.game)
      }
      return state

    default:
      return state
  }
}

export default reducer
