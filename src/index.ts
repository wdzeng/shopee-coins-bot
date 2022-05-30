import fs from 'fs/promises'
import path from 'path'
import { ArgumentParser } from 'argparse'
import logger from 'loglevel'
import Bot from './tw-shopee-bot'

logger.setDefaultLevel(process.env['DEBUG'] ? 'debug' : 'info')

const parser = new ArgumentParser({ description: 'Get shopee coins' })
parser.add_argument('-u', '--user', { help: 'Shopee username.' });
parser.add_argument('-P', '--path-to-pass', { help: 'File which stores password.' });
parser.add_argument('-p', '--pass', { help: 'Shopee password. This overrides `-P`.' });
parser.add_argument('-c', '--cookie', { help: 'Path to cookies.' })
parser.add_argument('-x', '--no-sms', { help: 'Do not use sms login.', action: 'store_true' })
parser.add_argument('-f', '--force', { help: 'No error if coins already received.', action: 'store_true' })
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
      const pass = await fs.readFile(passPath, 'utf-8')
      logger.debug('Password read from file.')
      return pass
    } catch (e: any) {
      logger.error('Failed to read password from file: ' + path)
      throw e
    }
  }

  return undefined
}

function getCookies(): string | undefined {
  const cookie = process.env['COOKIE'] || args['cookie']
  return cookie && path.resolve(cookie)
}

async function main() {
  const username: string | undefined = getUsername()
  const password: string | undefined = await getPassword()
  const cookies: string | undefined = getCookies()
  const noSmsLogin: boolean = args['no_sms']
  logger.debug('username: ' + username)
  logger.debug('password: ' + password)
  logger.debug('cookies: ' + cookies)

  const bot = new Bot(username, password, cookies)
  let result = await bot.run(noSmsLogin)
  if (result === 1 && args['force']) {
    result = 0
  }
  process.exit(result)
}

main()
