import { inject, assemble } from '../src/inject'

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
})
