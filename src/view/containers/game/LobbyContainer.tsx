import { push, replace } from 'connected-react-router'
import React, { useCallback } from 'react'
import { ContentSet, GameState, SessionState } from '../../../game/resources'
import { ClientSocket } from '../../ClientSocket'
import {
  toGameEventsPage,
  toGamePage,
  toSelectCharacterPage,
} from '../../paths'
import { useDispatch, useSelector } from '../../store'
import { Text } from '../../components/Text'
import useCards from '../../util/useCards'
import styled from 'styled-components'

const baseUrl = window.location.protocol + '//' + window.location.host

const PlayerList: React.FC<{
  game: GameState
  session: SessionState
  content: Record<string, ContentSet>
  onSelectCharacter: () => void
}> = ({ game, session, content, onSelectCharacter }) => {
  const characterCards = useCards(['character'], game.contentSetIds, content)
  const playerEntries = Object.entries(game.players).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name),
  )
  return (
    <ul>
      {playerEntries.map(([id, { name }]) => {
        const characterId = game.players[id].characterId

        const characterCard = characterCards.find((c) => c.id === characterId)

        return (
          <li key={id}>
            {name}
            {characterCard && characterCard.name}
            {id === session.id && (
              <button onClick={onSelectCharacter}>
                {characterId ? 'Switch character' : 'Select character'}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const PageTitle = styled.h1`
  margin-top: 0;
`

const LobbyContainer: React.FC<{
  game: GameState
  socket: ClientSocket
  session: SessionState
}> = ({ game, socket, session }) => {
  const link = baseUrl + toGamePage(game.id)
  const dispatch = useDispatch()
  const content = useSelector((state) => state.content.sets)

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(link)
  }, [link])

  const selectCharacter = useCallback(() => {
    dispatch(push(toSelectCharacterPage(game.id)))
  }, [dispatch, game.id])

  const onStartGame = useCallback(() => {
    socket.send({
      type: 'action',
      action: {
        type: 'start-game',
      },
    })
    dispatch(replace(toGameEventsPage(game.id)))
  }, [socket, dispatch])

  const canStartGame = Object.values(game.players).every((p) => p.characterId)

  return (
    <>
      <PageTitle>{game.name}</PageTitle>
      <p>Game ID: {game.id}</p>
      <p>
        Share link: {link} <button onClick={copyToClipboard}>Copy</button>
      </p>
      <h2>Players</h2>
      <PlayerList
        game={game}
        session={session}
        content={content}
        onSelectCharacter={selectCharacter}
      />
      <button onClick={onStartGame} disabled={!canStartGame}>
        Start
      </button>
      {!canStartGame && (
        <p>
          <Text ui secondary>
            Waiting for characters to be selected
          </Text>
        </p>
      )}
    </>
  )
}

export default LobbyContainer
