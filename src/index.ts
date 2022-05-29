import fs from 'fs/promises'
import { ArgumentParser } from 'argparse'
import logger from 'loglevel'
import Bot from './tw-shopee-bot'

logger.enableAll()

const parser = new ArgumentParser({
  description: 'Get shopee coins'
})

parser.add_argument('-u', '--user', { help: 'Shopee username.' });
parser.add_argument('-P', '--path-to-pass', { help: 'File which stores password.' });
parser.add_argument('-p', '--pass', { help: 'Shopee password. This overrides `-P`.' });
parser.add_argument('-c', '--cookie', { help: 'Path to cookies.' })
parser.add_argument('-x', '--no-sms', { help: 'Do not use sms login.' })
const args = parser.parse_args()

function getUsername(): string | undefined {
  return process.env['USERNAME'] || args['u']
}

async function getPassword(): Promise<string | undefined> {
  const pass = process.env['PASS'] || args['p']
  if (pass) {
    return pass
  }

  // Try to read password from file.
  const path = process.env['PASS_PATH'] || args['P']
  if (path) {
    logger.debug('Try to read password: ' + path)
    return fs.readFile(path, 'utf-8')
  }

  return undefined
}

function getCookies(): string | undefined {
  return process.env['COOKIE'] || args['c']
}

async function main() {
  const username = getUsername()
  const password = await getPassword()
  const cookies = getCookies()
  const noSmsLogin = args['x']

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
