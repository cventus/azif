import { Literal, Optional, StructureType, Union, validate } from '../structure'

const CardType = Union(
  Literal('character'),
  Literal('common-item'),
  Literal('condition'),
  Literal('damage'),
  Literal('horror'),
  Literal('spell'),
  Literal('unique-item'),
)
export type CardType = StructureType<typeof CardType>

const ItemTag = Union(
  Literal('ally'),
  Literal('bladed-weapon'),
  Literal('equipment'),
  Literal('evidence'),
  Literal('firearm'),
  Literal('heavy-weapon'),
  Literal('key'),
  Literal('light-source'),
  Literal('relic'),
  Literal('tome'),
)
export type ItemTag = StructureType<typeof ItemTag>

const WeaponRange = Union(Literal('melee'), Literal('ranged'))
export type WeaponRange = StructureType<typeof WeaponRange>

const Resolution = Union(Literal('resolve-immediately'), Literal('keep-faceup'))
export type Resolution = StructureType<typeof Resolution>

const DeckCard = {
  id: String,
  set: String,
  type: CardType,
}
type DeckCard = StructureType<typeof DeckCard>

const Weapon = {
  range: WeaponRange,
  damage: Number,
}
export type Weapon = StructureType<typeof Weapon>

const CardFace = {
  name: String,
  flavor: Optional(Array(String)),
  description: Optional(Array(String)),
  action: Optional(Array(String)),
}
export type CardFace = StructureType<typeof CardFace>

const ItemCardFace = {
  ...CardFace,
  tags: Optional(Array(ItemTag)),
  weapon: Optional(Weapon),
}
export type ItemCardFace = StructureType<typeof ItemCardFace>

const ItemCard = {
  ...DeckCard,
  ...ItemCardFace,
  id: String,
  type: Union(Literal('common-item'), Literal('unique-item')),
  backface: Optional(ItemCardFace),
}
export type ItemCard = StructureType<typeof ItemCard>

const ConditionCard = {
  ...DeckCard,
  type: Literal('condition'),
  condition: String,
  name: String,
  description: Optional(Array(String)),
}
export type ConditionCard = StructureType<typeof ConditionCard>

const InsaneConditionCard = {
  ...ConditionCard,
  condition: Literal('insane'),
  players: Number,
  backface: CardFace,
  ...CardFace,
}
export type InsaneConditionCard = StructureType<typeof InsaneConditionCard>

const SpellAction = {
  flavor: Array(String),
  description: Array(String),
}
export type SpellAction = StructureType<typeof SpellAction>

const SpellSideEffect = {
  type: Literal('side-effect'),
  gainAnother: Array(String),
  ...SpellAction,
}
export type SpellSideEffect = StructureType<typeof SpellSideEffect>

const SpellConditionalEffect = {
  type: Literal('test'),
  test: String,
  pass: SpellAction,
  fail: SpellAction,
  gainAnother: Array(String),
}
export type SpellConditionalEffect = StructureType<
  typeof SpellConditionalEffect
>

const SpellEffect = Union(SpellConditionalEffect, SpellSideEffect)
export type SpellEffect = SpellConditionalEffect | SpellSideEffect

const SpellCard = {
  ...DeckCard,
  ...CardFace,
  type: Literal('spell'),
  groupId: String,
  weapon: Optional(Weapon),
  backface: SpellEffect,
}
export type SpellCard = StructureType<typeof SpellCard>

const DamageCard = {
  ...DeckCard,
  ...CardFace,
  type: Literal('damage'),
  resolution: Resolution,
}
export type DamageCard = StructureType<typeof DamageCard>

const HorrorCard = {
  ...DeckCard,
  type: Literal('horror'),
  resolution: Resolution,
  ...CardFace,
}
export type HorrorCard = StructureType<typeof HorrorCard>

export type Ability = keyof CharacterCard['abilities']

const CharacterCard = {
  ...DeckCard,
  id: String,
  type: Literal('character'),
  name: String,
  title: String,
  story: Array(String),
  health: Number,
  sanity: Number,
  abilities: {
    strength: Number,
    agility: Number,
    observation: Number,
    lore: Number,
    influence: Number,
    will: Number,
  },
  specialAbility: {
    action: Optional(Array(String)),
    description: Optional(Array(String)),
  },
}
export type CharacterCard = StructureType<typeof CharacterCard>

export const Card = Union(
  CharacterCard,
  ConditionCard,
  DamageCard,
  HorrorCard,
  InsaneConditionCard,
  ItemCard,
  SpellCard,
)
export type Card = StructureType<typeof Card>

export const isCard = validate(Card)

export function isCharacterCard(card: Card): card is CharacterCard {
  return card.type === 'character'
}

export function isConditionCard(card: Card): card is ConditionCard {
  return card.type === 'condition'
}

export function isDamageCard(card: Card): card is DamageCard {
  return card.type === 'damage'
}

export function isHorrorCard(card: Card): card is HorrorCard {
  return card.type === 'horror'
}

export function isInsaneConditionCard(card: Card): card is InsaneConditionCard {
  return card.type === 'condition' && card.condition === 'insane'
}

export function isItemCard(card: Card): card is ItemCard {
  return card.type === 'common-item' || card.type === 'unique-item'
}

export function isCommonItemCard(
  card: Card,
): card is ItemCard & { type: 'common-item' } {
  return card.type === 'common-item'
}

export function isUniqueItemCard(
  card: Card,
): card is ItemCard & { type: 'unique-item' } {
  return card.type === 'unique-item'
}

export function isSpellCard(card: Card): card is SpellCard {
  return card.type === 'spell'
}
