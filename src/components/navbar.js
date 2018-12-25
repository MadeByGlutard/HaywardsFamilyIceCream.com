import React from 'react'
import Helmet from 'react-helmet'
import styled from '@emotion/styled'
import { css } from '@emotion/core'
import { find } from 'lodash'
import { StaticQuery, graphql } from 'gatsby'

import Sticky from './sticky'
import Container from './container'

const SOCIAL_QUERY = graphql`
  query {
    settings: settingsYaml {
      social {
        type
        label
        url
      }

      contact {
        type
        label
        url
        value
      }
    }
  }
`

const Link = styled('a')`
  background-image: none;
  text-decoration: none;
  text-shadow: none;
  color: inherit;
`

const BrandLink = styled(Link)`
  /*margin-left: -16px;*/
  font-size: 24px;
`

const NavLink = styled(Link)`
  padding: 4px 16px;
  font-size: 16px;
  text-decoration: none;
  transition: all 100ms ease-in-out;

  :hover,
  :focus {
    box-shadow: 1px 2px 4px rgba(12, 13, 14, 0.1);
    background-color: #fff;
    color: rgb(17, 107, 180);
    border-radius: 4px;
  }
`

const Divider = styled('div')`
  background-color: currentColor;
  opacity: 0.8;
  margin: 0 16px;
  height: 1em;
  width: 1px;
`

const Nav = styled('div')`
  margin-left: auto;

  display: flex;
  align-items: center;
`

const Wrapper = styled('div')`
  position: fixed;
  z-index: 1000;
  height: 64px;
  width: 100%;
  left: 0;
  top: 0;

  color: #fff;
  border-top: 4px solid rgb(183, 30, 35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.25);
  background-color: rgba(0, 0, 0, 0.25);
  transition: all 100ms ease-in-out;

  ${props =>
    props.sticky &&
    css`
      background-color: #fff;
      background-color: rgba(255, 255, 255, 0.99);
      color: rgb(17, 107, 180);
      box-shadow: 0 2px 2px rgba(12, 13, 14, 0.05);

      ${NavLink} {
        :hover,
        :focus {
          background-color: rgb(17, 107, 180);
          color: #fff;
        }
      }
    `};

  ${Container} {
    height: 100%;
    display: flex;
    align-items: center;
  }

  /* Responsive */
  @media (max-width: 767px) {
    ${Container} {
      justify-content: center;
    }

    ${Nav} {
      display: none;
    }
  }
`

export default props => (
  <StaticQuery
    query={SOCIAL_QUERY}
    render={({ settings }) => {
      const facebook = find(settings.social, { type: 'facebook' })
      const phone = find(settings.contact, { type: 'phone' })

      return (
        <div style={{ height: 64, flexShrink: 0 }}>
          <Helmet>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Lobster+Two" />
          </Helmet>

          <Sticky offsetY={2}>
            {({ sticky }) => (
              <Wrapper sticky={!props.isHomepage || sticky} {...props}>
                <Container>
                  <BrandLink href="/">Hayward's Family Ice Cream</BrandLink>

                  <Nav>
                    <NavLink href={facebook.url}>{facebook.label}</NavLink>
                    <Divider />
                    <NavLink href={phone.url}>{phone.label}</NavLink>
                  </Nav>

                  {/* <NavLink href="">Ice Cream</NavLink> */}
                  {/* <NavLink href="">Food / Drink</NavLink> */}
                  {/* <NavLink href="">History</NavLink> */}
                  {/* <NavLink href="">Trees</NavLink> */}
                </Container>
              </Wrapper>
            )}
          </Sticky>
        </div>
      )
    }}
  />
)
