import { graphql, useStaticQuery } from 'gatsby'
import { z } from 'zod'

export default function useSiteMetadata() {
  const siteMetadataQuery = useStaticQuery(graphql`
    query SiteMetadata {
      site {
        siteMetadata {
          title
          description
        }
      }
    }
  `)

  return z
    .object({
      site: z.object({
        siteMetadata: z.object({
          title: z.string(),
          description: z.string(),
        }),
      }),
    })
    .parse(siteMetadataQuery).site.siteMetadata
}
