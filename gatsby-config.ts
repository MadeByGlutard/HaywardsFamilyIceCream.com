import type { GatsbyConfig } from 'gatsby'

const config: GatsbyConfig = {
  siteMetadata: {
    title: `Hayward's Family Ice Cream`,
    siteUrl: `https://haywardsfamilyicecream.com`,
    description: ``,
  },
  jsxRuntime: 'automatic',
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
        pathToConfigModule: `./src/utils/typography.ts`,
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
  ],
}

export default config
