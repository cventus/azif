import { useMemo } from 'react'
import { ContentSet } from '../../game/resources'
import { Card, CardType } from '../../game/rules'

const compareCards = (a: Card, b: Card): number => a.name.localeCompare(b.name)

const useCards = <T extends CardType>(
  types: T[],
  contentSetIds: string[],
  content: Record<string, ContentSet>,
): (Card & { type: T })[] => {
  type Result = Card & { type: T }
  return useMemo<Result[]>(
    () =>
      contentSetIds
        .reduce<Result[]>((acc, id) => {
          if (content[id]) {
            return [
              ...acc,
              ...Object.values(
                content[id].cards,
              ).filter((card: Card): card is Result =>
                (types as CardType[]).includes(card.type),
              ),
            ]
          } else {
            return acc
          }
        }, [])
        .sort(compareCards),
    [...contentSetIds, content, ...types],
  )
}

export default useCards
