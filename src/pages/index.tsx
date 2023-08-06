import { graphql, PageProps, useStaticQuery } from 'gatsby'
import { z } from 'zod'

import Contact from '../components/contact'
import Flavors from '../components/flavors'
import Gallery from '../components/gallery'
import Header from '../components/header'
import Layout from '../components/layout'
import SEO from '../components/seo'
import Viewport from '../components/viewport'

export const Head = () => {
  return <SEO />
}

export default function IndexPage({ location }: PageProps) {
  const bannerQuery = useStaticQuery(graphql`
    query Banner {
      settings: settingsYaml {
        banner
      }
    }
  `)

  const { settings } = z
    .object({
      settings: z.object({
        banner: z.string().optional(),
      }),
    })
    .parse(bannerQuery)

  return (
    <Layout location={location}>
      <Header />

      {settings.banner ? (
        <Viewport.Width
          style={{
            padding: 16,
            background: '#f5f5f5',
            fontSize: '1.2rem',
            fontStyle: 'italic',
            textAlign: 'center',
          }}
          /* Closed for the season &mdash; See you in 2019! */
          /* Open 7 Days a Week &nbsp;|&nbsp; 11am - 10pm */
          dangerouslySetInnerHTML={{ __html: settings.banner }}
        />
      ) : null}

      <Flavors style={{ paddingTop: 64, paddingBottom: 128 }} />

      <Gallery style={{}} />

      <Contact style={{ paddingTop: 128, paddingBottom: 256 }} />
    </Layout>
  )
}
