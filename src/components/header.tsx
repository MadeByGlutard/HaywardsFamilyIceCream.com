import React from 'react'
import styled from '@emotion/styled'
import { StaticImage } from 'gatsby-plugin-image'

import Viewport from './viewport'
import Container from './container'

const Wrapper = styled(Viewport.Width)`
  margin-top: -64px;
  padding-top: 64px;
  background-color: rgb(17, 107, 180);
  /* background-image: linear-gradient(rgb(17, 107, 180), rgb(21, 61, 117)); */
  background-image: radial-gradient(at center calc(50% + 32px), rgba(255, 255, 255, 0.2), transparent 60%),
    linear-gradient(rgb(17, 107, 180), rgb(21, 61, 117));

  ${Container} {
    padding: 48px 0;
  }
`

export default ({ ...props }) => {
  return (
    <Wrapper {...props}>
      <Container>
        <StaticImage
          src="../assets/logo.png"
          alt="Hayward's Family"
          placeholder="none"
          loading="eager"
          quality={100}
          width={768}
          style={{
            display: 'block',
            margin: '0 auto',
            width: '80%',
            maxWidth: 768,
          }}
        />
      </Container>
    </Wrapper>
  )
}
