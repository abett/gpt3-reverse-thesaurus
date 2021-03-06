// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';
process.env.ASSET_PATH = '/';

var WebpackDevServer = require('webpack-dev-server'),
  Dotenv = require('dotenv-webpack'),
  webpack = require('webpack'),
  config = require('../webpack.config'),
  env = require('./env'),
  path = require('path');

var options = config.chromeExtensionBoilerplate || {};
var excludeEntriesToHotReload = options.notHotReload || [];

for (var entryName in config.entry) {
  if (excludeEntriesToHotReload.indexOf(entryName) === -1) {
    config.entry[entryName] = [
      'webpack-dev-server/client?http://localhost:' + env.PORT,
      'webpack/hot/dev-server',
    ].concat(config.entry[entryName]);
  }
}

config.plugins = [
    new webpack.HotModuleReplacementPlugin(),
    new Dotenv({
      path: '.env.development',
      safe: true, // load '.env.example' to verify the '.env' variables are all set. Can also be a string to a different file.
      allowEmptyValues: false, // allow empty variables (e.g. `FOO=`) (treat it as empty string, rather than missing)
    }),
  ].concat(
  config.plugins || []
);

delete config.chromeExtensionBoilerplate;

var compiler = webpack(config);

var server = new WebpackDevServer(compiler, {
  https: false,
  hot: true,
  injectClient: false,
  writeToDisk: true,
  port: env.PORT,
  contentBase: path.join(__dirname, '../build'),
  publicPath: `http://localhost:${env.PORT}`,
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
  disableHostCheck: true,
});

server.listen(env.PORT);
