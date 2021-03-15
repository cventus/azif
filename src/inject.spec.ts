import { inject, assemble } from './inject'

// Declare injectable Colors:string[]
const Colors = inject<string[]>()

// Define constant provider Name:string
const Name = inject('John Doe')

// Define provider with dependencies
const Message = inject({ Name, Colors }, ({ Name: name, Colors: colors }) => {
  return `Hello! My name is ${name}. I like ${colors.join(', ')}.`
})

describe('assemble', () => {
  it('should assemble providers into an assembly', async () => {
    const assembly = await assemble({
      Name,
      Message,
      // Define a provider for Color:string[]
      Colors: inject(['red', 'green', 'blue']),
    })

    const message = assembly.get('Message')

    expect(message).toBe('Hello! My name is John Doe. I like red, green, blue.')
  })

  it('should create aliased providers only once', async () => {
    let count = 0
    const instanceCounter = inject({}, () => {
      count += 1
      return count
    })

    await assemble({
      instanceCounter,
      foo: instanceCounter,
      bar: instanceCounter,
      baz: instanceCounter,
    })

    expect(count).toBe(1)
  })
})
