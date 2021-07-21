import React, { useCallback } from 'react'
import { GameState, SessionState } from '../../../game/resources'
import { ClientSocket } from '../../ClientSocket'

const CharacterSelectionContainer: React.FC<{
  game: GameState
  socket: ClientSocket
  session: SessionState
}> = ({ game, session, socket }) => {
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
    },
    [socket, game, session],
  )

  return null
}

export default CharacterSelectionContainer
