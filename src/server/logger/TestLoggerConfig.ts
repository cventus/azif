import { inject } from '../../inject'
import { LoggerConfig } from './LoggerService'

export const TestLoggerConfig = (config: Partial<LoggerConfig> = {}) =>
  inject({
    defaultLevel: 'fatal',
    levels: {},
    traceMethods: [],
    ...config,
  } as LoggerConfig)
