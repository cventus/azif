import React from 'react'
import { Ability, CharacterCard } from '../../game/rules'
import styled from 'styled-components'

const abilities: Ability[] = [
  'strength',
  'agility',
  'observation',
  'lore',
  'influence',
  'will',
]

const Name = styled.h1``

const Title = styled.p``

const SectionHeader = styled.h2``

const abilityNames: Record<Ability, string> = {
  strength: 'Strength',
  agility: 'Agility',
  observation: 'Observation',
  lore: 'Lore',
  influence: 'Influence',
  will: 'Will',
}

const CharacterDetails: React.FC<{
  character: CharacterCard
}> = ({ character }) => {
  return (
    <article>
      <header>
        <Name>{character.name}</Name>
        <Title>{character.title}</Title>
      </header>
      <section>
        <SectionHeader>The story so far...</SectionHeader>
        {character.story.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>
      <section>
        <table>
          <tbody>
            <tr>
              <th scope="row">Health</th>
              <td>{character.health}</td>
            </tr>
            <tr>
              <th scope="row">Sanity</th>
              <td>{character.sanity}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <SectionHeader>Abilities</SectionHeader>
        <table>
          <tbody>
            {abilities.map((ability) => (
              <tr key={ability}>
                <th scope="row">{abilityNames[ability]}</th>
                <td>{character.abilities[ability]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <SectionHeader>Special ability</SectionHeader>
        {character.specialAbility.description &&
          character.specialAbility.description.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        {character.specialAbility.action && (
          <>
            <b>Action: </b> {character.specialAbility.action.join(' ')}
          </>
        )}
      </section>
    </article>
  )
}

export default CharacterDetails
