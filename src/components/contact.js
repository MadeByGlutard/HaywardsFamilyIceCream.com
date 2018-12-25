import React from 'react'
import styled from '@emotion/styled'
import { keyframes } from '@emotion/core'
import { StaticQuery, graphql } from 'gatsby'

import Image from './image'
import Divider from './divider'
import Viewport from './viewport'
import Container from './container'

import { MdPhone, MdEmail, MdPlace } from 'react-icons/md'

const icons = {
  phone: <MdPhone />,
  place: <MdPlace />,
  email: <MdEmail />
}

const CONTACT_QUERY = graphql`
  query {
    settings: settingsYaml {
      contact {
        type
        label
        url
        value
      }
    }

    silhouette: file(relativePath: { eq: "assets/silhouette.png" }) {
      childImageSharp {
        id
        fluid(quality: 100) {
          ...GatsbyImageSharpFluid_withWebp
        }
      }
    }
  }
`

const wiggle = keyframes`
  from, to {
    transform: rotate(0deg);
  }

  20%, 40%, 60%, 80% {
    transform: rotate(-10deg);
  }

  10%, 30%, 50%, 70%, 90% {
    transform: rotate(10deg);
  }
`

const Column = styled('div')`
  width: 100%;
  max-width: 320px;

  & + & {
    margin-top: 1rem;
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

const Icon = styled('div')`
  display: flex;
  align-items: center;
  justify-content: center;

  width: 64px;
  height: 64px;

  left: 50%;
  top: -32px;
  margin-left: -32px;
  position: absolute;

  background-color: rgb(17, 107, 180);
  border-radius: 50%;
  border: 4px solid #f5f5f5;

  svg {
    width: 50%;
    height: 50%;
    color: #fff;
  }
`

const Card = styled('div')`
  display: flex;
  align-items: center;
  flex-direction: column;

  position: relative;
  margin-top: 32px;
  padding: 3rem 0;

  background-color: #fff;
  border-radius: 8px;
  /* border: 1px solid #f5f5f5; */
  box-shadow: 0 0 0 1px #f5f5f5;

  :hover,
  :focus {
    ${Icon} {
      animation: ${wiggle} 1.25s ease 1;
    }
  }
`

const Title = styled('strong')`
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
  color: #5a5a5a;
`

const Link = styled('a')`
  font-size: 16px;
`

const Grid = styled('div')`
  display: flex;
  align-items: center;
  justify-content: center;

  flex-direction: column;
  @media (min-width: 1024px) {
    flex-direction: row;
  }
`

const Wrapper = styled(Viewport.Width)``

export default ({ ...props }) => (
  <StaticQuery
    query={CONTACT_QUERY}
    render={({ settings, silhouette }) => (
      <Wrapper {...props}>
        <Image
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}
          fluid={silhouette.childImageSharp.fluid}
        />

        <Container>
          <h1 style={{ textAlign: 'center' }}>Contact Us</h1>
          <Divider style={{ color: '#aaa' }} />

          <Grid>
            {settings.contact.map(({ type, label, url, value }) => (
              <Column key={value} size={settings.contact.length}>
                <Card>
                  <Icon>{icons[type]}</Icon>
                  <Title>{label}</Title>
                  <Link href={url}>{value}</Link>
                </Card>
              </Column>
            ))}
          </Grid>
        </Container>
      </Wrapper>
    )}
  />
)
