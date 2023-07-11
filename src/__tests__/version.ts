// Test that program version matches that from package.json

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import { describe, expect, test } from '@jest/globals'

import { version } from '@/util'

describe('version', () => {
  test('program version matches package.json', () => {
    const dirname = path.dirname(url.fileURLToPath(import.meta.url))
    const packageJsonPath = path.join(dirname, '../../package.json')
    // @ts-expect-error: Parse a buffer to JSON object is OK.
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath))
    const programVersion = version
    expect(programVersion).toBe(packageJson.version)
  })
})
