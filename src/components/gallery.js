import React from 'react'
import styled from '@emotion/styled'
import { random, sampleSize } from 'lodash'
import { useStaticQuery, graphql } from 'gatsby'
import { GatsbyImage } from 'gatsby-plugin-image'

import Divider from './divider'
import Viewport from './viewport'
import Container from './container'

const GALLERY_QUERY = graphql`
  query {
    gallery: allFile(filter: { absolutePath: { regex: "/content/gallery/" } }) {
      edges {
        node {
          id
          childImageSharp {
            gatsbyImageData(width: 320)
          }
        }
      }
    }
  }
`

const Polaroid = styled('figure')`
  width: 100%;
  padding: 8px;
  display: inline-block;
  background-color: #fff;
  box-shadow: 0 2px 2px rgba(12, 13, 14, 0.5);
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

export default ({ ...props }) => {
  const { gallery } = useStaticQuery(GALLERY_QUERY)

  return (
    <Wrapper {...props}>
      <h1 style={{ textAlign: 'center' }}>Our Gallery</h1>
      <Divider style={{ color: '#fff' }} />

      <Container style={{ maxWidth: 1200 }}>
        <Grid style={{ flexWrap: 'wrap' }}>
          {sampleSize(gallery.edges, 4).map(({ node }) => (
            <Column key={node.id} size={4}>
              <Polaroid style={{ transform: `rotate(${random(-8, 8)}deg)` }}>
                <GatsbyImage image={node.childImageSharp.gatsbyImageData} alt="" />
              </Polaroid>
            </Column>
          ))}
        </Grid>
      </Container>
    </Wrapper>
  )
}
