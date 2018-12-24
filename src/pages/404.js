import React from 'react'
import styled from '@emotion/styled'

import Layout from 'components/layout'

const Placeholder = styled('h1')`
  text-align: center;
  line-height: 2;
  font-size: 2rem;
  color: inherit;
`

export default ({ location }) => (
  <Layout location={location}>
    <Placeholder>
      Whoops, couldn't find that page
      <div>{`¯\\_(ツ)_/¯`}</div>
    </Placeholder>
  </Layout>
)
