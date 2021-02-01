import React from 'react'
import { hot } from 'react-hot-loader/root'
import { ItemCard } from '../../game/rules'
import ItemDetails from './ItemDetails'

const itemCard: ItemCard = {
  id: 'my-item',
  name: 'Power supply',
  type: 'common-item',
  action: ['Plug this in to get a jolt']
}

const Gallery = () => {
  return (<>
    <h1>Gallery</h1>

    <h2>Item card</h2>
    <ItemDetails item={itemCard} />
  </>)
}

export default hot(Gallery);
