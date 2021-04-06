const path = require('path')
const webpack = require('webpack')
const HtmlWebPackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin')

const extensions = ['.ts', '.tsx', '.mjs', '.cjs', '.js', '.json', '.wasm']

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
      filename: `[name].bundle.js`,
      path: path.resolve(__dirname, 'dist'),
    },
  }
}

const view = {
  name: 'view',
  devtool: 'eval',
  entry: {
    main: ['react-hot-loader/patch', './src/view/index.tsx'],
    gallery: ['react-hot-loader/patch', './src/view/gallery.tsx'],
  },
  output: {
    path: path.join(__dirname, '/dist/view'),
    filename: '[name].bundle.js',
    publicPath: '/',
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
          plugins: ['react-hot-loader/babel'],
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
  devServer: {
    port: 3000,
    hot: true,
    publicPath: '/',
    historyApiFallback: {
      index: 'index.html'
    },
    writeToDisk: true,
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
      },
    }),
    new MiniCssExtractPlugin(),
    new HtmlWebPackPlugin({
      hash: true,
      filename: 'index.html',
      template: './src/view/index.html',
      publicPath: '/',
      chunks: ['main'],
      templateParameters: {
        title: 'Main'
      },
    }),
    new HtmlWebPackPlugin({
      hash: true,
      filename: 'gallery.html',
      template: './src/view/index.html',
      publicPath: '/',
      chunks: ['gallery'],
      templateParameters: {
        title: 'Gallery'
      },
    }),
  ],
}

const server = {
  name: 'server',
  entry: {
    main: ['webpack/hot/signal', './src/server/index.ts'],
  },
  output: {
    path: path.join(__dirname, '/dist/server'),
    filename: '[name].bundle.js',
    publicPath: '/',
  },
  target: 'node',
  module: {
    rules: [{
      test: /\.ts$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
        }
      }
    }]
  },
  resolve: {
    extensions,
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
      },
    }),
    new RunScriptWebpackPlugin({ signal: true }),
  ],
}

const util = {
  name: 'util',
  entry: './src/server/util/main.ts',
  output: {
    path: path.join(__dirname, '/dist'),
    filename: '[name].js',
    publicPath: '/',
  },
  target: 'node',
  module: {
    rules: [{
      test: /\.ts$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
        }
      }
    }]
  },
  resolve: {
    extensions,
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
      },
    }),
  ],
}


module.exports = [
  view,
  lambdaApp('lambda', './src/lambda/index.ts'),
  server,
  util,
]
