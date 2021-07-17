import { Reducer } from 'redux'
import { Action } from './actions'
import { History, Location } from 'history'

import { LOCATION_CHANGE } from 'connected-react-router'
import {
  isFrontPage,
  isGameCharactersPage,
  isGameEventsPage,
  isGameLobbyPage,
  isSelectCharacterPage,
  isSelectCharacterDetailPage,
  isGamePage,
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

interface GameStartPage {
  pageId: 'game'
  gameId: string
  subPageId: 'start'
}

interface GameLobbyPage {
  pageId: 'game'
  subPageId: 'lobby'
  gameId: string
}

interface GameSelectCharacterPage {
  pageId: 'game'
  subPageId: 'select-character'
  gameId: string
  characterId: string | null
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

export type GamePage =
  | GameStartPage
  | GameLobbyPage
  | GameSelectCharacterPage
  | GameEventsPage
  | GameCharacterPage

export type Page = FrontPage | GamesPage | NewGamePage | SettingsPage | GamePage

const matchPage = <T extends [...any[]]>(
  matcher: (path: string) => T | undefined,
  toPage: (...args: T) => Page,
) => (path: string): Page | undefined => {
  const match = matcher(path)
  if (match) {
    return toPage(...match)
  }
}

const pageMatchers = [
  matchPage(isFrontPage, () => ({ pageId: 'front' })),
  matchPage(isGamesPage, () => ({ pageId: 'games' })),
  matchPage(isNewGamePage, () => ({ pageId: 'new-game' })),
  matchPage(isSettingsPage, () => ({ pageId: 'settings' })),
  matchPage(isGameLobbyPage, (gameId) => ({
    pageId: 'game',
    subPageId: 'lobby',
    gameId,
  })),
  matchPage(isSelectCharacterPage, (gameId) => ({
    pageId: 'game',
    subPageId: 'select-character',
    gameId,
    characterId: null,
  })),
  matchPage(isSelectCharacterDetailPage, (gameId, characterId) => ({
    pageId: 'game',
    subPageId: 'select-character',
    gameId,
    characterId,
  })),
  matchPage(isGameEventsPage, (gameId) => ({
    pageId: 'game',
    subPageId: 'events',
    gameId,
  })),
  matchPage(isGameCharactersPage, (gameId, characterId) => ({
    pageId: 'game',
    subPageId: 'character',
    gameId,
    characterId,
  })),
  matchPage(isGamePage, (gameId) => ({
    pageId: 'game',
    subPageId: 'start',
    gameId,
  })),
]

function getPage(location: Location): Page | undefined {
  const path = location.pathname

  for (const matcher of pageMatchers) {
    const match = matcher(path)
    if (match) {
      return match
    }
  }
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
