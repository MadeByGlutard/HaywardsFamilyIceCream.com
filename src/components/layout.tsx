import React, { ReactNode } from 'react'
import { PageProps } from 'gatsby'
import styled from '@emotion/styled'
import { Global, css } from '@emotion/react'

import Navbar from './navbar'
import Footer from './footer'
import Container from './container'

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

export default ({ location, children }: { location: PageProps['location']; children: ReactNode }) => {
  const isHomepage = location.pathname === '/'

  return (
    <>
      <Global styles={GLOBAL_STYLES} />

      <OuterWrapper>
        <Navbar isHomepage={isHomepage} />

        <InnerWrapper>
          <Container>{children}</Container>
        </InnerWrapper>

        <Footer />
      </OuterWrapper>
    </>
  )
}
