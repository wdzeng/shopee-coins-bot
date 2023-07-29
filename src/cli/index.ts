#!/usr/bin/env node

import fs from 'node:fs'

import { Option, program } from 'commander'

import ShopeeBot, { type CheckinHistory } from '@/api'
import { InvalidCookieError, ShopeeError, UserNotLoggedInError } from '@/api/errors'
import ExitCode from '@/cli/exit-code'
import * as logger from '@/cli/log'
import { version } from '@/cli/version'

function handleError(e: unknown): never {
  if (e instanceof InvalidCookieError) {
    logger.error('Invalid cookie.')
    process.exit(ExitCode.INVALID_COOKIE)
  }

  if (e instanceof UserNotLoggedInError) {
    logger.error('You are not logged in. Is your cookie expired?')
    process.exit(ExitCode.LOGIN_DENIED)
  }

  if (e instanceof ShopeeError) {
    logger.error('Shopee server: %s', e.message)
    logger.debug('Error code: %d', e.code)
    process.exit(ExitCode.UNKNOWN_ERROR)
  }

  // Unexpected error.
  if (e instanceof Error && e.stack) {
    logger.debug('%s', e.stack)
  }
  const errMsg: unknown = e instanceof Error ? e.message : e
  logger.error('Unexpected error: %s', typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg))
  process.exit(ExitCode.UNKNOWN_ERROR)
}

function readCookieFromFile(path: string): string {
  let cookieContent: string
  try {
    cookieContent = fs.readFileSync(path, 'utf8')
  } catch (e: unknown) {
    handleError(e)
  }

  const lines = cookieContent.split('\n')
  if (lines.length === 0) {
    logger.error('Cookie is empty.')
    process.exit(ExitCode.INVALID_COOKIE)
  }

  // @ts-expect-error: lines[1] is string
  if (lines.length > 2 || (lines.length === 2 && lines[1].length > 0)) {
    logger.warn('Found more than one lines in cookie file; only the first line will be read.')
  }
  // @ts-expect-error: lines[0] is string
  const cookie: string = lines[0]

  if (cookie.length === 0) {
    logger.error('Cookie is empty.')
    process.exit(ExitCode.INVALID_COOKIE)
  }

  return cookie
}

interface GlobalOptions {
  cookieString: string
}

program
  .name(`docker run hyperbola/shopee-coins-bot:${version}`)
  .description('Give me Shopee coins!')
  .version(version)

program
  .option('-q, --quiet', 'suppress output message', false) // Don't wrap
  .hook('preAction', (thisCommand) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const quietOption = thisCommand.opts().quiet
    if (quietOption) {
      process.env.QUIET = '1'
    }
  })

program
  .requiredOption('-c, --cookie <FILE>', 'path to cookie file')
  .hook('preAction', (thisCommand, actionCommand) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cookieOption: string = thisCommand.opts().cookie
    actionCommand.opts().cookieString = readCookieFromFile(cookieOption)
  })

// Disallow any unused argument.
program.hook('preAction', (_thisCommand, actionCommand) => {
  if (actionCommand.args.length > 0) {
    logger.error(`Unknown option: ${actionCommand.args[0]}`)
    process.exit(ExitCode.INVALID_OPTIONS)
  }
})

program
  .command('checkin')
  .description('Checkin to get Shopee coins')
  .option('-f --force', 'force checkin even if already checked in', false)
  .action(async (options: GlobalOptions & { force: boolean }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const force = options.force
    const bot = new ShopeeBot(options.cookieString)
    let result: number | false

    try {
      result = await bot.checkin()
    } catch (e: unknown) {
      handleError(e)
    }

    if (typeof result === 'number') {
      // Checkin succeeded.
      logger.info(`Checkin succeeded; received coins: ${result}`)
      process.exit(0)
    }

    // Already checked in.
    if (force) {
      logger.info('Already checked in.')
      process.exit(0)
    }

    logger.error('Already checked in.')
    process.exit(ExitCode.ALREADY_RECEIVED)
  })

program
  .command('balance')
  .description('Get my Shopee coins balance')
  .action(async (options: GlobalOptions) => {
    const bot = new ShopeeBot(options.cookieString)
    let balance: number
    try {
      balance = await bot.getBalance()
    } catch (e: unknown) {
      handleError(e)
    }
    console.log('%d', balance)
  })

program
  .command('history')
  .description('Get my Shopee coins checkin history')
  .addOption(new Option('-o, --output [format]').choices(['raw', 'json']).default('raw'))
  .action(async (options: GlobalOptions & { output: 'raw' | 'json' }) => {
    const bot = new ShopeeBot(options.cookieString)
    let history: CheckinHistory
    try {
      history = await bot.getCheckinHistory()
    } catch (e: unknown) {
      handleError(e)
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const outputFormat = options.output
    if (outputFormat === 'json') {
      console.log(JSON.stringify(history))
      process.exit(0)
    }

    const outputLines = []
    for (let i = 0; i < 7; i++) {
      let outputLine = ''
      const checkedIn =
        i < history.todayIndex || (i === history.todayIndex && history.checkedInToday)
      outputLine += checkedIn ? '✅' : '⬜'
      outputLine += ' '
      outputLine += history.amounts[i]?.toFixed(2)
      if (i === history.todayIndex) {
        outputLine += ' <'
      }
      outputLines.push(outputLine)
    }
    console.log(outputLines.join('\n'))
  })

program
  .command('whoami')
  .description('Get my Shopee username')
  .action(async (options: GlobalOptions) => {
    logger.debug(options.cookieString)
    const bot = new ShopeeBot(options.cookieString)
    let username
    try {
      username = await bot.getLoginUser()
    } catch (e: unknown) {
      handleError(e)
    }
    console.log(username)
    process.exit(0)
  })

// Override exit code when user gives invalid arguments.
program.exitOverride((e) => process.exit(e.exitCode === 1 ? ExitCode.INVALID_OPTIONS : e.exitCode))

// If no command is matched, show help message.
program.action(() => {
  program.help({ error: true })
})

// If user does not give any arguments, suppress missing argument error message; show help message.
if (process.argv.length === 2) {
  program.help({ error: true })
}

program.parse()
