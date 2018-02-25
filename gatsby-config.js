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
    // {
    //   resolve: `gatsby-source-filesystem`,
    //   options: {
    //     path: `${__dirname}/content`,
    //     name: `content`
    //   }
    // },
    // Transformers
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              linkImagesToOriginal: false
            }
          },
          `gatsby-remark-copy-linked-files`,
          `gatsby-remark-autolink-headers`,
          `gatsby-remark-smartypants`
        ]
      }
    },
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
    // {
    //   resolve: `gatsby-plugin-favicon`,
    //   options: {
    //     logo: `./src/assets/icon.png`,
    //     icons: {}
    //   }
    // },
    // Breaks 404 error handling :(
    // `gatsby-plugin-remove-trailing-slashes`,
    `gatsby-plugin-react-helmet`,
    `gatsby-plugin-resolve-src`,
    `gatsby-plugin-catch-links`,
    `gatsby-plugin-react-next`,
    `gatsby-plugin-emotion`,
    // Weird cache issues :(
    // `gatsby-plugin-offline`,
    `gatsby-plugin-sitemap`,
    `gatsby-plugin-lodash`,
    `gatsby-plugin-sharp`,
    // Must be last
    `gatsby-plugin-netlify`
  ]
}
