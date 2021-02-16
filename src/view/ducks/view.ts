import { Reducer } from 'redux'
import { Action } from './actions'
import { History, Location } from 'history'

import { LOCATION_CHANGE } from 'connected-react-router'
import {
  isFrontPage,
  isGameCharactersPage,
  isGameEventsPage,
  isGamesPage,
  isSettingsPage,
} from '../paths'

interface FrontPage {
  pageId: 'front'
}

interface GamesPage {
  pageId: 'games'
}

interface SettingsPage {
  pageId: 'settings'
}

interface GameEventsPage {
  pageId: 'game-events'
  gameId: string
}

interface GameCharacterPage {
  pageId: 'game-character'
  gameId: string
  characterId: string
}

type Page =
  | FrontPage
  | GamesPage
  | SettingsPage
  | GameEventsPage
  | GameCharacterPage

function getPage(location: Location): Page | undefined {
  const path = location.pathname
  console.log('location', location)
  if (isFrontPage(path)) {
    return { pageId: 'front' }
  }
  if (isGamesPage(path)) {
    return { pageId: 'games' }
  }
  if (isSettingsPage(path)) {
    return { pageId: 'settings' }
  }
  const gameEvents = isGameEventsPage(path)
  if (gameEvents) {
    const [gameId] = gameEvents
    return { pageId: 'game-events', gameId }
  }
  const gameCharacter = isGameCharactersPage(path)
  if (gameCharacter) {
    const [gameId, characterId] = gameCharacter
    return { pageId: 'game-character', gameId, characterId }
  }
  return undefined
}

export interface ViewState {
  page: Page | undefined
}

export const createReducer: (history: History) => Reducer<ViewState, Action> = (
  history: History,
) => (
  state = { page: getPage(history.location) },
  action: Action = { type: undefined },
) => {
  switch (action.type) {
    case LOCATION_CHANGE:
      return {
        page: getPage(action.payload.location),
      }
    default:
      return state
  }
}

export default createReducer
