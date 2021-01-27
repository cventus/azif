type ActionCreatorRecord = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]) => Record<string, unknown>
>

type TypedActionCreatorObject<
  Prefix extends string,
  ActionCreators extends ActionCreatorRecord
> = {
  [key in keyof ActionCreators & string]: (
    ...args: Parameters<ActionCreators[key]>
  ) => ReturnType<ActionCreators[key]> & { type: `${Prefix}/${key}` }
}

export function defineActions<
  Prefix extends string,
  ActionCreatorMap extends ActionCreatorRecord
>(
  prefix: Prefix,
  map: ActionCreatorMap,
): TypedActionCreatorObject<Prefix, ActionCreatorMap> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(map)) {
    result[key] = (...args: unknown[]) => ({
      type: `${prefix}/${key}`,
      ...map[key](...args),
    })
  }
  return result as TypedActionCreatorObject<Prefix, ActionCreatorMap>
}
