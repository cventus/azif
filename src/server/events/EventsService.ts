import { GameEvent } from '../../game/resources'
import { inject } from '../../inject'

interface ListEventsOptions {
  since?: number
  until?: number
}

export interface EventsService {
  get(gameId: string, clock: number): Promise<GameEvent | undefined>
  write(event: GameEvent): Promise<GameEvent>
  list(gameId: string, options?: ListEventsOptions): Promise<GameEvent[]>
}

export const EventsService = inject<EventsService>()
