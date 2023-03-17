// Test that program version matches that from package.json

import fs from 'node:fs'
import path from 'node:path'
import { describe, test, expect } from '@jest/globals'
import { version } from '../util'

describe('version', () => {
  test('program version matches package.json', () => {
    const packageJsonPath = path.join(__dirname, '../../package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    const programVersion = version
    expect(programVersion).toBe(packageJson.version)
  })
})
