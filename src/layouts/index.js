import React, { Fragment } from 'react'
import Helmet from 'react-helmet'
import styled, { injectGlobal } from 'react-emotion'

import Navbar from 'components/navbar'
import Footer from 'components/footer'
import Container from 'components/container'

/* width: 100vw */
injectGlobal`
  html {
    overflow-x: hidden;
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

export default ({ data, location, children }) => {
  const { siteMetadata } = data.site
  const isHomepage = location.pathname === '/'

  return (
    <Fragment>
      <Helmet defaultTitle={siteMetadata.title} titleTemplate={`%s | ${siteMetadata.title}`}>
        <html lang="en" />
        <meta name="og:type" content="website" />
        <meta name="og:site_name" content={siteMetadata.title} />
      </Helmet>

      <OuterWrapper isHomepage={isHomepage}>
        <Navbar isHomepage={isHomepage} />

        <InnerWrapper>
          <Container>{children()}</Container>
        </InnerWrapper>

        <Footer />
      </OuterWrapper>
    </Fragment>
  )
}

export const query = graphql`
  query Layout {
    site {
      siteMetadata {
        title
      }
    }
  }
`
