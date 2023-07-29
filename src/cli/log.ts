import chalk from 'chalk'

function isTruthy(value: string | undefined): value is string {
  return value !== undefined && value !== '' && value !== '0' && value !== 'false'
}

export function debug(format: string, ...msg: unknown[]): void {
  if (isTruthy(process.env.DEBUG)) {
    console.error(chalk.blue(format), ...msg)
  }
}

export function info(format: string, ...msg: unknown[]): void {
  if (isTruthy(process.env.DEBUG) || !isTruthy(process.env.QUIET)) {
    console.error(format, ...msg)
  }
}

export function warn(format: string, ...msg: unknown[]): void {
  console.error(chalk.yellow.bold(format), ...msg)
}

export function error(format: string, ...msg: unknown[]): void {
  console.error(chalk.red.bold(format), ...msg)
}
