import { Context } from 'aws-lambda'

export async function handler(event: any, context: Context) {
  console.log('Remaining time: ', context.getRemainingTimeInMillis())
  console.log('Function name: ', context.functionName)
  return context.logStreamName
}
