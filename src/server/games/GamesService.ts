import { Facing } from '../../game/actions'
import { GamePhase } from '../../game/resources'
import { inject } from '../../inject'

export interface PlayerState {
  characterId?: string
}

export interface CharacterState {
  playerId: string
  cardIds: string[]
  clues: number
}

export interface GameState {
  id: string
  clock: number
  name: string
  phase: GamePhase
  createdAt: number
  contentSetIds: string[]
  players: Record<string, PlayerState>
  characters: Record<string, CharacterState>
  flippedCardIds: string[]
}

type Failure = 'failure'

export interface GamesService {
  createGame(name: string, contentSetIds: string[]): Promise<GameState>
  getGame(gameId: string): Promise<GameState | undefined>
  startGame(gameId: string): Promise<GameState | Failure>
  endGame(gameId: string): Promise<GameState | Failure>

  // Player management
  addPlayer(gameId: string, playerId: string): Promise<GameState | Failure>
  removePlayer(gameId: string, playerId: string): Promise<GameState | Failure>

  switchCharacter(
    gameId: string,
    playerId: string,
    fromCharacterId: string | null,
    toCharacterId: string,
  ): Promise<GameState | Failure>

  // Game changes
  addClues(
    gameId: string,
    characterId: string,
    cluesDelta: number,
  ): Promise<GameState | Failure>
  addCard(
    gameId: string,
    characterId: string,
    cardId: string,
  ): Promise<GameState | Failure>
  moveCard(
    gameId: string,
    fromCharacterId: string,
    toCharacterId: string,
    cardId: string,
  ): Promise<GameState | Failure>
  removeCard(gameId: string, cardId: string): Promise<GameState | Failure>
  setCardFacing(
    gameId: string,
    cardId: string,
    facing: Facing,
  ): Promise<GameState | Failure>
}

export const GamesService = inject<GamesService>()
