import { go } from 'connected-react-router'
import React, { useCallback } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { GameState, SessionState } from '../../../game/resources'
import { CharacterCard } from '../../../game/rules'
import { ClientSocket } from '../../ClientSocket'
import CharacterDetails from '../../components/CharacterDetails'
import { toSelectCharacterDetailPage } from '../../paths'
import { useDispatch, useSelector } from '../../store'
import useCards from '../../util/useCards'
import { withVisualState } from '../../util/withVisualState'

type ZoomState = 'list' | 'detail'

const ListZoomState = withVisualState('div', (state: ZoomState) => state)

const CharacterListDetail: React.FC<{
  characterId: string | null
  characters: CharacterCard[]
  onSelectCharacter: (characterId: string) => unknown
}> = ({ characterId, characters, onSelectCharacter }) => {
  const character = characters.find((c) => c.id === characterId)

  return (
    <>
      {character && <CharacterDetails character={character} />}
      <div>
        <button onClick={() => characterId && onSelectCharacter(characterId)}>
          Select
        </button>
      </div>
    </>
  )
}

const PageTitle = styled.h1`
  margin-top: 0;
`

const CharacterList: React.FC<{
  game: GameState
  characters: CharacterCard[]
}> = ({ characters, game }) => {
  return (
    <>
      <PageTitle>Characters</PageTitle>
      <ul>
        {characters.map(({ id, name }) => (
          <li>
            <Link to={toSelectCharacterDetailPage(game.id, id)}>{name}</Link>
          </li>
        ))}
      </ul>
    </>
  )
}

const CharacterSelectionContainer: React.FC<{
  game: GameState
  socket: ClientSocket
  session: SessionState
  characterId?: string | null
}> = ({ game, session, socket, characterId = null }) => {
  const zoomState = characterId ? 'detail' : 'list'
  const content = useSelector((state) => state.content.sets)
  const dispatch = useDispatch()

  const characters = useCards(['character'], game.contentSetIds, content)

  const onSelectCharacter = useCallback(
    (characterId: string) => {
      const isSelected = Object.values(game.players)
        .map((p) => p.characterId)
        .includes(characterId)
      const oldCharacterId = game.players[session.id].characterId || null
      if (!isSelected) {
        socket.send({
          type: 'action',
          action: {
            type: 'switch-character',
            playerId: session.id,
            newCharacter: characterId,
            oldCharacter: oldCharacterId,
          },
        })
      }
      dispatch(go(-2)) // FIXME: reliably go back to "lobby"
    },
    [socket, game, session],
  )

  return (
    <ListZoomState state={zoomState}>
      {({ state, from, to }) => {
        const states = [state, from, to]

        const viewDetailed = states.includes('detail')
        const viewList = states.includes('list')

        return (
          <>
            {viewDetailed && (
              <CharacterListDetail
                characterId={characterId}
                characters={characters}
                onSelectCharacter={onSelectCharacter}
              />
            )}
            {viewList && <CharacterList game={game} characters={characters} />}
          </>
        )
      }}
    </ListZoomState>
  )
}

export default CharacterSelectionContainer
