import fs from 'node:fs/promises'
import path from 'node:path'
import logger from 'loglevel'
import { program } from 'commander'
import Bot from './tw-shopee-bot'
import { isValidPassword } from './util'
import * as exitCode from './exit-code'

const version = '1.1.0'
const majorVersion = version.split('.')[0]
program
  .name(`docker run -it hyperbola/shopee-coins-bot:${majorVersion}`)
  .description('A check-in bot for Shopee.')
  .option('-u, --user <USERNAME>', 'shopee username')
  .option('-p, --pass <PASSWORD>', 'shopee password')
  .option('-P, --path-to-pass <FILE>', 'password file')
  .option('-c, --cookie <FILE>', 'cookie file')
  .option('-i, --ignore-password', 'do not save username and password with cookies')
  .option('-x, --no-sms', 'do not use SMS login')
  .option('-q, --quiet', 'do not output message')
  .option('-s, --screenshot <DIR>', 'directory to save screenshot if checkin failed')
  .option('-f, --force', 'no error if coins already received')
  .version(version)
  .exitOverride((e) => process.exit(e.exitCode === 1 ? exitCode.INVALID_OPTIONS : e.exitCode))

const args = program
  .parse(process.argv)
  .opts()

if (program.args.length) {
  logger.error('Unknown option: ' + program.args[0])
  process.exit(exitCode.INVALID_OPTIONS)
}

if (args.quiet) {
  if (process.env['DEBUG']) {
    logger.setDefaultLevel('debug')
    logger.warn('Option `--quiet` is ignored in debug mode.')
  }
  else {
    logger.setDefaultLevel('warn')
  }
}
else if (process.env['DEBUG']) {
  logger.setDefaultLevel('debug')
}
else {
  logger.setDefaultLevel('info')
}

function getUsername(): string | undefined {
  return process.env['USERNAME'] || args.user
}

async function getPassword(): Promise<string | undefined> {
  let pass = process.env['PASSWORD']
  if (pass) {
    return pass
  }

  pass = args.pass
  if (pass) {
    logger.warn('Passing password from command line is considered insecure. Should use environment variable or password file.')
    return pass
  }

  // Try to read password from file.
  let passPath: string | undefined = process.env['PATH_PASS'] || args.pathToPass
  if (passPath) {
    passPath = path.resolve(passPath)
    logger.debug('Try to read password: ' + passPath)
    try {
      let pass = await fs.readFile(passPath, 'utf-8')
      // Get the first line of password file
      const passwordLines = pass.split('\n')
      if (passwordLines.length > 1) {
        logger.warn('Read more than one lines from password file. Only the first line is considered password.')
      }
      pass = passwordLines[0]
      logger.debug('Password read from file.')
      return pass
    } catch (e: unknown) {
      logger.error('Failed to read password from file: ' + passPath)
      throw e
    }
  }

  return undefined
}

function getCookies(): string | undefined {
  const cookie = process.env['COOKIE'] || args.cookie
  return cookie && path.resolve(cookie)
}

async function main() {
  logger.info('Start shopee coins bot v' + version + '.')

  logger.debug('dump arguments')
  logger.debug(JSON.stringify(args))

  const username: string | undefined = getUsername()
  const password: string | undefined = await getPassword()
  const cookies: string | undefined = getCookies()
  const smsLogin: boolean = args.sms
  const ignorePassword: boolean = args.ignorePassword
  const screenshot: string | undefined = args.screenshot

  if (ignorePassword) {
    logger.warn('option `--ignore-password` has been deprecated and will be removed in the future.')
  }

  if (!cookies && (!username || !password)) {
    // Neither cookie nor password is given.
    logger.error('Failed to login. Missing username or password.')
    process.exit(exitCode.WRONG_PASSWORD)
  }

  // On v1.0.9 strict password checking was removed because of issue #4; log
  // warning message instead.
  // if (!cookies && !isValidPassword(password)) {
  if (password && !isValidPassword(password)) {
    // logger.error('Login failed: wrong password.')
    // process.exit(EXIT_CODE_WRONG_PASSWORD)
    logger.warn('Password length does not meet the requirement (length 8-16). Was this password set long time ago?')
    logger.warn('I will let you go. Please refer to this issue: https://github.com/wdzeng/shopee-coins-bot/issues/4')
  }

  // Warn if using screenshot in kelly image
  if (process.env['IMAGE_VARIANT'] === 'kelly' && screenshot) {
    logger.warn('You are using kelly image. You may not see CJK characters in screenshots.')
  }

  // Run bot.
  const bot = new Bot(username, password, cookies)
  let result: number
  try {
    result = await bot.run(!smsLogin, ignorePassword, screenshot)
  } catch (e: unknown) {
    // unknown error
    result = exitCode.UNKNOWN_ERROR
  }

  // Update exit code if force is set.
  if (result === 1 && args.force) {
    result = 0
  }

  process.exit(result)
}

main()
