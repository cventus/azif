import React, {
  FormEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useDispatch, useSelector } from '../store'
import { ContentSetPreview } from '../../game/resources'
import { goBack } from 'connected-react-router'
import { SocketContext } from '../ClientSocket'

const ContentSetItem: React.FC<{
  disabled: boolean
  set: ContentSetPreview
  onChange: () => void
}> = ({ set, onChange, disabled }) => {
  const name = `content:${set.id}`

  return (
    <div>
      <label htmlFor={name}>
        <input
          type="checkbox"
          name={name}
          value={set.id}
          onChange={onChange}
          disabled={disabled}
        />
        {set.name}
      </label>
    </div>
  )
}

interface CreateGameEvent {
  name: string
  contentSets: string[]
}

const NewGameForm: React.FC<{
  onCreateGame?: (event: CreateGameEvent) => unknown
  contentSets: ContentSetPreview[]
  disabled: boolean
}> = ({ onCreateGame, contentSets, disabled }) => {
  const formRef = useRef<HTMLFormElement>(null)

  const [nameError, setNameError] = useState<string | null>(null)
  const [setsError, setSetsError] = useState<string | null>(null)

  const resetNameError = useCallback(() => setNameError(null), [setNameError])
  const resetSetsError = useCallback(() => setSetsError(null), [setSetsError])

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      const { current: form } = formRef

      e.preventDefault()

      if (!form || !onCreateGame) {
        return
      }

      const inputs = form.getElementsByTagName('input')

      let name: string = ''
      const contentSets: string[] = []

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs.item(i)
        if (!input) {
          continue
        }
        if (input.name === 'name') {
          name = input.value
        } else if (input.checked) {
          contentSets.push(input.value)
        }
      }

      let isValid = true
      if (name.length === 0) {
        setNameError('The name cannot be empty')
        isValid = false
      }
      if (name.length > 60) {
        setNameError('The name must be shorter than 60 characters long')
        isValid = false
      }
      if (contentSets.length === 0) {
        setSetsError('Select at least one set')
        isValid = false
      }
      if (isValid) {
        onCreateGame({ name, contentSets })
      }
    },
    [onCreateGame, formRef, setNameError, setSetsError],
  )

  return (
    <form onSubmit={onSubmit} ref={formRef}>
      <p>
        <label>
          Name
          <input
            type="text"
            name="name"
            onChange={resetNameError}
            disabled={disabled}
          />
        </label>
        {nameError && <p>{nameError}</p>}
      </p>
      <p>
        {contentSets.map((set) => (
          <ContentSetItem
            key={set.id}
            set={set}
            onChange={resetSetsError}
            disabled={disabled}
          />
        ))}
      </p>
      {setsError && <p>{setsError}</p>}
      <p>
        <input type="submit" value="Create new game" disabled={disabled} />
      </p>
    </form>
  )
}

const NewGameContainer: React.FC = () => {
  const dispatch = useDispatch()

  const sets: ContentSetPreview[] | undefined = useSelector(
    (store) => store.content.previews,
  )
  const socket = useContext(SocketContext)
  const [isLoading, setLoading] = useState(false)

  useEffect(() => {
    if (socket) {
      socket.getContentList()
    }
  })

  const createGame = useCallback(
    async (event: CreateGameEvent): Promise<void> => {
      if (socket) {
        try {
          setLoading(true)
          const response = await socket.send({
            type: 'create-game',
            contentSets: event.contentSets,
            name: event.name,
          })
          if (response.type === 'create-game') {
            await socket.getSession()
            dispatch(goBack())
          }
        } catch {}
        setLoading(false)
      }
    },
    [dispatch, socket],
  )

  return (
    <NewGameForm
      disabled={isLoading}
      onCreateGame={createGame}
      contentSets={sets || []}
    />
  )
}

export default NewGameContainer
