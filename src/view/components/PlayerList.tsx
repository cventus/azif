import React, { useCallback } from 'react'
import { GameState } from '../../game/resources'
import { toGamePage } from '../paths'

const baseUrl = window.location.protocol + '//' + window.location.host

const PlayerList: React.FC<{
  game: GameState
}> = ({ game }) => {

  const link = baseUrl + toGamePage(game.id)

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(link)
  }, [link])

  const playerEntries = Object
    .entries(game.players)
    .sort(([, a], [, b]) => a.name.localeCompare(b.name))

  return (
    <>
      <p>
        Share link: {link} <button onClick={copyToClipboard}>Copy</button>
      </p>
      <p>
        Players
      </p>
      <ul>
        {playerEntries.map(([id, { name }]) => <li key={id}>{ name }</li>)}
      </ul>
    </>
  )
}

export default PlayerList
