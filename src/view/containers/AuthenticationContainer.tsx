import React, { FormEvent, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from '../store'
import { connection } from '../ducks/connection'

interface AuthenticationContainerProps {
}

const LoginForm = () => {
  const dispatch = useDispatch()
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const login = useCallback((e: FormEvent<HTMLFormElement>) => {
    const { current: username } = usernameRef
    const { current: password } = passwordRef

    e.preventDefault()

    if (username && username.value && password && password.value) {
      dispatch(connection.request({
        type: 'login',
        username: username.value,
        password: password.value,
      }))
    }
  }, [dispatch, usernameRef, passwordRef])

  return (
    <form onSubmit={login}>
      <label>
        Username
        <input type="text" ref={usernameRef} name="username" />
      </label>
      <label>
        Password
        <input type="text" ref={passwordRef} name="username" />
      </label>
      <input type="submit" value="Login" />
    </form>
  )
}

const AuthenticationContainer: React.FC<AuthenticationContainerProps> = () => {
  const dispatch = useDispatch()
  const session = useSelector((state) => state.session.state)

  const logout = useCallback(() => {
    dispatch(connection.request({
      type: 'logout'
    }))
  }, [dispatch])

  return (
    <>
      {!session && <LoginForm />}
      {session && (<button onClick={logout}>Logout</button>)}
    </>
  )
}

export default AuthenticationContainer
