import { inject } from "../../inject";

export type GameState = 'starting' | 'on-going' | 'over'

export interface Player {
  userId: string
  characterId: string
}

export interface CharacterState {
  cardIds: string[]
  clues: number
}

export interface Game {
  id: string
  name: string
  state: GameState
  contentSetIds: string[]
  numberOfPlayers: number
  players: Player[]
  socketIds: string[]
  characterStates: Record<string, CharacterState>
  flippedCardIds: string[]
}

export type StartGameStatus = 'ok' | 'already-started' | 'awaiting-players' | 'players-not-ready' | 'game-not-found'

export type EndGameStatus = 'ok' | 'already-ended' | 'game-not-found'

export type AddPlayerStatus = 'ok' | 'already-added' | 'player-not-found' | 'game-not-found'

export type RemovePlayerStatus = 'ok' | 'not-a-member' | 'player-not-found' | 'game-not-found'

export interface GamesService {
  createGame(name: string, numberOfPlayers: number, contentSetIds: string[]): Promise<Game>
  getGame(gameId: string): Promise<Game | undefined>
  startGame(gameId: string): Promise<StartGameStatus>
  endGame(gameId: string): Promise<EndGameStatus>
  addPlayer(gameId: string, playerId: string): Promise<AddPlayerStatus>
  removePlayer(gameId: string, playerId: string): Promise<RemovePlayerStatus>
  addClues(gameId: string, playerId: string, clues: number): Promise<void>
  addCard(gameId: string, playerId: string, cardId: string): Promise<void>
  removeCard(gameId: string, playerId: string, cardId: string): Promise<void>
  flipCard(gameId: string, playerId: string, cardId: string, isFlipped?: boolean): Promise<void>
}

export const GamesService = inject<GamesService>()
