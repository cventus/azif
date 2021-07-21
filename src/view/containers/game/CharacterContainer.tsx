import React from 'react'
import { GameState, SessionState } from '../../../game/resources'
import { ClientSocket } from '../../ClientSocket'

export const CharacterContainer: React.FC<{
  game: GameState
  socket: ClientSocket
  session: SessionState
}> = ({}) => {
  return <div></div>
}

export default CharacterContainer
