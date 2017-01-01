const filesystemSourcePlugin = require.resolve(`gatsby-source-filesystem`)

module.exports = {
  siteMetadata: {
    title: "Moore's Hand",
    author: 'Sam Bhagwat',
    homeCity: 'Berkeley',
  },
  plugins: [
    {
      resolve: filesystemSourcePlugin,
      options: {
        path: `${__dirname}/pages/`,
      },
    },
    require.resolve('gatsby-parser-markdown'),
    require.resolve('gatsby-typegen-remark'),
    require.resolve('gatsby-typegen-filesystem'),
  ],
}
