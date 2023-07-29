import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import webpack from 'webpack'

const projectRootPath = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)))
const packageJson = JSON.parse(fs.readFileSync(path.resolve(projectRootPath, 'package.json')))
const version = packageJson.version
const outputDir = path.resolve(projectRootPath, 'dist')

const versionPlugin = new webpack.DefinePlugin({ 'process.env.VERSION': JSON.stringify(version) })

export default {
  mode: 'production',
  entry: './src/cli/index.ts',
  output: {
    filename: 'index.cjs',
    path: outputDir,
    clean: true
  },
  resolve: {
    plugins: [new TsconfigPathsPlugin()],
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  target: 'node',
  experiments: {
    topLevelAwait: true
  },
  externals: ['utf-8-validate', 'bufferutil'],
  plugins: [versionPlugin]
}
