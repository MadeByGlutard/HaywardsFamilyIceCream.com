/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */

exports.modifyBabelrc = ({ babelrc }) => {
  // gatsby-plugin-emotion is not working correctly
  // adding babel-plugin-emotion :(
  const emotionConfig = process.env.NODE_ENV !== `production` ? { sourceMap: true, autoLabel: true } : {}
  babelrc.plugins = [[require.resolve(`babel-plugin-emotion`), emotionConfig], ...babelrc.plugins]

  return babelrc
}

// Webpack 1 does not support long-term caching
// https://github.com/gatsbyjs/gatsby/issues/2538
exports.modifyWebpackConfig = ({ config, stage }) => {
  const timestamp = Date.now()
  switch (stage) {
    case 'build-javascript':
      config.merge({
        output: {
          filename: `[name]-${timestamp}-[chunkhash].js`,
          chunkFilename: `[name]-${timestamp}-[chunkhash].js`
        }
      })

      break
  }
  return config
}
