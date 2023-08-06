import styled from '@emotion/styled'
import { graphql, useStaticQuery } from 'gatsby'
import { ComponentProps } from 'react'
import { z } from 'zod'

import Container from './container'
import Divider from './divider'
import Viewport from './viewport'

const Columns = styled('div')`
  @media (min-width: 768px) {
    column-count: 2;
  }
  @media (min-width: 1024px) {
    column-count: 3;
  }

  h2 {
    margin-top: 0;
    font-size: 1.25rem;
  }
`

const Wrapper = styled(Viewport.Width)``

// const Wrapper = styled(Viewport.Width)`
//   position: relative;

//   :before {
//     content: '';
//     display: block;

//     position: absolute;
//     top: 0;
//     right: 0;
//     bottom: 0;
//     left: 0;

//     background-image: url(${require('../../content/gallery/08.jpg')});
//     background-size: cover;
//     /* filter: brightness(240%); */
//     /* filter: grayscale(80%) brightness(240%); */
//     /* filter: grayscale(100%) blur(4px) opacity(25%) brightness(240%); */
//     /* filter: saturate(0%); */
//     z-index: -1;
//     /* opacity: 0.2; */
//   }
// `

export default (props: ComponentProps<typeof Wrapper>) => {
  const flavorsQuery = useStaticQuery(graphql`
    query Flavors {
      categories: allFlavorsJson {
        nodes {
          category
          flavors {
            name
          }
        }
      }
    }
  `)

  const { categories } = z
    .object({
      categories: z.object({
        nodes: z.array(
          z.object({
            category: z.string(),
            flavors: z.array(
              z.object({
                name: z.string(),
              }),
            ),
          }),
        ),
      }),
    })
    .parse(flavorsQuery)

  return (
    <Wrapper {...props}>
      <Container style={{ maxWidth: 1024 }}>
        <h1 style={{ textAlign: 'center' }}>Flavors</h1>
        <Divider style={{ color: '#aaa' }} />

        <Columns>
          {categories.nodes.map(({ category, flavors }) => (
            <div key={category}>
              <h2>{category}</h2>
              <ul>
                {flavors.map(({ name }) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          ))}
        </Columns>
      </Container>
    </Wrapper>
  )
}
