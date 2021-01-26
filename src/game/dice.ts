export type DieRoll = 'success' | 'investigation' | 'failure'

const SIDES = 8
const SUCCESSES = 3
const INVESTIGATIONS = 2

const SUCESS_MAX = SUCCESSES / SIDES
const INVESTIGATION_MAX = (SUCCESSES + INVESTIGATIONS) / SIDES

export function roll(): DieRoll {
  const x = Math.random()
  if (x < SUCESS_MAX) {
    return 'success'
  } else if (x < INVESTIGATION_MAX) {
    return 'investigation'
  } else {
    return 'failure'
  }
}
