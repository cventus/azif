import { useRef } from 'react'

const useRecentValue = <T>(value: T | null): T | null => {
  const ref = useRef(value)
  if (ref.current === null) {
    ref.current = value
  }
  return ref.current
}

export default useRecentValue
