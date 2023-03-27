import fs from 'node:fs/promises'
import path from 'node:path'
import logger from 'loglevel'
import {
  Browser,
  Builder,
  By,
  error,
  IWebDriverOptionsCookie,
  until,
  WebDriver
} from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome'
import { ExitCode } from './exit-code'
import * as Text from './text'
import { xpathByText } from './util'

const TIMEOUT_AUTH = 10 * 60 * 1000 // 10 min
const TIMEOUT_OPERATION = 2 * 60 * 1000 // 2 min

interface ShopeeCredential {
  username: string | undefined
  password: string | undefined
  cookies: IWebDriverOptionsCookie[]
}

export default class TaiwanShopeeBot {
  private driver!: WebDriver

  constructor(
    private username: string | undefined,
    private password: string | undefined,
    private pathCookie: string | undefined
  ) {}

  private async tryLogin(): Promise<number | undefined> {
    logger.info('Start to login shopee.')

    // Go to the login page. If the user is already logged in, the webpage will
    // be soon redirected to the coin check-in page. Since the login form still
    // shows temporarily in this case, we could not determine if the user is not
    // logged in even if the login form appears. An alternative way is to wait
    // for a delay (4s), and if the webpage stays at the login page, we assert
    // that the user is not logged in.
    const urlLogin =
      'https://shopee.tw/buyer/login?from=https%3A%2F%2Fshopee.tw%2Fuser%2Fcoin&next=https%3A%2F%2Fshopee.tw%2Fshopee-coins'
    await this.driver.get(urlLogin)
    await new Promise(res => setTimeout(res, 4000))
    const curUrl = await this.driver.getCurrentUrl()
    logger.debug('Currently at url: %s', curUrl)

    const urlCoin = 'https://shopee.tw/shopee-coins'
    if (curUrl === urlCoin) {
      // The webpage is redirected to the coin check-in page and therefore the
      // user must have been logged in.
      logger.info('Already logged in.')
      return
    }
    // The webpage stays at the login page after the delay (4s). We assert that
    // the user is not logged in.

    // If username or password is not specified, the login fails.
    if (!this.username || !this.password) {
      logger.error('Failed to login. Missing username or password.')
      return ExitCode.WRONG_PASSWORD
    }

    // On v1.0.9 strict password checking was removed; see #4.
    // if (!isValidPassword(this.password)) {
    //   logger.error('Login failed: wrong password.')
    //   process.exit(EXIT_CODE_WRONG_PASSWORD)
    // }

    // Now try to fill the login form and submit it.
    logger.info('Try to login by username and password.')

    // Fill username and password inputs.
    const inputUsername = await this.driver.findElement(By.name('loginKey'))
    await inputUsername.sendKeys(this.username)
    const inputPassword = await this.driver.findElement(By.name('password'))
    await inputPassword.sendKeys(this.password)

    // Submit form.
    // Wait until the login button is enabled.
    const btnLogin = await this.driver.findElement(
      By.xpath(xpathByText('button', '登入'))
    )
    await this.driver.wait(until.elementIsEnabled(btnLogin), TIMEOUT_OPERATION)
    btnLogin.click() // do not await for this click since it may hang = =
    logger.info('Login form submitted. Waiting for redirect.')

    // Wait for something happens.
    const xpath = [
      ...Text.WRONG_PASSWORDS.map(e => xpathByText('div', e)),
      xpathByText('button', Text.PLAY_PUZZLE),
      xpathByText('div', Text.USE_LINK),
      xpathByText('div', Text.TOO_MUCH_TRY),
      xpathByText('div', Text.SHOPEE_REWARD),
      xpathByText('div', Text.USE_EMAIL_LINK)
    ].join('|')
    const result = await this.driver.wait(
      until.elementLocated(By.xpath(xpath)),
      TIMEOUT_OPERATION
    )
    const text = await result.getText()

    if (text === Text.SHOPEE_REWARD) {
      // login succeeded
      logger.info('Login succeeded.')
      return
    }
    if (Text.WRONG_PASSWORDS.includes(text)) {
      // wrong password
      logger.error('Login failed: wrong password.')
      return ExitCode.WRONG_PASSWORD
    }
    if (text === Text.PLAY_PUZZLE) {
      // need to play puzzle
      logger.error('Login failed: I cannot solve the puzzle.')
      return ExitCode.CANNOT_SOLVE_PUZZLE
    }
    if (text === Text.USE_LINK) {
      // need to authenticate via SMS link
      logger.warn('Login failed: please login via SMS.')
      return ExitCode.NEED_SMS_AUTH
    }
    if (text === Text.USE_EMAIL_LINK) {
      // need to authenticate via email link
      logger.warn('Login failed: please login via email.')
      return ExitCode.NEED_EMAIL_AUTH
    }

    // unknown error
    logger.debug('Unexpected error occurred. Fetched text by xpath: %s', text)
    throw new Error('Unknown error occurred when trying to login.')
  }

  private async tryReceiveCoin(): Promise<number> {
    const xpath = `${xpathByText('button', Text.RECEIVE_COIN)} | ${xpathByText(
      'button',
      Text.COIN_RECEIVED
    )}`
    await this.driver.wait(
      until.elementLocated(By.xpath(xpath)),
      TIMEOUT_OPERATION
    )
    const btnReceiveCoin = await this.driver.findElement(By.xpath(xpath))

    // Check if coin is already received today.
    const text = await btnReceiveCoin.getText()
    if (text.startsWith(Text.COIN_RECEIVED)) {
      // Already received.
      logger.info('Coin already received.')
      return ExitCode.ALREADY_RECEIVED
    }

    await btnReceiveCoin.click()
    await this.driver.wait(
      until.elementLocated(By.xpath(xpathByText('button', Text.COIN_RECEIVED)))
    )

    logger.info('Coin received.')
    return ExitCode.SUCCESS
  }

  private async waitUntilLoginPermitted(): Promise<number | undefined> {
    let result: 'success' | 'foul'
    try {
      const success = new Promise<'success'>((res, rej) => {
        this.driver
          .wait(
            until.urlMatches(/^https:\/\/shopee.tw\/shopee-coins(\?.*)?$/),
            TIMEOUT_AUTH
          )
          .then(() => res('success'))
          .catch(rej)
      })
      const foul = new Promise<'foul'>((res, rej) => {
        this.driver
          .wait(
            until.elementLocated(By.xpath(xpathByText('div', Text.FAILURE))),
            TIMEOUT_AUTH
          )
          .then(() => res('foul'))
          .catch(rej)
      })
      result = await Promise.any([success, foul])
    } catch (e: unknown) {
      // timeout error
      if (
        e instanceof AggregateError &&
        e.errors.length === 2 &&
        e.errors[0] instanceof error.TimeoutError &&
        e.errors[1] instanceof error.TimeoutError
      ) {
        logger.error('You are too slow. Bye bye.')
        throw e.errors[0]
      }

      // unexpected error
      throw e
    }

    if (result === 'success') {
      // Login permitted.
      logger.info('Login permitted.')
      return
    }

    // Login denied.
    logger.error('Login denied.')
    return ExitCode.LOGIN_DENIED
  }

  private async tryLoginWithSmsLink(): Promise<number | undefined> {
    // Wait until the '使用連結驗證' button is available.
    await this.driver.wait(
      until.elementLocated(By.xpath(xpathByText('div', Text.USE_LINK))),
      TIMEOUT_OPERATION
    )

    // Click the '使用連結驗證' button.
    const btnLoginWithLink = await this.driver.findElement(
      By.xpath(xpathByText('div', Text.USE_LINK))
    )
    await btnLoginWithLink.click()

    // Wait until the page is redirect.
    await this.driver.wait(until.urlIs('https://shopee.tw/verify/link'))

    // Check if reaching daily limits.
    const reachLimit = await this.driver.findElements(
      By.xpath(xpathByText('div', Text.TOO_MUCH_TRY))
    )
    if (reachLimit.length > 0) {
      // Failed because reach limits.
      logger.error('Cannot use SMS link to login: reach daily limits.')
      return ExitCode.TOO_MUCH_TRY
    }

    // Now user should click the link sent from Shopee to her mobile via SMS.
    // Wait for user completing the process; by the time the website should be
    // redirected to coin page.
    logger.warn(
      'An SMS message is sent to your mobile.',
      'Once you click the link I will keep going.',
      'I will wait for you and please complete it in 10 minutes.'
    )
    return await this.waitUntilLoginPermitted()
  }

  private async tryLoginWithEmailLink(): Promise<number | undefined> {
    // Wait until the '透過電子郵件連結驗證' button is available.
    await this.driver.wait(
      until.elementLocated(By.xpath(xpathByText('div', Text.USE_EMAIL_LINK))),
      TIMEOUT_OPERATION
    )

    // Click the '透過電子郵件連結驗證' button.
    const btnLoginWithLink = await this.driver.findElement(
      By.xpath(xpathByText('div', Text.USE_EMAIL_LINK))
    )
    await btnLoginWithLink.click()

    // Wait until the page is redirect.
    await this.driver.wait(until.urlIs('https://shopee.tw/verify/email-link'))

    // TODO: check if reaching daily limits.

    // Now user should click the link sent from Shopee to her inbox.
    // Wait for user completing the process; by the time the website should be
    // redirected to coin page.
    logger.warn(
      'An authentication mail is sent to your inbox.',
      'Once you click the link I will keep going.',
      'I will wait for you and please complete it in 10 minutes.'
    )
    return await this.waitUntilLoginPermitted()
  }

  private async saveCookies(ignorePassword: boolean): Promise<void> {
    logger.info('Start to save cookie.')

    try {
      const cookies = await this.driver.manage().getCookies()
      const json: ShopeeCredential = {
        username: ignorePassword ? undefined : this.username,
        password: ignorePassword ? undefined : this.password,
        cookies
      }

      await fs.writeFile(this.pathCookie!, JSON.stringify(json))
      logger.info('Cookie saved.')
    } catch (e: unknown) {
      // Suppress error.
      if (e instanceof Error) {
        logger.warn('Failed to save cookie: %s', e.message)
      } else {
        logger.warn('Failed to save cookie.')
      }
    }
  }

  private async loadCookies(ignorePassword: boolean): Promise<void> {
    logger.info('Start to load cookies.')

    // Connect to dummy page.
    const urlHome = 'https://shopee.tw/'
    await this.driver.get(urlHome)

    // Try to load cookies.
    try {
      const cookiesStr = await fs.readFile(this.pathCookie!, 'utf-8')

      // If the json is an array, then the cookie is generate by bot version
      // <= v1.0.2.
      const json: IWebDriverOptionsCookie[] | ShopeeCredential =
        JSON.parse(cookiesStr)
      let cookies: IWebDriverOptionsCookie[]
      if (Array.isArray(json)) {
        // old version bot (<= v1.0.2)
        logger.warn('The cookies are saved by old version shopee coins bot.')
        cookies = json
      } else {
        if (!ignorePassword) {
          // If username or password is not explicitly set, loads if from
          // credential.
          this.username ||= json.username
          this.password ||= json.password
        }
        cookies = json.cookies
      }

      const options = this.driver.manage()
      await Promise.all(cookies.map(cookie => options.addCookie(cookie)))
      logger.info('Cookies loaded.')
    } catch (e: unknown) {
      // Cannot load cookies; ignore. This may be due to invalid cookie string
      // pattern.
      if (e instanceof Error) {
        logger.error('Failed to load cookies: %s', e.message)
      } else {
        logger.error('Failed to load cookies.')
      }
    }
  }

  private async initDriver(): Promise<void> {
    const options = new chrome.Options()
    options
      .addArguments('--start-maximized')
      .addArguments('--headless')
      .addArguments('--disable-extensions')
      .addArguments('--no-sandbox')
      .addArguments('--disable-dev-shm-usage')
      .addArguments('--disable-gpu')
      .addArguments('--lang=zh-TW')
    if (process.env['DEBUG']) {
      logger.debug('Open debug port on 9222.')
      options.addArguments('--remote-debugging-port=9222')
    }

    this.driver = await new Builder()
      .forBrowser(Browser.CHROME)
      .setChromeOptions(options)
      .build()
  }

  private async runBot(
    disableSmsLogin: boolean,
    disableEmailLogin: boolean,
    ignorePassword: boolean
  ): Promise<number> {
    if (this.pathCookie !== undefined) {
      await this.loadCookies(ignorePassword)
    } else {
      logger.info(
        'No cookies given.',
        'Will try to login using username and password.'
      )
    }

    let result: number | undefined = await this.tryLogin()
    if (result === ExitCode.NEED_SMS_AUTH) {
      // Login failed. Try use the SMS link to login.
      if (disableSmsLogin) {
        logger.error('SMS authentication is required.')
        return result
      } else {
        result = await this.tryLoginWithSmsLink()
      }
    } else if (result === ExitCode.NEED_EMAIL_AUTH) {
      // Login failed. Try use email link to login.
      if (disableEmailLogin) {
        logger.error('Email authentication is required.')
      } else {
        result = await this.tryLoginWithEmailLink()
      }
    }

    if (result !== undefined) {
      // Failed to login.
      return result
    }

    // Now we are logged in.

    // Save cookies.
    if (this.pathCookie !== undefined) {
      await this.saveCookies(ignorePassword) // never raise error
    }

    // Receive coins.
    return await this.tryReceiveCoin()
  }

  private async takeScreenshot(screenshotPath: string): Promise<void> {
    const png = await this.driver.takeScreenshot()
    const filename = path.resolve(screenshotPath, 'screenshot.png')
    try {
      await fs.writeFile(filename, png, 'base64')
      logger.error('A screenshot has been put at %s.', filename)
    } catch (e: unknown) {
      if (e instanceof Error) {
        logger.error('Failed to save screenshot: %s', e.message)
      } else {
        logger.error('Failed to save screenshot.')
      }
    }
  }

  async run(
    disableSmsLogin: boolean,
    disableEmailLogin: boolean,
    ignorePassword: boolean,
    screenshotPath: string | undefined
  ): Promise<number> {
    await this.initDriver()

    try {
      const exitCode = await this.runBot(
        disableSmsLogin,
        disableEmailLogin,
        ignorePassword
      )
      if (exitCode !== 0) {
        // If not succeeded then take a screenshot.
        if (screenshotPath) {
          await this.takeScreenshot(screenshotPath)
        }
      }
      return exitCode
    } catch (e: unknown) {
      // If not succeeded then take a screenshot.
      if (screenshotPath) {
        await this.takeScreenshot(screenshotPath)
      }

      if (e instanceof error.TimeoutError) {
        logger.error('Operation timeout exceeded.')
        return ExitCode.OPERATION_TIMEOUT_EXCEEDED
      }

      if (e instanceof Error) {
        logger.error('Unexpected error: %s', e.message)
      } else {
        logger.error('Unexpected error occurred.')
        logger.debug(e)
      }

      throw e
    } finally {
      await this.driver.close()
    }
  }
}
