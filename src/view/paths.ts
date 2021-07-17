type URIComponent = string | typeof String | RegExp

type Matches<T> = T extends readonly [string, ...infer Rest]
  ? Matches<Rest>
  : T extends readonly [typeof String | RegExp, ...infer Rest]
  ? [string, ...Matches<Rest>]
  : []

type Matcher<Path> = (pathname: string) => Matches<Path> | undefined
type Builder<Path extends readonly URIComponent[]> = (
  ...params: Matches<Path>
) => string

export interface AppEndpoint<Path extends readonly URIComponent[]> {
  build: Builder<Path>
  match: Matcher<Path>
}

export const AppEndpoint = <Path extends [...URIComponent[]]>(
  ...matchPath: Path
): AppEndpoint<Path> => ({
  match: (pathname) => {
    // must start with a slash
    if (!pathname.match(/^\//)) {
      return undefined
    }
    const result = []
    const [, ...components] = pathname.replace(/\/$/, '').split('/')
    if (components.length !== matchPath.length) {
      return undefined
    }
    for (let i = 0; i < matchPath.length; i++) {
      const part = matchPath[i]
      const component = decodeURIComponent(components[i])
      if (part === String) {
        result.push(component)
      } else if (part instanceof RegExp) {
        if (part.test(component)) {
          result.push(component)
        } else {
          return undefined
        }
      } else if (part !== component) {
        return undefined
      }
    }
    return result as Matches<Path>
  },
  build: (...params) => {
    const result = []
    let j = 0
    for (let i = 0; i < matchPath.length; i++) {
      const part = matchPath[i]
      if (typeof part === 'string') {
        result.push(encodeURIComponent(part))
      } else if (params.length <= j) {
        const n = matchPath.filter((part) => typeof part !== 'string').length
        throw new Error(`Expected ${n} parameters, got only ${params.length}`)
      } else {
        const component = encodeURIComponent(params[j])
        if (component === '') {
          throw new Error(`parameter ${j} is empty`)
        }
        if (part instanceof RegExp && !part.test(component)) {
          throw new Error(
            `${JSON.stringify(component)} did not match ${part.toString}`,
          )
        }
        result.push(component)
        j++
      }
    }
    return '/' + result.join('/')
  },
})

// Anything but literally "new"
const GameId = /^(?!new$)/

export const {
  build: toFrontPage, //
  match: isFrontPage,
} = AppEndpoint()

export const {
  build: toSettingsPage, //
  match: isSettingsPage,
} = AppEndpoint('settings')

export const {
  build: toGamesPage, //
  match: isGamesPage,
} = AppEndpoint('games')

export const {
  build: toNewGamePage, //
  match: isNewGamePage,
} = AppEndpoint('games', 'new')

export const {
  build: toGamePage, //
  match: isGamePage,
} = AppEndpoint('games', GameId)

export const {
  build: toGameLobbyPage, //
  match: isGameLobbyPage,
} = AppEndpoint('games', GameId, 'lobby')

export const {
  build: toSelectCharacterPage, //
  match: isSelectCharacterPage,
} = AppEndpoint('games', GameId, 'lobby', 'characters')

export const {
  build: toSelectCharacterDetailPage, //
  match: isSelectCharacterDetailPage,
} = AppEndpoint('games', GameId, 'lobby', 'characters', String)

export const {
  build: toGameEventsPage, //
  match: isGameEventsPage,
} = AppEndpoint('games', GameId, 'events')

export const {
  build: toGameCharactersPage, //
  match: isGameCharactersPage,
} = AppEndpoint('games', GameId, 'characters', String)
