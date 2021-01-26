export const CardTypes = [
  'character',
  'common-item',
  'condition',
  'damage',
  'horror',
  'spell',
  'unique-item',
] as const
export type CardType = typeof CardTypes[number]

export const ItemTags = [
  'ally',
  'bladed-weapon',
  'equipment',
  'evidence',
  'firearm',
  'heavy-weapon',
  'key',
  'light-source',
  'relic',
  'tome',
] as const
export type ItemTag = typeof ItemTags[number]

export const WeaponRanges = ['melee', 'ranged'] as const
export type WeaponRange = typeof WeaponRanges[number]

export const Resolutions = ['resolve-immediately', 'keep-faceup'] as const
export type Resolution = typeof Resolutions[number]

interface DeckCard {
  id: string
  type: CardType
}

export interface Weapon {
  range: WeaponRange
  damage: number
}

export interface CardFace {
  name: string
  flavor?: string[]
  description?: string[]
  action?: string[]
}

interface ItemCardFace extends CardFace {
  tags?: ItemTag[]
  weapon?: Weapon
}

export interface ItemCard extends DeckCard, ItemCardFace {
  id: string
  type: 'common-item' | 'unique-item'
  backface?: ItemCardFace
}

export interface ConditionCard extends DeckCard {
  type: 'condition'
  condition: string
  name: string
  description?: string[]
}

export interface InsaneConditionCard extends ConditionCard, CardFace {
  type: 'condition'
  condition: 'insane'
  players: number
  backface: CardFace
}

export interface SpellAction {
  flavor: string[]
  description: string[]
}

export interface SpellSideEffect extends SpellAction {
  type: 'side-effect'
  gainAnother: string[]
}

export interface SpellConditionalEffect {
  type: 'test'
  test: string
  pass: SpellAction
  fail: SpellAction
  gainAnother: string[]
}

export type SpellEffect = SpellConditionalEffect | SpellSideEffect

export interface SpellCard extends DeckCard, CardFace {
  id: string
  type: 'spell'
  groupId: string
  weapon?: Weapon
  backface: SpellEffect
}

export interface DamageCard extends DeckCard, CardFace {
  type: 'damage'
  resolution: Resolution
}

export interface HorrorCard extends DeckCard, CardFace {
  type: 'horror'
  resolution: Resolution
}

export const Abilities = [
  'strength',
  'agility',
  'observation',
  'lore',
  'influence',
  'will',
] as const
export type Ability = typeof Abilities[number]

export interface CharacterCard {
  id: string
  type: 'character'
  name: string
  title: string
  story: string[]
  health: number
  sanity: number
  abilities: Record<Ability, number>
  specialAbility: {
    action?: string[]
    description?: string[]
  }
}

export type Card =
  | CharacterCard
  | ConditionCard
  | DamageCard
  | HorrorCard
  | InsaneConditionCard
  | ItemCard
  | SpellCard

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

export function isCommonItemCard(card: Card): card is ItemCard & { type: 'common-item' } {
  return card.type === 'common-item'
}

export function isUniqueItemCard(card: Card): card is ItemCard & { type: 'unique-item' } {
  return card.type === 'unique-item'
}

export function isSpellCard(card: Card): card is SpellCard {
  return card.type === 'spell'
}
