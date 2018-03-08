module.exports = {
  siteMetadata: {
    title: `Hayward's Family Ice Cream`,
    siteUrl: `https://haywardsfamilyicecream.com`,
    description: ``
  },
  plugins: [
    // Sources
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/src`,
        name: `src`
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content`,
        name: `content`
      }
    },

    // Transformers
    `gatsby-transformer-sharp`,
    `gatsby-transformer-yaml`,

    // Plugins
    {
      resolve: `gatsby-plugin-typography`,
      options: {
        pathToConfigModule: `src/utils/typography.js`
      }
    },
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: `UA-74365494-2`
      }
    },
    `gatsby-plugin-react-helmet`,
    `gatsby-plugin-resolve-src`,
    `gatsby-plugin-catch-links`,
    `gatsby-plugin-react-next`,
    `gatsby-plugin-emotion`,
    `gatsby-plugin-sitemap`,
    `gatsby-plugin-lodash`,
    `gatsby-plugin-sharp`,

    `gatsby-plugin-netlify`,
    `gatsby-plugin-netlify-cms`
  ]
}
