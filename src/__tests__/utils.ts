import fs from 'node:fs'
import { test } from '@jest/globals'

export function isPng(filePath: string): boolean {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // Read the first few bytes of the file
  const fileSignature = Buffer.alloc(pngSignature.length)
  const fd = fs.openSync(filePath, 'r')
  fs.readSync(fd, fileSignature, 0, pngSignature.length, 0)
  fs.closeSync(fd)

  // Check if the file signature matches the PNG signature
  return pngSignature.equals(fileSignature)
}

export const testIf = (condition: boolean, ...args: Parameters<typeof test>) =>
  condition ? test(...args) : test.skip(...args)

test.skip('This suite contains utilties without any unittests.', () => {})
