import React from 'react'
import Image from 'gatsby-image'
import styled from '@emotion/styled'
import { StaticQuery, graphql } from 'gatsby'

const LOGO_QUERY = graphql`
  query {
    logo: file(relativePath: { eq: "assets/logo.png" }) {
      childImageSharp {
        sizes {
          ...GatsbyImageSharpSizes_noBase64
        }
      }
    }
  }
`

const CenteredImage = styled(Image)`
  display: block;
  margin: 0 auto;
`

export default ({ ...props }) => (
  <StaticQuery
    query={LOGO_QUERY}
    render={({ logo }) => <CenteredImage sizes={logo.childImageSharp.sizes} alt="Hayward's Family" {...props} />}
  />
)
