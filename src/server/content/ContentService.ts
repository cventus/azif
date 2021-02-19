import { Card } from '../../game/rules'
import { inject } from '../../inject'

export interface ContentSet {
  id: string
  name: string
  description: string
  cards: Card[]
}

export interface ContentService {
  getSet(setId: string): Promise<ContentSet | undefined>
  listSets(setId: string): Promise<Omit<ContentSet, 'cards'>[] | undefined>
}

export const ContentService = inject<ContentService>()
