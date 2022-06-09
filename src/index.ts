import fs from 'fs/promises'
import path from 'path'
import logger from 'loglevel'
import Bot, { EXIT_CODE_WRONG_PASSWORD } from './tw-shopee-bot'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const version = '1.3'
const args = yargs(hideBin(process.argv))
  .usage('docker run -it hyperbola/shopee-coins-bot:v1 [options]')
  .options({
    user: {
      alias: 'u',
      description: 'shopee username',
      requiresArg: true,
      required: false,
      type: 'string'
    },
    pass: {
      alias: 'p',
      description: 'shopee password',
      requiresArg: true,
      required: false,
      type: 'string'
    },
    'path-to-pass': {
      alias: 'P',
      description: 'password file',
      requiresArg: true,
      required: false,
      type: 'string'
    },
    cookie: {
      alias: 'c',
      description: 'cookie file',
      requiresArg: true,
      required: false,
      type: 'string'
    },
    'no-sms': {
      alias: 'x',
      description: 'do not use SMS login',
      boolean: true,
      default: false,
    },
    force: {
      alias: 'f',
      description: 'no error if coins already received',
      boolean: true,
      default: false
    }
  })
  .help('help', 'show this message').alias('help', 'h')
  .version('version', 'show version number', version).alias('version', 'v')
  .parseSync()

logger.setDefaultLevel(process.env['DEBUG'] ? 'debug' : 'info')

function getUsername(): string | undefined {
  return process.env['USERNAME'] || args['user']
}

async function getPassword(): Promise<string | undefined> {
  const pass = process.env['PASS'] || args['pass']
  if (pass) {
    return pass
  }

  // Try to read password from file.
  let passPath: string | undefined = process.env['PATH_PASS'] || args['path-to-pass']
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
  const noSmsLogin: boolean = args['no-sms']
  logger.debug('username: ' + username)
  logger.debug('password: ' + password)
  logger.debug('cookies: ' + cookies)

  if (!cookies && (!username || !password)) {
    // Neither cookie nor password is given.
    logger.error('Failed to login. Missing username or password.')
    process.exit(EXIT_CODE_WRONG_PASSWORD)
  }

  // Run bot.
  const bot = new Bot(username, password, cookies)
  let result = await bot.run(noSmsLogin)

  // Update exit code if force is set.
  if (result === 1 && args['force']) {
    result = 0
  }

  process.exit(result)
}

main()
