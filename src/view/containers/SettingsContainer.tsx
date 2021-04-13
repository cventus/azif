import { goBack, push } from 'connected-react-router'
import React, {
  FormEvent,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { SessionState } from '../../game/resources'
import { SocketContext } from '../ClientSocket'
import { toGamesPage, toSettingsPage } from '../paths'
import { useDispatch, useSelector } from '../store'

type ChangeName = ['name', string]
type ChangeUsername = ['username', string]
type ChangePassword = ['password', string]
type Change = ChangeName | ChangeUsername | ChangePassword

interface UserEditEvent {
  changes: Change[]
}

export const EditUserForm: React.FC<{
  session: SessionState
  onEdit?: (event: UserEditEvent) => unknown
}> = ({ session, onEdit }) => {
  const nameRef = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const [canUpdate, setCanUpdate] = useState(false)

  const submit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!onEdit) {
        return
      }

      const { current: name } = nameRef
      const { current: username } = usernameRef
      const { current: password } = passwordRef

      const result: UserEditEvent = { changes: [] }

      if (name && name.value !== session.name && name.value !== '') {
        result.changes.push(['name', name.value])
      }

      if (
        username &&
        username.value !== session.username &&
        username.value !== ''
      ) {
        result.changes.push(['username', username.value])
      }

      if (password && password.value !== '') {
        result.changes.push(['password', password.value])
      }

      onEdit(result)
    },
    [nameRef, usernameRef, passwordRef, session],
  )

  const checkCanUpdate = useCallback(() => {
    const { current: name } = nameRef
    const { current: username } = usernameRef
    const { current: password } = passwordRef

    if (name && name.value !== session.name) {
      setCanUpdate(true)
      return
    }

    if (username && username.value !== session.username) {
      setCanUpdate(true)
      return
    }
    if (password && password.value !== '') {
      setCanUpdate(true)
      return
    }
    setCanUpdate(false)
  }, [session, nameRef, usernameRef, passwordRef])

  return (
    <form onSubmit={submit}>
      <p>
        <label>
          Name:
          <input
            name="name"
            ref={nameRef}
            defaultValue={session.name}
            onChange={checkCanUpdate}
          />
        </label>
      </p>
      <p>
        <label>
          Username:
          <input
            name="username"
            defaultValue={session.username}
            ref={usernameRef}
            onChange={checkCanUpdate}
          />
        </label>
      </p>
      <p>
        <label>
          Password:
          <input
            type="password"
            ref={passwordRef}
            name="password"
            defaultValue=""
            placeholder="New password"
            onChange={checkCanUpdate}
          />
        </label>
      </p>
      <p>
        <input type="submit" value="Apply changes" disabled={!canUpdate} />
      </p>
    </form>
  )
}

interface ConfirmEditEvent {
  changes: Change[]
  oldPassword: string
}

export const ConfirmChangesDialog: React.FC<{
  session: SessionState
  changes: Change[]
  onConfirm?: (event: ConfirmEditEvent) => unknown
  onCancel?: () => void
}> = ({ session, changes, onConfirm, onCancel }) => {
  const newPasswordRef = useRef<HTMLInputElement>(null)
  const oldPasswordRef = useRef<HTMLInputElement>(null)

  const [passwordMismatch, setPasswordMismatch] = useState(false)

  const newName = changes.find(([field]) => field === 'name')
  const newUsername = changes.find(([field]) => field === 'username')
  const newPassword = changes.find(([field]) => field === 'password')

  const submit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!onConfirm || !oldPasswordRef.current) {
        return
      }

      if (newPassword) {
        if (!newPasswordRef.current) {
          return
        }
        if (newPasswordRef.current.value !== newPassword[1]) {
          setPasswordMismatch(true)
          return
        }
      }

      onConfirm({
        changes,
        oldPassword: oldPasswordRef.current.value,
      })
    },
    [session, onConfirm],
  )

  const clearPasswordMismatch = useCallback(() => {
    setPasswordMismatch(false)
  }, [setPasswordMismatch])

  return (
    <form onSubmit={submit}>
      <p>Change</p>
      <ul>
        {newName && (
          <li>
            Name from <i>{session.name}</i> to <i>{newName[1]}</i>
          </li>
        )}
        {newUsername && (
          <li>
            Username from <i>{session.username}</i> to <i>{newUsername[1]}</i>
          </li>
        )}
        {newPassword && <li>Password</li>}
      </ul>
      {newPassword && (
        <p>
          <label>
            Confirm new password:
            <input
              name="newpassword"
              type="password"
              ref={newPasswordRef}
              onChange={clearPasswordMismatch}
            />
          </label>
        </p>
      )}
      {newPassword && passwordMismatch && (
        <p>The password doesn't match your new password</p>
      )}
      <p>
        <label>
          Current password:
          <input name="oldpassword" type="password" ref={oldPasswordRef} />
        </label>
      </p>
      <p>
        <input type="submit" value="Confirm" />
      </p>
      <p>
        <button onClick={onCancel}>Cancel</button>
      </p>
    </form>
  )
}

export const SettingsContainer: React.FC = () => {
  const session = useSelector((state) => state.session)
  const dispatch = useDispatch()
  const socket = useContext(SocketContext)

  const fragment = useSelector((state) => state.router.location.hash)

  const [changes, setChanges] = useState<Change[]>([])

  console.log(session.state && session.state.name)

  const onChanges = useCallback((ev: UserEditEvent) => {
    setChanges(ev.changes)
    dispatch(push(toSettingsPage() + '#confirm'))
  }, [])

  const onConfirm = useCallback(
    async (ev: ConfirmEditEvent) => {
      if (!socket) {
        return
      }

      const updateField = async (change: Change) => {
        const [field, newValue] = change
        if (field === 'name') {
          await socket.send({
            type: 'set-name',
            currentPassword: ev.oldPassword,
            newName: newValue,
          })
        } else if (field === 'username') {
          await socket.send({
            type: 'set-username',
            currentPassword: ev.oldPassword,
            newUsername: newValue,
          })
        } else if (field === 'password') {
          await socket.send({
            type: 'set-password',
            currentPassword: ev.oldPassword,
            newPassword: newValue,
          })
        }
      }

      // Change name/username first
      await Promise.all(
        ev.changes.filter(([field]) => field !== 'password').map(updateField),
      )
      // Update password last
      await Promise.all(
        ev.changes.filter(([field]) => field === 'password').map(updateField),
      )

      await socket.getSession()
      setChanges([])
      dispatch(goBack())
    },
    [dispatch, setChanges, socket],
  )

  const onConfirmCancel = useCallback(() => {
    setChanges([])
    dispatch(goBack())
  }, [])

  return (
    <>
      <nav>
        <ul>
          <li>
            <Link to={toGamesPage()}>Games</Link>
          </li>
          <li>Settings</li>
        </ul>
      </nav>
      <main>
        <h1>Settings</h1>
        {fragment === '#confirm' && changes.length > 0
          ? session.state && (
              <ConfirmChangesDialog
                changes={changes}
                session={session.state}
                onConfirm={onConfirm}
                onCancel={onConfirmCancel}
              />
            )
          : session.state && (
              <EditUserForm session={session.state} onEdit={onChanges} />
            )}
      </main>
    </>
  )
}

export default SettingsContainer
