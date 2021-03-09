import crypto from 'crypto'
import { promisify } from 'util'

import { Logger } from '../logger'
import { inject } from '../../inject'
import {
  Delete,
  DocumentClient,
  DynamoDbSet,
  Get,
  Put,
  Update,
} from '../ddb/DocumentClient'
import { TableConfig } from '../ddb/TableConfig'
import { Optional, StructureType, validate } from '../../structure'
import { generateId, randomBytes } from '../generateId'

import { User } from '.'
import { UsersService } from './UsersService'

const KeyIterations = 10000
const KeyLength = 64
const SaltBytes = 16

const CredentialsItem = {
  id: String, // credentials:<username>
  salt: String,
  iterations: Number,
  derivedKey: String,
  userId: String,
}
type CredentialsItem = StructureType<typeof CredentialsItem>
const isCredentialsItem = validate(CredentialsItem)

interface DerivedPassword {
  salt: string
  iterations: number
  derivedKey: string
}

const UserItem = {
  id: String, // user:<random>
  name: String,
  username: String,
  gameIds: Optional(Array(String)),

  recentGameId: Optional(String),
  recentGameEpoch: Optional(Number),
}
type UserItem = StructureType<typeof UserItem>
export const isUserItem = validate(UserItem)

function itemToUser(item: UserItem): User {
  return {
    id: item.id,
    name: item.name,
    gameIds: item.gameIds || [],
  }
}

const userKey = (userId: string) => ({ id: userId })
const credentialsKey = (username: string) => ({ id: `credentials:${username}` })

const UsernameRegex = /^[a-zA-Z][a-zA-Z0-9]{0,23}$/
const NameRegex = /^[a-zA-Z][a-zA-Z0-9]{0,63}$/

const pbkdf2 = promisify(crypto.pbkdf2)

async function makeDerivedKey(
  password: string,
  salt: string,
  iterations: number,
  keyLength: number,
): Promise<string> {
  const derivedKey = await pbkdf2(
    Buffer.from(password, 'utf-8'),
    salt,
    iterations,
    keyLength,
    'sha512',
  )
  return derivedKey.toString('hex')
}

async function checkPassword(
  password: string,
  params: DerivedPassword,
): Promise<boolean> {
  const { salt, iterations, derivedKey } = params
  const keyLength = derivedKey.length / 2 // Two hex-digits = one byte
  const userDerivedKey = await makeDerivedKey(
    password,
    salt,
    iterations,
    keyLength,
  )
  return userDerivedKey === derivedKey
}

export const UsersTableActions = (TableName: string) => ({
  addGames(userId: string, gameIds: DynamoDbSet): Update {
    return {
      TableName,
      Key: userKey(userId),
      UpdateExpression: 'ADD gameIds :i',
      ExpressionAttributeValues: { ':i': gameIds },
      ConditionExpression: 'attribute_exists(id)',
    }
  },
  removeGames(userId: string, gameIds: DynamoDbSet): Update {
    return {
      TableName,
      Key: userKey(userId),
      UpdateExpression: 'DELETE gameIds :i',
      ExpressionAttributeValues: { ':i': gameIds },
      ConditionExpression: 'attribute_exists(id)',
    }
  },
  getUser(userId: string): Get {
    const Key = userKey(userId)
    return {
      TableName,
      Key,
    }
  },
  setUsername(userId: string, newUsername: string): Update {
    return {
      TableName,
      Key: userKey(userId),
      UpdateExpression: 'SET username = :u',
      ExpressionAttributeValues: { ':u': newUsername },
      ConditionExpression: 'attribute_exists(id)',
    }
  },
})

export const CredentialsTableActions = (TableName: string) => ({
  replaceUsername(item: CredentialsItem, newUsername: string): [Put, Delete] {
    const put: Put = {
      TableName,
      Item: { ...item, id: `credentials:${newUsername}` },
      ConditionExpression: 'attribute_not_exists(id)',
    }
    const _delete: Delete = {
      TableName,
      Key: { id: item.id },
      ConditionExpression: 'attribute_exists(id)',
    }
    return [put, _delete]
  },
})

export interface DDBUsersService extends UsersService {}

export const DDBUsersService = inject(
  { DocumentClient, TableConfig, Logger },
  ({ DocumentClient: client, TableConfig, Logger: logger }) => {
    const TableName = TableConfig.tables.users

    async function getCredentials(
      username: string,
    ): Promise<CredentialsItem | undefined> {
      if (!username.match(UsernameRegex)) {
        return undefined
      }
      const Key = credentialsKey(username)
      const { Item: credentials } = await client
        .get({ TableName, Key })
        .promise()
      if (isCredentialsItem(credentials)) {
        return credentials
      }
    }

    async function getUser(userId: string): Promise<UserItem | undefined> {
      const Key = userKey(userId)
      const { Item: user } = await client.get({ TableName, Key }).promise()
      if (isUserItem(user)) {
        return user
      }
    }

    const service: DDBUsersService = {
      async authenticate(username, password) {
        try {
          const credentials = await getCredentials(username)
          if (!credentials) {
            // User not found
            return
          }
          const isPasswordCorrect = await checkPassword(password, credentials)
          if (!isPasswordCorrect) {
            // Wrong password
            return
          }
          const user: UserItem | undefined = await getUser(credentials.userId)
          if (!user) {
            logger.warn(
              {
                username,
              },
              'No user found despite matching credentials',
            )
            return
          }
          return itemToUser(user)
        } catch (e) {
          logger.error(e, 'authenticate')
          return undefined
        }
      },
      async get(userId) {
        const user = await getUser(userId)
        if (user)  {
          return itemToUser(user)
        }
      },
      async listUsers(token?) {
        const ExclusiveStartKey = token ? { id: token } : undefined
        const { Items: items = [], LastEvaluatedKey } = await client
          .scan({
            TableName,
            Limit: 20,
            FilterExpression: 'begins_with(id, :s)',
            ExpressionAttributeValues: { ':s': 'user:' },
            ExclusiveStartKey,
          })
          .promise()
        const results = items.filter(isUserItem).map(itemToUser)
        return { results, token: LastEvaluatedKey && LastEvaluatedKey.id }
      },
      async listCredentials(token?) {
        const ExclusiveStartKey = token ? { id: token } : undefined
        const { Items: items = [], LastEvaluatedKey } = await client
          .scan({
            TableName,
            Limit: 20,
            FilterExpression: 'begins_with(id, :s)',
            ExpressionAttributeValues: { ':s': 'credentials:' },
            ExclusiveStartKey,
          })
          .promise()
        const results = items
          .filter(isCredentialsItem)
          .map(({ id, userId }) => {
            const username = id.substring(id.indexOf(':') + 1)
            return { username, userId }
          })
        return { results, token: LastEvaluatedKey && LastEvaluatedKey.id }
      },
      async createUser(name, credentials) {
        const id = await generateId()
        const userId = `user:${id}`

        const iterations = KeyIterations
        const salt = await randomBytes(SaltBytes).then((b) => b.toString('hex'))
        const keyLength = KeyLength
        const derivedKey = await makeDerivedKey(
          credentials.password,
          salt,
          iterations,
          keyLength,
        )

        const credentialsKey = `credentials:${credentials.username}`
        const credentialsItem: CredentialsItem = {
          id: credentialsKey,
          iterations,
          salt,
          derivedKey,
          userId,
        }

        const userItem: UserItem = {
          id: userId,
          username: credentials.username,
          name,
        }

        const ConditionExpression = 'attribute_not_exists(id)'

        try {
          await client
            .transactWrite({
              TransactItems: [
                {
                  Put: {
                    TableName,
                    Item: credentialsItem,
                    ConditionExpression,
                  },
                },
                { Put: { TableName, Item: userItem, ConditionExpression } },
              ],
            })
            .promise()

          return {
            id: userId,
            name,
            gameIds: [],
          } as User
        } catch (e) {
          logger.error(
            { newUser: { username: credentials.username } },
            'Failed to create user',
          )
          throw e
        }
      },
      async removeUser(userId) {
        const user = await getUser(userId)
        if (user) {
          await client
            .transactWrite({
              TransactItems: [
                {
                  Delete: {
                    TableName,
                    Key: { id: `credentials:${user.username}` },
                  },
                },
                { Delete: { TableName, Key: { id: userId } } },
              ],
            })
            .promise()
        }
      },
      async setName(userId, name) {
        const { Attributes: user } = await client
          .update({
            TableName,
            Key: { id: userId },
            UpdateExpression: 'SET #name = :name',
            ExpressionAttributeValues: { ':name': name },
            ExpressionAttributeNames: { '#name': 'name' },
            ReturnValues: 'ALL_NEW',
          })
          .promise()
        if (!isUserItem(user)) {
          throw new Error('Bad user returned')
        }
        return itemToUser(user)
      },
      async setUsername(userId, username) {
        const user = await getUser(userId)
        if (!user) {
          throw new Error(`User not found: ${userId}`)
        }
        const Key = credentialsKey(user.username)
        const { Item: credentials } = await client
          .get({ TableName, Key })
          .promise()
        if (!isCredentialsItem(credentials)) {
          throw new Error(`Bad credentials ${user.username}`)
        }

        const usersActions = UsersTableActions(TableName)
        const credentialsActions = CredentialsTableActions(TableName)
        try {
          const [Put, Delete] = credentialsActions.replaceUsername(
            credentials,
            username,
          )
          // 6 read capacity, 6 write capactiy, although this should be a somewhat rare operation
          await client
            .transactWrite({
              TransactItems: [
                { Delete },
                { Update: usersActions.setUsername(userId, username) },
                { Put },
              ],
            })
            .promise()
        } catch (e) {
          logger.error({ err: e, userId, username }, 'Failed to set username')
          throw e
        }
      },
      async setPassword(userId, password) {
        const user = await getUser(userId)
        if (user) {
          const iterations = KeyIterations
          const salt = await randomBytes(SaltBytes).then((b) =>
            b.toString('hex'),
          )
          const keyLength = KeyLength
          const derivedKey = await makeDerivedKey(
            password,
            salt,
            iterations,
            keyLength,
          )

          await client
            .update({
              TableName,
              Key: credentialsKey(user.username),
              UpdateExpression:
                'SET salt = :s, iterations = :i, derivedKey = :k',
              ExpressionAttributeValues: {
                ':s': salt,
                ':i': iterations,
                ':k': derivedKey,
              },
            })
            .promise()
        }
      },
    }

    return service
  },
)
