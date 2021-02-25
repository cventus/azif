import { assemble } from '../../inject'

import { TestModule } from '../ddb/TestClient'
import { DDBUsersService } from './DDBUsersService'
import { UsersService } from './UsersService'
import { User } from '.'
import { SilentLogger } from '../logger'

describe('DDBUsersService', () => {
  let service: UsersService
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const assembly = await assemble({
      ...TestModule,
      Logger: SilentLogger,
      DDBUsersService,
    })
    service = assembly.get('DDBUsersService')
    cleanup = () => assembly.destroy()
  })

  afterEach(() => cleanup())

  describe('when creating a user', () => {
    const userJohn = expect.objectContaining({ name: 'John Doe' })

    it('.createUser() should create new users', async () => {
      const request = service.createUser('John Doe', {
        username: 'john',
        password: 'very-secret',
      })

      await expect(request).resolves.toEqual(userJohn)
    })

    it('two users should be able to have the same name', async () => {
      const request = Promise.all([
        service.createUser('John Doe', {
          username: 'john-1',
          password: 'very-secret',
        }),
        service.createUser('John Doe', {
          username: 'john-2',
          password: 'very-secret',
        }),
      ])
      await expect(request).resolves.toEqual([
        expect.objectContaining({ name: 'John Doe' }),
        expect.objectContaining({ name: 'John Doe' }),
      ])
    })

    it('usernames must be unique', async () => {
      await service.createUser('John Doe', {
        username: 'john',
        password: 'very-secret',
      })

      const request = service.createUser('John Doe', {
        username: 'john',
        password: 'very-secret',
      })

      await expect(request).rejects.toThrow()
    })

    it('failed user creation leaves no garbage state', async () => {
      await service.createUser('John Doe', {
        username: 'john',
        password: 'very-secret',
      })

      const usersBefore = await service.listUsers()
      const credentialsBefore = await service.listCredentials()

      await expect(
        service.createUser('John Doe', {
          username: 'john',
          password: 'very-secret',
        }),
      ).rejects.toThrow()

      const usersAfter = await service.listUsers()
      const credentialsAfter = await service.listCredentials()

      expect(usersBefore).toEqual(usersAfter)
      expect(credentialsBefore).toEqual(credentialsAfter)
    })
  })

  describe('given a few users', () => {
    let user: User
    let alice: User
    let bob: User

    beforeEach(async () => {
      user = await service.createUser('John Doe', {
        username: 'john',
        password: 'very-secret',
      })
      alice = await service.createUser('Alice', {
        username: 'alice',
        password: 'password',
      })
      bob = await service.createUser('Bob', {
        username: 'bob',
        password: 'very-secret',
      })
    })

    describe('.authenticate()', () => {
      it('should retrurn the matching user given the correct credentials', async () => {
        const authenticatedUser = await service.authenticate(
          'john',
          'very-secret',
        )

        expect(authenticatedUser).toEqual(user)
      })

      it('should return undefined when the incorrect password is given', async () => {
        const auth = await service.authenticate('john', 'incorrect-password')

        expect(auth).toBe(undefined)
      })

      it('should return undefined when the username is unknown', async () => {
        const auth = await service.authenticate('floyd', 'password')

        expect(auth).toBe(undefined)
      })
    })

    it('.listUsers() should return users', async () => {
      const { results: users } = await service.listUsers()

      expect(users).toEqual(expect.arrayContaining([user, alice, bob]))
    })

    it('.listCredentials() should return credentials', async () => {
      const { results: credentials } = await service.listCredentials()

      expect(credentials).toEqual(
        expect.arrayContaining([
          { username: 'john', userId: user.id },
          { username: 'alice', userId: alice.id },
          { username: 'bob', userId: bob.id },
        ]),
      )
    })

    it('.removeUser() should remove a user', async () => {
      await service.removeUser(user.id)
      const { results: users } = await service.listUsers()
      const { results: credentials } = await service.listCredentials()

      expect(users).toEqual(expect.arrayContaining([alice, bob]))
      expect(credentials).toEqual(
        expect.arrayContaining([
          { username: 'alice', userId: alice.id },
          { username: 'bob', userId: bob.id },
        ]),
      )
    })

    it(`.setName() should update a user's name`, async () => {
      const updatedUser = await service.setName(user.id, 'Jane Doe')

      expect(updatedUser).toEqual({ ...user, name: 'Jane Doe' })
    })

    it(`.setUsername() should update a user's username`, async () => {
      await service.setUsername(user.id, 'johnny')

      const oldAuth = await service.authenticate('john', 'very-secret')
      const newAuth = await service.authenticate('johnny', 'very-secret')

      expect(oldAuth).toBe(undefined)
      expect(newAuth).toEqual(user)
    })

    it(`.setPassword() should update a user's password`, async () => {
      await service.setPassword(user.id, 'even-more-secret')

      const oldAuth = await service.authenticate('john', 'very-secret')
      const newAuth = await service.authenticate('john', 'even-more-secret')

      expect(oldAuth).toBe(undefined)
      expect(newAuth).toEqual(user)
    })
  })
})
