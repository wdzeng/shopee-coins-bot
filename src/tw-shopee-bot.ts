import fs from 'fs/promises'
import {
  Builder, By, IWebDriverOptionsCookie, until, WebDriver,
} from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome'
import logger from 'loglevel'
import { xpathByText } from './util'

const urlLogin = 'https://shopee.tw/buyer/login?from=https%3A%2F%2Fshopee.tw%2Fuser%2Fcoin&next=https%3A%2F%2Fshopee.tw%2Fshopee-coins'
const urlCoin = 'https://shopee.tw/shopee-coins'
const txtWrongPassword = '你的帳號或密碼不正確，請稍後再試'
const txtPlayPuzzle = '點擊以重新載入頁面'
const txtUseLink = '使用連結驗證'
const txtReceiveCoin = '今日簽到獲得 '
const txtCoinAlreadyReceived = '明天再回來領取 '
const txtTooMuchTry = '很抱歉，您的操作次數過多，請稍後再試。'
const txtShopeeReward = '蝦幣獎勵'

const waitTimeout = 2 * 60 * 1000 // 2 minutes

export default class TaiwanShopeeBot {
  private driver: WebDriver | undefined = undefined

  constructor(
    private username: string | undefined,
    private password: string | undefined,
    private pathCookie: string | undefined
  ) { }

  private async tryLogin(): Promise<0 | 1> {
    logger.info('Check if logged in.')
    this.driver.get(urlLogin)

    const curUrl = await this.driver.getCurrentUrl()
    if (curUrl === urlCoin) {
      // Already logged in.
      logger.info('Already logged in.')
      return 0
    }

    // Not logged in; try to login by password.
    if (!this.username || !this.password) {
      logger.error('Failed to login. Missing username or password.')
      process.exit(87)
    }

    logger.info('Try to login by username and password.')

    // Fill username and password inputs.
    const inputUsername = await this.driver.findElement(By.name('loginKey'))
    await inputUsername.sendKeys(this.username)
    const inputPassword = await this.driver.findElement(By.name('password'))
    await inputPassword.sendKeys(this.password)

    // Submit form.
    const btnLogin = await this.driver.findElement(By.xpath(xpathByText('button', '登入')))
    // Wait until the login button is enabled.
    await this.driver.wait(until.elementIsEnabled(btnLogin), waitTimeout)
    await btnLogin.click()
    logger.debug('Login form submitted.')

    // Wait for something happens.
    const xpath = [
      xpathByText('div', txtWrongPassword),
      xpathByText('button', txtPlayPuzzle),
      xpathByText('div', txtUseLink),
      xpathByText('div', txtTooMuchTry),
      xpathByText('div', txtShopeeReward),
    ].join('|')
    const result = await this.driver.wait(until.elementLocated(By.xpath(xpath)), waitTimeout)
    const text = await result.getText()

    if (text === txtShopeeReward) {
      logger.info('Login succeeded.')
      return 0
    }

    if (text === txtWrongPassword) {
      logger.error('Login failed: wrong password.')
      process.exit(87)
    }
    if (text === txtTooMuchTry) {
      logger.error('Login failed: too much try.')
      process.exit(69)
    }
    if (text === txtPlayPuzzle) {
      logger.debug('Login failed: I cannot solve the puzzle.')
      return 1
    }
    if (text === txtUseLink) {
      logger.debug('Login failed: please use the link.')
      return 1
    }

    // Unknown error
    logger.error('Login failed. Unexpected error occurred.')
    logger.debug(`Unexpected error occurred: ${text}`)
    process.exit(255)
    return 0 // never reach
  }

  private async tryReceiveCoin() {
    const xpath = `${xpathByText('button', txtReceiveCoin)} | ${xpathByText('button', txtCoinAlreadyReceived)}`
    await this.driver.wait(until.elementLocated(By.xpath(xpath)), waitTimeout)
    const btnReceiveCoin = await this.driver.findElement(By.xpath(xpath))

    // Check if coin is already received today
    const text = await btnReceiveCoin.getText()
    if (text.startsWith(txtCoinAlreadyReceived)) {
      // Already received
      logger.error('You have already received coin today.')
      return 2
    }

    await btnReceiveCoin.click()
    // TODO: Wait until the click takes effect

    logger.info('Coin received.')
    return 0
  }

  private async tryLoginWithSmsLink(): Promise<0> {
    // Wait until the '使用連結驗證' is available.
    await this.driver.wait(until.elementLocated(By.xpath(xpathByText('div', txtUseLink))), waitTimeout)

    // Click the '使用連結驗證' button.
    const btnLoginWithLink = await this.driver.findElement(By.xpath(xpathByText('div', txtUseLink)))
    await btnLoginWithLink.click()
    logger.info('Please click the link sent to your mobile.')

    // Now user should click the link sent from Shopee to her mobile via SMS.
    // Wait for user completing the process; by the time the website should be
    // redirected to coin page.
    await this.driver.wait(until.urlIs(urlCoin), waitTimeout)
    // TODO: check if login is denied.

    logger.info('Login permitted.')
    return 0
  }

  private async saveCookies() {
    logger.debug('Start to save cookie.')
    try {
      const cookies = await this.driver.manage().getCookies()
      await fs.writeFile(this.pathCookie, JSON.stringify(cookies))
      logger.info('Cookie saved.')
    } catch (e: unknown) {
      if (e instanceof Error) {
        logger.error('Failed to save cookie: ' + e.message)
      }
      else {
        logger.error('Failed to save cookie.')
      }
    }
  }

  private async loadCookiesIfExists() {
    if (!this.pathCookie) {
      // Cookie path not given so cannot load cookies.
      logger.info('No cookies given. Will try to login using username and password.')
      return
    }

    // Try to load cookies.
    try {
      const cookiesStr = await fs.readFile(this.pathCookie, 'utf-8')
      const cookies: IWebDriverOptionsCookie[] = JSON.parse(cookiesStr)
      cookies.forEach((cookie) => this.driver.manage().addCookie(cookie))
    } catch (e: unknown) {
      // Cannot load cookies; ignore. This may be due to invalid cookie string
      // pattern.
      logger.debug('Failed to load cookies. Will try to login using username and password.')
      if (e instanceof Error) {
        logger.debug(e.message)
      }
    }
  }

  private async initDriver() {
    if (this.driver !== undefined) return

    const options = new chrome.Options()
    options
      .addArguments('--headless')
      .addArguments('--start-maximized')
      .addArguments('--disable-infobars') // cspell:disable-line
      .addArguments('--disable-extensions')
      .addArguments('--no-sandbox')
      .addArguments('--disable-dev-shm-usage')
      .addArguments('--remote-debugging-port=9224')

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build()
  }

  async run(smsLogin: boolean) {
    await this.initDriver()

    try {
      if (this.pathCookie !== undefined) {
        await this.loadCookiesIfExists()
      }

      let result = await this.tryLogin()
      if (result === 1) {
        // Login failed. Try use the SMS link to login.

        if (smsLogin) {
          result = await this.tryLoginWithSmsLink()
        }
        else {
          logger.error('Required SMS login.')
          process.exit(22)
        }
      }
      // Now we are logged in.

      // Save the cookie.
      if (this.pathCookie !== undefined) {
        await this.saveCookies()
      }

      // Receive coins.
      return await this.tryReceiveCoin()
    }
    finally {
      await this.driver.close()
      this.driver = undefined
    }
  }
}
