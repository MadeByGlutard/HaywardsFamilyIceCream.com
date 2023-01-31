import React, { Fragment } from 'react'
import styled from '@emotion/styled'
import { Global, css } from '@emotion/react'

import Navbar from './navbar'
import Footer from './footer'
import Container from './container'

import { siteMetadata } from '../../gatsby-config'

const GLOBAL_STYLES = css`
  html {
    overflow-x: hidden;
    /* filter: grayscale(100%); */
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

export const SEO = ({ title, children }) => {
  return (
    <>
      <html lang="en" />
      <meta name="description" content={siteMetadata.description} />
      <meta name="og:type" content="website" />
      <meta name="og:site_name" content={siteMetadata.title} />
      <title>
        {title ? `${title} | ` : ''}
        {siteMetadata.title}
      </title>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Lobster+Two" />

      {children}
    </>
  )
}

export default ({ location, children }) => {
  const isHomepage = location.pathname === '/'

  return (
    <Fragment>
      <Global styles={GLOBAL_STYLES} />

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
