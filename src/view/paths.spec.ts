import {
  isFrontPage,
  isGameCharactersPage,
  isGamePage,
  isNewGamePage,
  isSettingsPage,
  toFrontPage,
  toGameCharactersPage,
  toGamePage,
  toNewGamePage,
  toSettingsPage,
} from './paths'

it('isFrontPage should match /', () => {
  expect(isFrontPage('/')).toEqual([])
  expect(isFrontPage('')).toBe(undefined)
  expect(isFrontPage('/hello')).toBe(undefined)
  expect(isFrontPage('hello')).toBe(undefined)
})

it('toFrontPage should produce /', () => {
  expect(toFrontPage()).toEqual('/')
})

it('isSettingsPage should match /settings', () => {
  expect(isSettingsPage('/')).toBe(undefined)
  expect(isSettingsPage('/settings')).toEqual([])
  expect(isSettingsPage('/settings/password')).toBe(undefined)
})

it('toSettingsPage should produce /settings', () => {
  expect(toSettingsPage()).toEqual('/settings')
})

it('isNewGamePage should match /games/new', () => {
  expect(isNewGamePage('/')).toBe(undefined)
  expect(isNewGamePage('/games')).toBe(undefined)
  expect(isNewGamePage('/games/new')).toEqual([])
  expect(isNewGamePage('/games/new/confirm')).toBe(undefined)
})

it('toNewGamePage should produce /games/new', () => {
  expect(toNewGamePage()).toEqual('/games/new')
})

describe('isGamePage', () => {
  it('should match /games/:id', () => {
    expect(isGamePage('/')).toEqual(undefined)
    expect(isGamePage('/games')).toEqual(undefined)
    expect(isGamePage('/games/ABC123')).toEqual(['ABC123'])
    expect(isGamePage('/games/new/confirm')).toEqual(undefined)
  })

  it('should not match /games/new', () => {
    expect(isGamePage('/games/new')).toBe(undefined)
  })

  it('should handle IDs with URI escaped characters', () => {
    expect(isGamePage('/games/escaped%2Fid')).toEqual(['escaped/id'])
  })
})

describe('toGamePage', () => {
  it('should produce /games/:id', () => {
    expect(toGamePage('hello')).toEqual('/games/hello')
  })

  it('should handle IDs with URI escaped characters', () => {
    expect(toGamePage('escaped/id')).toEqual('/games/escaped%2Fid')
  })

  it(`should throw an exception when passed no arguments`, () => {
    expect(() => (toGamePage as any)()).toThrow()
  })

  it(`should throw an exception when passed an empty string`, () => {
    expect(() => toGamePage('')).toThrow()
  })

  it(`should throw an exception when passed 'new'`, () => {
    expect(toGamePage('n')).toEqual('/games/n')
    expect(toGamePage('ne')).toEqual('/games/ne')
    expect(() => toGamePage('new')).toThrow()
    expect(toGamePage('news')).toEqual('/games/news')
  })
})

it('isGameCharactersPage should match /games/:A/characters/:B', () => {
  expect(isGameCharactersPage('/')).toBe(undefined)
  expect(isGameCharactersPage('/games')).toBe(undefined)
  expect(isGameCharactersPage('/games/ABC123')).toBe(undefined)
  expect(isGameCharactersPage('/games/ABC123/characters')).toBe(undefined)
  expect(isGameCharactersPage('/games/ABC123/characters/john')).toEqual([
    'ABC123',
    'john',
  ])
  expect(isGameCharactersPage('/games/X/characters/Y/items')).toBe(undefined)
})

it('toGameCharactersPage(A, B) should produce /games/:A/characters/:B', () => {
  expect(toGameCharactersPage('123', 'john')).toEqual(
    '/games/123/characters/john',
  )
})
