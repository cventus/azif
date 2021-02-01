import React, { useCallback, useState } from 'react'
import { Card as GameCard, ItemCard, ItemCardFace } from '../../game/rules'
import styled, { keyframes } from 'styled-components'
import { withVisualState } from '../util/withVisualState'

const ItemTypeNames: Record<ItemCard['type'], string> = {
  'common-item': 'Common Item',
  'unique-item': 'Unique Item',
}

const TagNames: Record<Required<ItemCard>['tags'][number], string> = {
  ally: 'Ally',
  'bladed-weapon': 'Bladed Weapon',
  equipment: 'Equipment',
  evidence: 'Evidence',
  firearm: 'Firearm',
  'heavy-weapon': 'Heavy Weapon',
  key: 'Key',
  'light-source': 'Light Source',
  relic: 'Relic',
  tome: 'Tome',
}

const Name = styled.h1`
  text-align: center;
`

const Flavor = styled.p`
  font-style: italic;
`

const TagList = styled.ul`
  display: block;
  text-align: center;
  list-style: none;
  padding: 0;
  & > li + li::before {
    content: ', ';
  }
`

const TagListItem = styled.li`
  display: inline-block;
`

const TagName = styled.span`
  font-weight: bold;
`

const Description = styled.p``

const CardFront = styled.div`
  width: 18rem;
  height: 27rem;
  padding: 0 1rem 1rem 1rem;
  background-color: tan;
  overflow-y: auto;
  text-align: center;

  &.unique-item {
    background-color: gold;
  }
`

const flipIn = keyframes`
  from { transform: perspective(1000px) rotateY(-90deg); }
  to   { transform: perspective(1000px) rotateY(0deg); }
`

const flipOut = keyframes`
  from { transform: perspective(1000px) rotateY(0deg); }
  to   { transform: perspective(1000px) rotateY(90deg); }
`

const FlipCard = styled.article`
  margin: 1rem;
  clip-path: inset(0 round 1rem);

  /* exit animations */
  &.STATE_face-up.TO_face-down,
  &.STATE_face-down.TO_face-up {
    transform-style: preserve-3d;
    animation: 0.25s ${flipOut} ease-in;
  }

  /* enter animations */
  &.STATE_face-up.FROM_face-down,
  &.STATE_face-down.FROM_face-up {
    transform-style: preserve-3d;
    animation: 0.25s ${flipIn} ease-out;
  }
`

const AnimatedFlipCard = withVisualState(FlipCard, ['face-up', 'face-down'])

type CardFacing = 'face-up' | 'face-down'

interface ItemDetailsProps {
  item: ItemCard
  defaultFacing?: CardFacing
}

const CardFace = (props: { card: ItemCardFace; type: GameCard['type'] }) => {
  const { card, type } = props
  const className = type === 'unique-item' ? 'unique-item' : undefined
  return (
    <CardFront className={className}>
      {[
        <header>
          <Name>{card.name}</Name>
        </header>,
        card.weapon && (
          <section>
            <table>
              <tbody>
                <tr>
                  <th scope="row">Range</th>
                  <td>{card.weapon.range}</td>
                </tr>
                <tr>
                  <th scope="row">Damage</th>
                  <td>{card.weapon.damage}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ),
        card.tags && (
          <TagList>
            {card.tags.map((tag) => (
              <TagListItem key={tag}>
                <TagName>{TagNames[tag]}</TagName>
              </TagListItem>
            ))}
          </TagList>
        ),
        card.flavor && (
          <section>
            {card.flavor.map((p) => (
              <Flavor>{p}</Flavor>
            ))}
          </section>
        ),
        card.description && (
          <section>
            {card.description.map((p) => (
              <Description>{p}</Description>
            ))}
          </section>
        ),
        card.action && (
          <section>
            <b>Action: </b>
            {card.action.join(' ')}
          </section>
        ),
      ]}
    </CardFront>
  )
}

const ItemDetails = ({ item, defaultFacing = 'face-up' }: ItemDetailsProps) => {
  const [facing, setFacing] = useState<CardFacing>(defaultFacing)
  const onClick = useCallback(
    () => setFacing(facing === 'face-up' ? 'face-down' : 'face-up'),
    [facing, setFacing],
  )

  const canFlip = Boolean(item.backface)

  if (item.backface) {
    return (
      <AnimatedFlipCard onClick={onClick} state={facing}>
        {({ state }) => (
          <CardFace
            card={state === 'face-up' ? item : item.backface || item}
            type={item.type}
          />
        )}
      </AnimatedFlipCard>
    )
  } else {
    return (
      <FlipCard>
        <CardFace card={item} type={item.type} />
      </FlipCard>
    )
  }
}

export default ItemDetails
