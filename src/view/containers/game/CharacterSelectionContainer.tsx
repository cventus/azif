import { go } from 'connected-react-router'
import React, { useCallback } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { GameState, SessionState } from '../../../game/resources'
import { CharacterCard } from '../../../game/rules'
import { ClientSocket } from '../../ClientSocket'
import CharacterDetails from '../../components/CharacterDetails'
import { toSelectCharacterDetailPage } from '../../paths'
import { useDispatch, useSelector } from '../../store'
import useCards from '../../util/useCards'
import useRecentValue from '../../util/useRecentValue'
import { withVisualState } from '../../util/withVisualState'

type ZoomState = 'list' | 'detail'

const nothing = keyframes`
  from {}
  to   {}
`

const fadeOutList = keyframes`
  from {
    transform: perspective(100vw) scale(1, 1);
    opacity: 1;
  }
  to {
    transform: scale(0.8, 0.8);
    opacity: 0;
  }
`

const zoomInDetail = keyframes`
  from {
    transform: perspective(100vw) rotateZ(10deg) scale(1.2, 1.2);
    opacity: 0;
  }
  to {
    transform: perspective(100vw) rotateZ(0deg) scale(1, 1);
    opacity: 1;
  }
`

const duration = '0.5s'

const ListZoom = styled.div`
  position: relative;

  &.TO_list,
  &.TO_detail {
    animation: ${duration} ${nothing};
    /*overflow: hidden;*/
  }

  &.STATE_list.TO_detail > .list-container,
  &.STATE_detail.TO_list > .list-container {
    transform-origin: center center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    animation: ${duration} ${fadeOutList} ease-in-out;
  }

  &.STATE_detail.TO_list > .list-container {
    animation-direction: reverse;
  }

  &.STATE_list.TO_detail > .detail-container,
  &.STATE_detail.TO_list > .detail-container {
    transform-origin: center center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    animation: ${duration} ${zoomInDetail} ease-in-out;
  }

  &.STATE_detail.TO_list > .detail-container {
    animation-direction: reverse;
  }

  & > .detail-container {
    margin-left: auto;
    margin-right: auto;
    max-width: 80ch;
  }
`

const ListZoomState = withVisualState(ListZoom, (state: ZoomState) => state)

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
  const recentCharacterId = useRecentValue(characterId)

  const characters = useCards(['character'], game.contentSetIds, content)

  const onSelectCharacter = useCallback(
    (newCharacterId: string) => {
      const isSelected = Object.values(game.players)
        .map((p) => p.characterId)
        .includes(newCharacterId)
      const oldCharacterId = game.players[session.id].characterId || null
      if (!isSelected) {
        socket.send({
          type: 'action',
          action: {
            type: 'switch-character',
            playerId: session.id,
            newCharacter: newCharacterId,
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
              <div className="detail-container">
                <CharacterListDetail
                  characterId={recentCharacterId}
                  characters={characters}
                  onSelectCharacter={onSelectCharacter}
                />
              </div>
            )}
            {viewList && (
              <div className="list-container">
                <CharacterList game={game} characters={characters} />
              </div>
            )}
          </>
        )
      }}
    </ListZoomState>
  )
}

export default CharacterSelectionContainer
