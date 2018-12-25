import React, { Fragment } from 'react'
import Helmet from 'react-helmet'
import styled from '@emotion/styled'
import { Global, css } from '@emotion/core'
import { StaticQuery, graphql } from 'gatsby'

import Navbar from './navbar'
import Footer from './footer'
import Container from './container'

const GLOBAL_STYLES = css`
  html {
    overflow-x: hidden;
    /* filter: grayscale(100%); */
  }
`

const SITE_METADATA_QUERY = graphql`
  query {
    site {
      siteMetadata {
        title
        description
      }
    }
  }
`

const Wrapper = styled('div')`
  display: flex;
  flex-direction: column;
`

const OuterWrapper = styled(Wrapper)`
  height: 100vh;
`
const InnerWrapper = styled(Wrapper)`
  flex: 1 0 auto;
`

export default ({ location, children }) => {
  const isHomepage = location.pathname === '/'

  return (
    <Fragment>
      <Global styles={GLOBAL_STYLES} />

      <StaticQuery
        query={SITE_METADATA_QUERY}
        render={({ site: { siteMetadata } }) => (
          <Helmet defaultTitle={siteMetadata.title} titleTemplate={`%s | ${siteMetadata.title}`}>
            <html lang="en" />
            <meta name="description" content={siteMetadata.description} />
            <meta name="og:type" content="website" />
            <meta name="og:site_name" content={siteMetadata.title} />
          </Helmet>
        )}
      />

      <OuterWrapper isHomepage={isHomepage}>
        <Navbar isHomepage={isHomepage} />

        <InnerWrapper>
          <Container>{children}</Container>
        </InnerWrapper>

        <Footer />
      </OuterWrapper>
    </Fragment>
  )
}
