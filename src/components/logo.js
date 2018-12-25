import React from 'react'
import styled from '@emotion/styled'
import { StaticQuery, graphql } from 'gatsby'

import Image from './image'

const LOGO_QUERY = graphql`
  query {
    logo: file(relativePath: { eq: "assets/logo.png" }) {
      childImageSharp {
        fluid(maxWidth: 768) {
          ...GatsbyImageSharpFluid_withWebp_noBase64
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
    render={({ logo }) => <CenteredImage fluid={logo.childImageSharp.fluid} alt="Hayward's Family" {...props} />}
  />
)
