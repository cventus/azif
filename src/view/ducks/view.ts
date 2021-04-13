import { Reducer } from 'redux'
import { Action } from './actions'
import { History, Location } from 'history'

import { LOCATION_CHANGE } from 'connected-react-router'
import {
  isFrontPage,
  isGameCharactersPage,
  isGameEventsPage,
  isGamesPage,
  isNewGamePage,
  isSettingsPage,
} from '../paths'

interface FrontPage {
  pageId: 'front'
}

interface GamesPage {
  pageId: 'games'
}

interface NewGamePage {
  pageId: 'new-game'
}

interface SettingsPage {
  pageId: 'settings'
}

interface GameEventsPage {
  pageId: 'game'
  subPageId: 'events'
  gameId: string
}

interface GameCharacterPage {
  pageId: 'game'
  subPageId: 'character'
  gameId: string
  characterId: string
}

export type Page =
  | FrontPage
  | GamesPage
  | NewGamePage
  | SettingsPage
  | GameEventsPage
  | GameCharacterPage

function getPage(location: Location): Page | undefined {
  const path = location.pathname

  if (isFrontPage(path)) {
    return { pageId: 'front' }
  }
  if (isGamesPage(path)) {
    return { pageId: 'games' }
  }
  if (isNewGamePage(path)) {
    return { pageId: 'new-game' }
  }
  if (isSettingsPage(path)) {
    return { pageId: 'settings' }
  }
  const gameEvents = isGameEventsPage(path)
  if (gameEvents) {
    const [gameId] = gameEvents
    return { pageId: 'game', subPageId: 'events', gameId }
  }
  const gameCharacter = isGameCharactersPage(path)
  if (gameCharacter) {
    const [gameId, characterId] = gameCharacter
    return { pageId: 'game', subPageId: 'character', gameId, characterId }
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
