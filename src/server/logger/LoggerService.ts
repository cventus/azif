import { inject } from '../../inject'
import pino from 'pino'

export interface LoggerConfig {
  defaultLevel: pino.Level
  traceMethods: string[]
  levels: Record<string, pino.Level>
}

const readLevel = (value: unknown): pino.Level | undefined => {
  switch (value) {
    case 'fatal':
    case 'error':
    case 'warn':
    case 'info':
    case 'debug':
    case 'trace':
      return value
  }
}

export const readLoggerLevels = (
  config: string,
): Record<string, pino.Level> => {
  return config
    .replace(/\s/g, '')
    .split(',')
    .reduce((acc, kv) => {
      const eq = kv.indexOf('=')
      if (eq < 1) {
        return acc
      }
      const key = kv.substr(0, eq)
      const value = kv.substr(eq + 1)
      const level = readLevel(value.toLowerCase())
      if (level) {
        return { ...acc, [key]: level }
      } else {
        return acc
      }
    }, {} as Record<string, pino.Level>)
}

export const LoggerConfig = inject<LoggerConfig>()

export const EnvironmentLoggerConfig = inject(
  {},
  (): LoggerConfig => {
    const defaultLevel = readLevel(process.env['LOG_LEVEL']) || 'info'
    const traceMethods = (process.env['TRACE_METHODS'] || '')
      .split(',')
      .map((l) => l.trim())
    const levels = readLoggerLevels(process.env['LOGGER_LEVEL'] || '')
    return { defaultLevel, traceMethods, levels }
  },
)

export interface LoggerService {
  create(name: string): pino.Logger
  traceFunction<T extends (...args: any[]) => any>(
    logger: pino.Logger,
    func: T,
    that?: ThisType<T>,
  ): T
  traceMethods<T>(logger: pino.Logger, obj: T): T
}

export const LoggerService = inject(
  { LoggerConfig },
  ({ LoggerConfig: config }): LoggerService => {
    const logger = pino({
      base: null,
      level: config.defaultLevel,
    })

    const service = {
      create(name: string) {
        const child = logger.child({ name })
        if (config.levels[name]) {
          child.level = config.levels[name]
        }
        return child
      },
      traceFunction<T extends (...args: any[]) => any>(
        logger: pino.Logger,
        func: T,
        that?: ThisType<T>,
      ): T {
        if (logger.level === 'trace') {
          return function (
            this: ThisType<T>,
            ...args: Parameters<T>
          ): ReturnType<T> {
            try {
              logger.trace({ args }, 'ENTER')
              const result = func.apply(that || this, args)
              logger.trace({ return: result }, 'EXIT')
              return result
            } catch (err) {
              logger.trace({ err }, 'THROW')
              throw err
            }
          } as T
        } else {
          return func
        }
      },
      traceMethods<T>(logger: pino.Logger, obj: T): T {
        return Object.entries(obj).reduce((result, [key, value]) => {
          if (typeof value === 'function') {
            const { name } = logger.bindings()
            const childName = `${name}.${key}`
            if (
              config.levels[name] === 'trace' ||
              config.traceMethods.includes(childName)
            ) {
              const methodLogger = logger.child({ name, method: key })
              methodLogger.level = 'trace'
              return {
                ...result,
                [key]: service.traceFunction(methodLogger, value, obj),
              }
            }
          }
          return {
            ...result,
            [key]: value,
          }
        }, {} as Partial<T>) as T
      },
    }

    return service
  },
)
