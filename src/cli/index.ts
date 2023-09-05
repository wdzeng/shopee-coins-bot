import { Option, program } from '@commander-js/extra-typings'

import ShopeeBot, { type CheckinHistory } from '@/api'
import { getCookie, loadCookie } from '@/cli/cookie'
import { handleError } from '@/cli/error'
import ExitCode from '@/cli/exit-code'
import * as logger from '@/cli/log'
import { version } from '@/cli/version'

program
  .name(`docker run hyperbola/shopee-coins-bot:${version}`)
  .description('Give me Shopee coins!')
  .version(version)

program
  .option('-q, --quiet', 'suppress output message', false) // Don't wrap
  .hook('preAction', (thisCommand) => {
    logger.setQuiet(thisCommand.opts().quiet)
  })

program
  .requiredOption('-c, --cookie <FILE>', 'path to cookie file')
  .hook('preAction', (thisCommand) => {
    loadCookie(thisCommand.opts().cookie)
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
  .action(async (options) => {
    const force = options.force
    const bot = new ShopeeBot(getCookie())
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
  .action(async () => {
    const bot = new ShopeeBot(getCookie())
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
  .action(async (options) => {
    const bot = new ShopeeBot(getCookie())
    let history: CheckinHistory
    try {
      history = await bot.getCheckinHistory()
    } catch (e: unknown) {
      handleError(e)
    }

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
  .action(async () => {
    const bot = new ShopeeBot(getCookie())
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
