module.exports = {
  siteMetadata: {
    title: `Hayward's Family Ice Cream`,
    siteUrl: `https://haywardsfamilyicecream.com`,
    description: ``,
  },
  plugins: [
    // Sources
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/src`,
        name: `src`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content`,
        name: `content`,
      },
    },

    // Transformers
    `gatsby-transformer-sharp`,
    `gatsby-transformer-yaml`,
    `gatsby-transformer-json`,

    // Plugins
    {
      resolve: `gatsby-plugin-emotion`,
    },
    {
      resolve: `gatsby-plugin-typography`,
      options: {
        pathToConfigModule: `./src/utils/typography.js`,
      },
    },
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: `UA-74365494-2`,
      },
    },
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        icon: `./src/assets/icon.png`,
      },
    },
    `gatsby-plugin-catch-links`,
    `gatsby-plugin-sitemap`,
    `gatsby-plugin-lodash`,
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,

    `gatsby-plugin-netlify`,
    `gatsby-plugin-netlify-cms`,
  ],
}
