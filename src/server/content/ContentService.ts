import { ContentSet, ContentSetPreview } from '../../game/resources'
import { inject } from '../../inject'

export interface ContentService {
  get(setId: string): Promise<ContentSet | undefined>
  list(): Promise<ContentSetPreview[]>
}

export const ContentService = inject<ContentService>()
