import { inject } from '../../inject'
import pino from 'pino'

export const Logger = inject({}, () => {
  return pino({
    base: null,
  })
})

export const SilentLogger = inject({}, () => {
  return pino({
    enabled: false,
  })
})

