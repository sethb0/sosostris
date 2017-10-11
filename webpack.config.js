const path = require('path');
const webpack = require('webpack');
const ChunkHashPlugin = require('webpack-chunk-hash');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const FaviconsPlugin = require('favicons-webpack-plugin');
const HTMLPlugin = require('html-webpack-plugin');
const OptimizeCSSPlugin = require('optimize-css-assets-webpack-plugin');
const SRIPlugin = require('webpack-subresource-integrity');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const WebappManifestPlugin = require('webapp-manifest-plugin').default;

const { FAVICON_PLUGIN } = require('webapp-manifest-plugin');

const {
  NODE_ENV, DEPLOY_PATH, TITLE, DESCRIPTION, BACKGROUND_COLOR, THEME_COLOR, LOGO_PATH,
} = process.env; // eslint-disable-line no-process-env
const production = NODE_ENV === 'production';

const appDir = path.join(__dirname, 'app');
const filenamePattern = production ? '[name].[chunkhash]' : '[name]';

const extractCSSLoader = ExtractTextPlugin.extract({
  use: 'css-loader?sourceMap',
  fallback: 'style-loader/url?sourceMap',
});

module.exports = {
  target: 'web',
  context: appDir,
  output: {
    filename: `${filenamePattern}.js`,
    chunkFilename: `${filenamePattern}.js`,
    path: path.join(DEPLOY_PATH, 'dist'),
    publicPath: '/',
    crossOriginLoading: 'anonymous',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [appDir],
        use: 'babel-loader?cacheDirectory',
      },
      {
        test: /\.vue$/,
        use: {
          loader: 'vue-loader',
          options: {
            loaders: {
              js: 'babel-loader?cacheDirectory',
              css: extractCSSLoader,
            },
            preserveWhitespace: false,
          },
        },
      },
      {
        test: /\.css$/,
        use: extractCSSLoader,
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
        use: 'file-loader?name=[name].[hash].[ext]&outputPath=fonts/',
      },
      {
        test: /\.(png|jpg|gif|ico)$/,
        use: 'file-loader?name=[name].[hash].[ext]&outputPath=images/',
      },
    ],
  },
  devtool: 'source-map',
  bail: !production,
  plugins: [
    new webpack.DefinePlugin({
      NODE_ENV: JSON.stringify(NODE_ENV || 'development'),
    }),
    new webpack.EnvironmentPlugin(['BOOTSTRAP', 'NAVBAR_ALT', 'TITLE']),
    new webpack.NoEmitOnErrorsPlugin(),
    new ExtractTextPlugin({
      filename: `${filenamePattern}.css`,
      allChunks: true,
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: (module) =>
        module.context
        && module.context.includes('/node_modules/'),
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'manifest',
      minChunks: Infinity,
    }),
    new FaviconsPlugin({
      logo: LOGO_PATH,
      inject: true,
      // persistentCache: false, // doesn't work with webpack-stream
      background: BACKGROUND_COLOR,
      title: TITLE,
      icons: {
        android: true,
        appleIcon: true,
        appleStartup: true,
        favicons: true,
        firefox: false,
        windows: false,
      },
    }),
    new HTMLPlugin({
      template: './index.ejs',
      title: TITLE,
    }),
    new SRIPlugin({
      hashFuncNames: ['sha384'],
    }),
    new WebappManifestPlugin({
      name: TITLE,
      shortName: TITLE,
      description: DESCRIPTION,
      backgroundColor: BACKGROUND_COLOR,
      themeColor: THEME_COLOR,
      icons: FAVICON_PLUGIN,
    }),
  ],
};

if (production) {
  module.exports.plugins.push(new webpack.HashedModuleIdsPlugin());
  module.exports.plugins.push(new ChunkHashPlugin());
  module.exports.plugins.push(new UglifyJSPlugin({
    parallel: true,
    sourceMap: true,
    uglifyOptions: {
      compress: {
        warnings: true,
        unsafe: true,
        keep_infinity: true, // eslint-disable-line camelcase
      },
      mangle: {
        safari10: true,
      },
    },
  }));
  module.exports.plugins.push(new webpack.optimize.ModuleConcatenationPlugin());
  module.exports.plugins.push(new OptimizeCSSPlugin());
} else {
  module.exports.module.rules.unshift({
    test: /\.(js|vue)$/,
    include: [appDir],
    use: 'eslint-loader',
    enforce: 'pre',
  });
  module.exports.plugins.push(new webpack.NamedModulesPlugin());
}
