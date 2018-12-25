import React from 'react'
import styled from '@emotion/styled'
import { random } from 'lodash'

import Divider from './divider'
import Viewport from './viewport'
import Container from './container'

const images = [
  // require('../../content/gallery/01.jpg'),
  // require('../../content/gallery/02.jpg'),
  // require('../../content/gallery/03.jpg'),
  // require('../../content/gallery/04.jpg'),
  require('../../content/gallery/05.jpg'),
  require('../../content/gallery/06.jpg'),
  require('../../content/gallery/07.jpg'),
  require('../../content/gallery/08.jpg')
]

const Polaroid = styled('figure')`
  padding: 8px;
  display: inline-block;
  background-color: #fff;
  box-shadow: 0 2px 2px rgba(12, 13, 14, 0.5);

  img {
    display: block;
    margin-bottom: 0;
  }

  figcaption {
    margin-top: 8px;
    text-align: center;
  }
`

const Column = styled('div')`
  width: 100%;
  max-width: 320px;

  & + & {
    margin-top: 1rem;
  }

  @media (min-width: 768px) {
    width: calc(100% / ${props => props.size || 3} * 2);
    padding: 0 1rem;

    & + & {
      margin-top: 0;
    }
  }

  @media (min-width: 1024px) {
    width: calc(100% / ${props => props.size || 3});
    max-width: 360px;
    padding: 0 1rem;

    & + & {
      margin-top: 0;
    }
  }
`

const Grid = styled('div')`
  display: flex;
  align-items: center;
  justify-content: center;

  flex-direction: column;
  @media (min-width: 768px) {
    flex-direction: row;
  }
  @media (min-width: 1024px) {
    flex-direction: row;
  }
`

const Wrapper = styled(Viewport.Width)`
  padding: 64px 0;
  background-color: rgb(17, 107, 180);

  h1 {
    margin-top: 0;
    color: #fff;
  }
`

export default ({ ...props }) => (
  <Wrapper {...props}>
    <h1 style={{ textAlign: 'center' }}>Our Gallery</h1>
    <Divider style={{ color: '#fff' }} />

    <Container style={{ maxWidth: 1200 }}>
      <Grid style={{ flexWrap: 'wrap' }}>
        {images.map(image => (
          <Column key={image.src || image} size={4}>
            <Polaroid style={{ transform: `rotate(${random(-8, 8)}deg)` }}>
              <img src={image.src || image} />
              {image.caption && <figcaption>{image.caption}</figcaption>}
            </Polaroid>
          </Column>
        ))}
      </Grid>
    </Container>
  </Wrapper>
)
