import React from 'react'
import Image from 'gatsby-image'
import styled from 'react-emotion'

import Viewport from 'components/viewport'
import Container from 'components/container'

const CenteredImage = styled(Image)`
  display: block;
  margin: 0 auto;
`

const Logo = styled(CenteredImage)`
  width: 80%;
  max-width: 768px;
`

const Wrapper = styled(Viewport.Width)`
  margin-top: -64px;
  padding-top: 64px;
  background-color: rgb(17, 107, 180);
  background-image: linear-gradient(rgb(17, 107, 180), rgb(21, 61, 117));

  ${Container} {
    padding: 48px 0;
  }
`

export default ({ logo, ...props }) => (
  <Wrapper {...props}>
    <Container>
      <Logo sizes={logo.childImageSharp.sizes} alt="Hayward's Family" />
    </Container>
  </Wrapper>
)
