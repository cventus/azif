type URIComponent = string | typeof String

type Matches<T> = T extends readonly [string, ...infer Rest]
  ? Matches<Rest>
  : T extends readonly [typeof String, ...infer Rest]
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
    const [, ...components] = pathname.split('/')
    console.log('components', components)
    if (components.length !== matchPath.length) {
      return undefined
    }
    for (let i = 0; i < matchPath.length; i++) {
      if (matchPath[i] === String) {
        result.push(decodeURIComponent(components[i]))
      } else if (matchPath[i] !== components[i]) {
        return undefined
      }
    }
    return result as Matches<Path>
  },
  build: (...params) => {
    const result = []
    let j = 0
    for (let i = 0; i < matchPath.length; i++) {
      if (matchPath[i] === String) {
        result.push(encodeURIComponent(params[j]))
        j++
      } else {
        result.push(matchPath[i])
      }
    }
    return '/' + result.join('/')
  },
})

export const { build: toFrontPage, match: isFrontPage } = AppEndpoint('')

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
} = AppEndpoint('games', String)

export const {
  build: toGameEventsPage, //
  match: isGameEventsPage,
} = AppEndpoint('games', String, 'events')

export const {
  build: toGameCharactersPage,
  match: isGameCharactersPage,
} = AppEndpoint('games', String, 'characters', String)
