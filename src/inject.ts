/* eslint-disable @typescript-eslint/no-explicit-any */

declare const type: unique symbol

export interface Injectable<Type> {
  readonly [type]: Type
}

export type InjectableType<
  I extends Injectable<unknown>
> = I extends Injectable<infer T> ? T : never

type ResolvedDependencies<D extends Record<string, Injectable<unknown>>> = {
  [key in string & keyof D]: D[key] extends Injectable<infer Type>
    ? Type
    : never
}

export interface Provider<
  Type,
  Dependencies extends Record<string, Injectable<unknown>>
> extends Injectable<Type> {
  readonly dependencies: Dependencies
  readonly create: (
    resolved: ResolvedDependencies<Dependencies>,
  ) => Type | Promise<Type>
  readonly destroy?: (value: Type) => void | Promise<void>
}

interface Inject {
  <Type>(): Injectable<Type>
  <Type>(value: Type): Provider<Type, Record<string, never>>
  <Type, Dependencies extends Record<string, Injectable<unknown>>>(
    dependencies: Dependencies,
    create: (
      resolved: ResolvedDependencies<Dependencies>,
    ) => Type | Promise<Type>,
    destroy?: (value: Type) => void | Promise<void>,
  ): Provider<Type, Dependencies>
}

export const inject: Inject = function inject(
  value?: unknown,
  create?: unknown,
  destroy?: unknown,
) {
  if (arguments.length === 0) {
    return {}
  } else if (create) {
    return { dependencies: value, create, destroy }
  } else {
    return { dependencies: {}, create: () => value } as any
  }
}

type AssemblyTypes<Providers extends Record<string, Provider<any, any>>> = {
  [key in string & keyof Providers]: InjectableType<Providers[key]>
}

type CompleteAssembly<
  Providers extends Record<string, Provider<any, any>>
> = Record<
  keyof Providers,
  { create: (resolved: AssemblyTypes<Providers>) => unknown }
>

export interface Assembly<
  Providers extends Record<string, Provider<any, any>>
> {
  get<Name extends keyof Providers>(name: Name): InjectableType<Providers[Name]>
  destroy(): Promise<void>
}

export async function assemble<
  Providers extends Record<string, Provider<any, any>>
>(
  providers: Providers & CompleteAssembly<Providers>,
): Promise<Assembly<Providers>> {
  type Name = keyof Providers
  type ComponentMap = Partial<Record<Name, any>>

  const providerNames: Name[] = Object.keys(providers)

  const visited: Set<any> = new Set()
  const components: Map<any, any> = new Map()
  let destroyables: (() => Promise<void>)[] = []

  const build = async (name: Name) => {
    const provider = providers[name]
    if (components.has(provider)) {
      return components.get(provider)
    }
    if (visited.has(provider)) {
      throw new Error('assemble: circular dependency')
    }
    visited.add(provider)

    const { create, dependencies, destroy } = provider

    const param: ComponentMap = {}
    for (const dependency of Object.keys(dependencies)) {
      param[dependency as Name] = await build(dependency)
    }

    const component = await Promise.resolve(create(param))
    components.set(provider, component)

    if (destroy) {
      // Prepend to list so that in-order traveral destroys components in FILO order
      destroyables.unshift(() => Promise.resolve(destroy(component)))
    }

    return component
  }

  for (const dependency of providerNames) {
    await build(dependency)
  }

  return {
    get: (name: Name) => components.get(providers[name]),
    destroy: async () => {
      const list = destroyables
      destroyables = []
      for (const destroyCallback of list) {
        try {
          await destroyCallback()
        } catch (e) {
          console.error('Unable to destroy:', e)
        }
      }
    },
  }
}
