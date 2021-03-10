import { ContentSet } from '../../game/resources'
import { inject } from '../../inject'

export type ContentSetPreview = Omit<ContentSet, 'cards'>

export interface ContentService {
  get(setId: string): Promise<ContentSet | undefined>
  list(): Promise<ContentSetPreview[]>
}

export const ContentService = inject<ContentService>()
