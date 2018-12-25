import React from 'react'

import Layout from '../components/layout'
import Header from '../components/header'
import Flavors from '../components/flavors'
import Gallery from '../components/gallery'
import Contact from '../components/contact'
import Viewport from '../components/viewport'
import { StaticQuery, graphql } from 'gatsby'

const BANNER_QUERY = graphql`
  query {
    settings: settingsYaml {
      banner
    }
  }
`

export default ({ location }) => (
  <StaticQuery
    query={BANNER_QUERY}
    render={({ settings }) => (
      <Layout location={location}>
        <Header />

        <Viewport.Width
          style={{
            padding: 16,
            background: '#f5f5f5',
            fontSize: '1.2rem',
            fontStyle: 'italic',
            textAlign: 'center'
          }}
          /* Closed for the season &mdash; See you in 2019! */
          /* Open 7 Days a Week &nbsp;|&nbsp; 11am - 10pm */
          dangerouslySetInnerHTML={{ __html: settings.banner }}
        />

        <Flavors style={{ paddingTop: 64, paddingBottom: 128 }} />

        <Gallery style={{}} />

        <Contact style={{ paddingTop: 128, paddingBottom: 256 }} />
      </Layout>
    )}
  />
)
