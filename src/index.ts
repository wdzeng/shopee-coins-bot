import fs from 'fs/promises'
import path from 'path'
import { ArgumentParser } from 'argparse'
import logger from 'loglevel'
import Bot from './tw-shopee-bot'

if (process.env['DEBUG'] !== undefined) {
  logger.setDefaultLevel('debug')
}

const parser = new ArgumentParser({ description: 'Get shopee coins' })
parser.add_argument('-u', '--user', { help: 'Shopee username.' });
parser.add_argument('-P', '--path-to-pass', { help: 'File which stores password.' });
parser.add_argument('-p', '--pass', { help: 'Shopee password. This overrides `-P`.' });
parser.add_argument('-c', '--cookie', { help: 'Path to cookies.' })
parser.add_argument('-x', '--no-sms', { help: 'Do not use sms login.', action: 'store_true' })
const args = parser.parse_args()

logger.debug(args)

function getUsername(): string | undefined {
  return process.env['USERNAME'] || args['user']
}

async function getPassword(): Promise<string | undefined> {
  const pass = process.env['PASS'] || args['pass']
  if (pass) {
    return pass
  }

  // Try to read password from file.
  let passPath: string | undefined = process.env['PATH_PASS'] || args['path_to_pass']
  if (passPath) {
    passPath = path.resolve(passPath)
    logger.debug('Try to read password: ' + path)
    try {
      return await fs.readFile(passPath, 'utf-8')
    } catch (e: any) {
      logger.error('Failed to read password: ' + path)
      process.exit(255)
    }
  }

  return undefined
}

function getCookies(): string | undefined {
  const cookie = process.env['COOKIE'] || args['cookie']
  return cookie && path.resolve(cookie)
}

async function main() {
  const username = getUsername()
  const password = await getPassword()
  const cookies = getCookies()
  const noSmsLogin = args['no_sms']

  logger.debug('username: ' + username)
  logger.debug('password: ' + password)
  logger.debug('cookies: ' + cookies)

  try {
    const bot = new Bot(username, password, cookies)
    await bot.run(!noSmsLogin)
  } catch (e: unknown) {
    if (e instanceof Error) {
      logger.error('Unexpected error: ' + e.message)
    }
    else {
      logger.error('Unexpected error occurred.')
    }
    throw e
  }
}

main()
