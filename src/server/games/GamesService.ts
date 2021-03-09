import { Facing } from '../../game/actions'
import { GameState, PlayerState } from '../../game/resources'
import { inject } from '../../inject'
import { User } from '../users'

export type PartialPlayerState = Omit<PlayerState, 'name'>
export type PartialGameState =
  & Omit<GameState, 'players'>
  & { players: Record<string, PartialPlayerState> }

export function makeGameState(
  partialState: PartialGameState,
  users: User[],
): GameState {
  const players = Object.entries(partialState.players).reduce((acc, [playerId, partialPlayer]) => {
    const player: PlayerState = {
      ...partialPlayer,
      name: users.find(({ id }) => id === playerId)?.name || '',
    }
    return {
      ...acc,
      [playerId]: player,
    }
  }, {} as Record<string, PlayerState>)

  return {
    ...partialState,
    players
  }
}

export type Failure = 'failure'

export interface GamesService {
  createGame(name: string, contentSetIds: string[]): Promise<PartialGameState>
  getGame(gameId: string): Promise<PartialGameState | undefined>
  startGame(gameId: string): Promise<PartialGameState | Failure>
  endGame(gameId: string): Promise<PartialGameState | Failure>

  // Increment game clock
  tick(gameId: string):  Promise<PartialGameState | Failure>

  // Player management
  addPlayer(gameId: string, playerId: string): Promise<PartialGameState | Failure>
  removePlayer(gameId: string, playerId: string): Promise<PartialGameState | Failure>

  switchCharacter(
    gameId: string,
    playerId: string,
    fromCharacterId: string | null,
    toCharacterId: string,
  ): Promise<PartialGameState | Failure>

  // Game changes
  addClues(
    gameId: string,
    characterId: string,
    cluesDelta: number,
  ): Promise<PartialGameState | Failure>
  addCard(
    gameId: string,
    characterId: string,
    cardId: string,
  ): Promise<PartialGameState | Failure>
  moveCard(
    gameId: string,
    fromCharacterId: string,
    toCharacterId: string,
    cardId: string,
  ): Promise<PartialGameState | Failure>
  removeCard(gameId: string, cardId: string): Promise<PartialGameState | Failure>
  setCardFacing(
    gameId: string,
    cardId: string,
    facing: Facing,
  ): Promise<PartialGameState | Failure>
}

export const GamesService = inject<GamesService>()
