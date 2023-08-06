import { css, Global } from '@emotion/react'
import styled from '@emotion/styled'
import { PageProps } from 'gatsby'
import { ReactNode } from 'react'

import Container from './container'
import Footer from './footer'
import Navbar from './navbar'

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
