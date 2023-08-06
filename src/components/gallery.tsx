import styled from '@emotion/styled'
import { graphql, useStaticQuery } from 'gatsby'
import { GatsbyImage, IGatsbyImageData } from 'gatsby-plugin-image'
import { random, sampleSize } from 'lodash'
import { z } from 'zod'

import Container from './container'
import Divider from './divider'
import Viewport from './viewport'

const Polaroid = styled('figure')`
  width: 100%;
  padding: 8px;
  display: inline-block;
  background-color: #fff;
  box-shadow: 0 2px 2px rgba(12, 13, 14, 0.5);
`

const Column = styled('div')<{ size?: number }>`
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
  const galleryQuery = useStaticQuery(graphql`
    query Gallery {
      gallery: allFile(filter: { absolutePath: { regex: "/content/gallery/" } }) {
        nodes {
          id
          childImageSharp {
            gatsbyImageData(width: 320)
          }
        }
      }
    }
  `)

  const { gallery } = z
    .object({
      gallery: z.object({
        nodes: z.array(
          z.object({
            id: z.string(),
            childImageSharp: z.object({
              gatsbyImageData: z.custom<IGatsbyImageData>(),
            }),
          }),
        ),
      }),
    })
    .parse(galleryQuery)

  return (
    <Wrapper {...props}>
      <h1 style={{ textAlign: 'center' }}>Our Gallery</h1>
      <Divider style={{ color: '#fff' }} />

      <Container style={{ maxWidth: 1200 }}>
        <Grid style={{ flexWrap: 'wrap' }}>
          {sampleSize(gallery.nodes, 4).map(({ id, childImageSharp }) => (
            <Column key={id} size={4}>
              <Polaroid style={{ transform: `rotate(${random(-8, 8)}deg)` }}>
                <GatsbyImage image={childImageSharp.gatsbyImageData} alt="" />
              </Polaroid>
            </Column>
          ))}
        </Grid>
      </Container>
    </Wrapper>
  )
}
