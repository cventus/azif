import React from 'react'
import { hot } from 'react-hot-loader/root'
import { CharacterCard, ItemCard } from '../../game/rules'
import ItemDetails from './ItemDetails'
import CharacterDetails from './CharacterDetails'

const characterCard: CharacterCard = {
  id: 'my-character',
  name: 'John Doe',
  title: 'The Character',
  type: 'character',
  health: 7,
  sanity: 7,
  abilities: {
    strength: 3,
    agility: 4,
    observation: 3,
    lore: 2,
    influence: 4,
    will: 5,
  },
  specialAbility: {
    description: ['Lorem ipsum dolor sit amet, consectetur adipisci tempor incidunt ut labore et dolore.']
  },
  story: [
    'Lorem ipsum dolor sit amet, consectetur adipisci tempor incidunt ut labore et dolore magna aliqua veniam, quis nostrud exercitation ullamcorpor s commodo consequat. Nam liber tempor cum soluta nobis elige quod maxim placeat facer possim omnis volupt.',
    'Duis autem vel eum irrure esse molestiae consequat, vel illum dolore eu fugi et iusto odio dignissim qui blandit praesent luptat exceptur sint occaecat cupiditat non provident, deserunt mollit anim id est laborum et dolor fuga distinct.'
  ],
}

const itemCard: ItemCard = {
  id: 'my-item',
  name: 'Power supply',
  type: 'common-item',
  action: ['Plug this in to get a jolt']
}

const Gallery = () => {
  return (<>
    <h1>Gallery</h1>

    <h2>Character card</h2>
    <CharacterDetails character={characterCard} />

    <h2>Item card</h2>
    <ItemDetails item={itemCard} />
  </>)
}

export default hot(Gallery);
