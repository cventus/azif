import React from 'react'
import { Link } from 'react-router-dom'
import { toGameEventsPage, toSettingsPage } from '../paths'

interface GamesContainerProps {}

export const GamesContainer: React.FC<GamesContainerProps> = ({}) => {
  return (
    <div>
      <nav>
        <ul>
          <li>Games</li>
          <li>
            <Link to={toSettingsPage()}>Settings</Link>
          </li>
        </ul>
      </nav>
      <main>
        <h1>Games</h1>
        <ol>
          <li>
            <Link to={toGameEventsPage('game-1')}>Game 1</Link>
          </li>
          <li>
            <Link to={toGameEventsPage('game-2')}>Game 2</Link>
          </li>
          <li>
            <Link to={toGameEventsPage('game-3')}>Game 3</Link>
          </li>
          <li>
            <Link to={toGameEventsPage('game-4')}>Game 4</Link>
          </li>
        </ol>
      </main>
    </div>
  )
}

export default GamesContainer
