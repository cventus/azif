import React, { useCallback } from 'react'
import { useDispatch, useSelector } from '../store'
import { connection } from '../ducks/connection'

interface AuthenticationContainerProps {
}

const AuthenticationContainer: React.FC<AuthenticationContainerProps> = () => {
  const dispatch = useDispatch()
  const connectionStatus = useSelector((state) => state.connection.status)

  const login = useCallback(() => {
    dispatch(connection.login())
  }, [dispatch])

  const logout = useCallback(() => {
    dispatch(connection.logout())
  }, [dispatch])

  return (
    <>
      {connectionStatus === 'disconnected' && (
        <button onClick={login}>Login</button>
      )}
      {connectionStatus === 'connecting' && <div>connecting...</div>}
      {connectionStatus === 'connected' && (
        <button onClick={logout}>Logout</button>
      )}
    </>
  )
}

export default AuthenticationContainer
