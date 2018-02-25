import React, { Fragment } from 'react'
import Helmet from 'react-helmet'
import styled, { injectGlobal } from 'react-emotion'

import Header from 'components/header'
import Footer from 'components/footer'
import Container from 'components/container'

import { siteMetadata } from '../../gatsby-config'

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

export default ({ children }) => {
  return (
    <Fragment>
      <Helmet defaultTitle={siteMetadata.title} titleTemplate={`%s | ${siteMetadata.title}`}>
        <html lang="en" />
        <meta name="og:type" content="website" />
        <meta name="og:site_name" content={siteMetadata.title} />
      </Helmet>

      <OuterWrapper>
        <Header />

        <InnerWrapper>
          <Container>{children()}</Container>
        </InnerWrapper>

        <Footer />
      </OuterWrapper>
    </Fragment>
  )
}
