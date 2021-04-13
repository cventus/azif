import React, { FormEvent, useCallback, useContext, useRef } from 'react'
import { useDispatch, useSelector } from '../store'
import { connection } from '../ducks/connection'
import { SocketContext } from '../ClientSocket'

interface AuthenticationContainerProps {}

const LoginForm = () => {
  const socket = useContext(SocketContext)
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const login = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      const { current: username } = usernameRef
      const { current: password } = passwordRef

      e.preventDefault()

      if (socket && username && username.value && password && password.value) {
        socket.send({
          type: 'login',
          username: username.value,
          password: password.value,
        })
      }
    },
    [socket, usernameRef, passwordRef],
  )

  return (
    <form onSubmit={login}>
      <p>
        <label>
          Username
          <input type="text" ref={usernameRef} name="username" />
        </label>
      </p>
      <p>
        <label>
          Password
          <input type="text" ref={passwordRef} name="password" />
        </label>
      </p>
      <p>
        <input type="submit" value="Login" />
      </p>
    </form>
  )
}

const AuthenticationContainer: React.FC<AuthenticationContainerProps> = () => {
  const dispatch = useDispatch()
  const session = useSelector((state) => state.session.state)

  const logout = useCallback(() => {
    dispatch(
      connection.request({
        type: 'logout',
      }),
    )
  }, [dispatch])

  return (
    <>
      {!session && <LoginForm />}
      {session && <button onClick={logout}>Logout</button>}
    </>
  )
}

export default AuthenticationContainer
