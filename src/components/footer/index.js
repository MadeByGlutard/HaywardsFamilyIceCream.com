import React from 'react'
import styled from '@emotion/styled'

import Logo from 'components/logo'
import Viewport from 'components/viewport'
import Container from 'components/container'

const Wrapper = styled(Viewport.Width)`
  background-color: rgb(17, 107, 180);
  /* background-image: linear-gradient(rgb(21, 61, 117), rgb(17, 107, 180)); */

  ${Container} {
    padding: 48px 0;
  }
`

export default ({ ...props }) => (
  <Wrapper {...props}>
    <Container>
      <Logo style={{ width: '20%', maxWidth: 128 }} />
    </Container>
  </Wrapper>
)
