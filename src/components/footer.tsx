import React, { ComponentProps } from 'react'
import styled from '@emotion/styled'
import { StaticImage } from 'gatsby-plugin-image'

import Viewport from './viewport'
import Container from './container'

const Wrapper = styled(Viewport.Width)`
  background-color: rgb(17, 107, 180);
  /* background-image: linear-gradient(rgb(21, 61, 117), rgb(17, 107, 180)); */

  ${Container} {
    padding: 48px 0;
  }
`

export default (props: ComponentProps<typeof Wrapper>) => {
  return (
    <Wrapper {...props}>
      <Container>
        <StaticImage
          src="../assets/logo.png"
          alt="Hayward's Family"
          placeholder="none"
          width={128}
          style={{
            display: 'block',
            margin: '0 auto',
            width: '20%',
            maxWidth: 128,
          }}
        />
      </Container>
    </Wrapper>
  )
}
