#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const { build } = require('esbuild')

const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json')))
const version = packageJson.version

const options = {
  entryPoints: ['./src/cli/index.ts'],
  outfile: './dist/index.cjs',
  bundle: true,
  platform: 'node',
  target: 'node20',
  minify: true,
  define: {
    'process.env.VERSION': JSON.stringify(version)
  }
}

build(options).catch(() => process.exit(1))
