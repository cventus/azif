const path = require('path')
const webpack = require('webpack')
const HtmlWebPackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')

const extensions = [".ts", ".tsx", ".mjs", ".cjs", ".js", ".json", ".wasm"]

function lambdaApp(name, entry) {
  return {
    name,
    entry,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions,
    },
    target: 'node',
    externals: ['aws-sdk'],
    output: {
      filename: `${name}/bundle.js`,
      path: path.resolve(__dirname, 'dist'),
    },
  }
}

const view = {
  name: 'view',
  devtool: 'inline-source-map',
  entry: ['react-hot-loader/patch', './src/view/index.tsx'],
  output: {
    path: path.join(__dirname, '/dist/view'),
    filename: 'bundle.js'
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
        }
      }
    }, {
      test: /\.css$/i,
      use: [MiniCssExtractPlugin.loader, 'css-loader'],
    }, {
      test: /\.(png|jpg|gif)$/,
      use: [{
        loader: 'file-loader'
      }]
    }]
  },
  resolve: {
    extensions,
    alias: {
      'react-dom': '@hot-loader/react-dom',
    },
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
        mode: "write-references",
      },
    }),
    new MiniCssExtractPlugin(),
    new HtmlWebPackPlugin({
      hash: true,
      filename: 'index.html',
      template: './src/view/index.html',
    }),
  ],
}

module.exports = [
  view,
  lambdaApp('lambda', './src/lambda/index.ts'),
]
