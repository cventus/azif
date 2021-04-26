import React, { ChangeEvent, FormEvent, SyntheticEvent, useCallback, useMemo, useState } from 'react'
import { ContentSet, GameState, SessionState } from '../../game/resources'
import { Card, CharacterCard } from '../../game/rules'
import styled from 'styled-components'

const compareCharacters =
  (a: CharacterCard, b: CharacterCard): number => a.name.localeCompare(b.name)

const CharacterSelectionList: React.FC<{
  game: GameState
  session: SessionState
  content: Record<string, ContentSet>
  onSelectCharacter?: (characterId: string) => unknown
}> = ({ game, session, content, onSelectCharacter }) => {

  const characters = useMemo<CharacterCard[]>(
    () => game.contentSetIds
      .reduce<CharacterCard[]>((acc, id) => {
        if (content[id]) {
          const foo = Object.values(content[id].cards)
            .filter((card: Card): card is CharacterCard => card.type === 'character')
          return [...acc, ...foo]
        } else {
          return acc
        }
      },
      []
      )
      .sort(compareCharacters),
      [game.contentSetIds, content],
  )

  const [focusedCharId, setFocusedCharId] = useState(characters[0].id)

  const characterPlayedBy =
    Object.entries(game.players).reduce<Record<string, string>>(
      (acc, [playerId, { characterId }]) => {
        if (characterId) {
          return { ...acc, [characterId]: playerId }
        } else {
          return acc
        }
      },
      {}
    )

  const onFocusCharacter = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const characterId = e.target.value
    if (characterId) {
      setFocusedCharId(characterId)
    }
  }, [setFocusedCharId])

  // Attempt to choose the current character
  const selectCharacter = useCallback((e: SyntheticEvent) => {
    e.preventDefault()
    if (onSelectCharacter) {
      onSelectCharacter(focusedCharId)
    }
  }, [onSelectCharacter, focusedCharId])

  const options = characters.map((character, i) => {
    const playerId = characterPlayedBy[character.id]
    const playerName = playerId ? game.players[playerId].name : null

    return (
        <label key={character.id}>
            <input
              name="character"
              type="radio"
              value={character.id}
              onChange={onFocusCharacter}
              defaultChecked={i === 0}
            />
          <div>
            {character.name}
          </div>
          <div><i>{character.title}</i></div>
          { playerName && <div>{playerName}</div> }
        </label>
    )
  })

  const current = characters.find((c) => c.id === focusedCharId) || characters[0]

  return (
    <CharacterContainer>
      <CharacterList>
        <form onSubmit={selectCharacter}>
          {options}
        </form>
      </CharacterList>
      <CharacterInfo>
        <h1>{current.name}</h1>
        <p>{current.title}</p>
        <h3>Story</h3>
        <section>
          {current.story.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        </section>
        <h3>Special Ability</h3>
        <section>
          {current.specialAbility.description?.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          {current.specialAbility.action && <p>
            <b>Action:</b>
            {current.specialAbility.action.map((text, i) => <>{' '}<span key={i}>{text}</span></>)}
          </p>}
        </section>
        <h3>Abilities</h3>
        <section>
          <table>
            <tbody>
              <tr>
                <th>Agility</th>
                <td>{current.abilities.agility}</td>
              </tr>
              <tr>
                <th>Observation</th>
                <td>{current.abilities.observation}</td>
              </tr>
              <tr>
                <th>Influence</th>
                <td>{current.abilities.influence}</td>
              </tr>
              <tr>
                <th>Stregth</th>
                <td>{current.abilities.strength}</td>
              </tr>
              <tr>
                <th>Lore</th>
                <td>{current.abilities.lore}</td>
              </tr>
              <tr>
                <th>Will</th>
                <td>{current.abilities.will}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <button
          disabled={Boolean(characterPlayedBy[current.id])}
          onClick={selectCharacter}
        >
          Play as {current.name}
        </button>
      </CharacterInfo>
    </CharacterContainer>
  )
}

export default CharacterSelectionList

const CharacterContainer = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
`

const CharacterList = styled.div`
  width: 50%;
`

const CharacterInfo = styled.div`
  width: 50%;
`
