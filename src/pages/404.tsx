import styled from '@emotion/styled'
import { PageProps } from 'gatsby'

import Layout from '../components/layout'
import SEO from '../components/seo'

const Placeholder = styled('h1')`
  text-align: center;
  line-height: 2;
  font-size: 2rem;
  color: inherit;
`

export const Head = () => {
  return <SEO title="Not Found" />
}

export default function NotFoundPage({ location }: PageProps) {
  return (
    <Layout location={location}>
      <Placeholder>
        Whoops, couldn't find that page
        <div>{`¯\\_(ツ)_/¯`}</div>
      </Placeholder>
    </Layout>
  )
}
