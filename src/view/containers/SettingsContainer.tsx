import React from 'react'
import { Link } from 'react-router-dom'
import { toGamesPage } from '../paths'

interface GamesContainerProps {}

export const GamesContainer: React.FC<GamesContainerProps> = ({}) => {
  return (
    <>
      <nav>
        <ul>
          <li>
            <Link to={toGamesPage()}>Games</Link>
          </li>
          <li>Settings</li>
        </ul>
      </nav>
    </>
  )
}

export default GamesContainer
