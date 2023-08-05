import { z } from 'zod'
import React, { ComponentProps } from 'react'
import styled from '@emotion/styled'
import { css } from '@emotion/react'
import { find } from 'lodash'
import { useStaticQuery, graphql } from 'gatsby'

import Sticky from './sticky'
import Container from './container'
// import contact from './contact'

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

const Wrapper = styled('div')<{ sticky?: boolean }>`
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

export default ({ isHomepage, ...props }: { isHomepage?: boolean } & ComponentProps<typeof Wrapper>) => {
  const navbarQuery = useStaticQuery(graphql`
    query Navbar {
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
  `)

  const { settings } = z
    .object({
      settings: z.object({
        social: z.array(
          z.object({
            type: z.string(),
            label: z.string(),
            url: z.string(),
          }),
        ),
        contact: z.array(
          z.object({
            type: z.string(),
            label: z.string(),
            url: z.string(),
            value: z.string(),
          }),
        ),
      }),
    })
    .parse(navbarQuery)

  const facebook = find(settings.social, { type: 'facebook' })!
  const phone = find(settings.contact, { type: 'phone' })!

  return (
    <div style={{ height: 64, flexShrink: 0 }}>
      <Sticky offsetY={2}>
        {({ sticky }: { sticky: boolean }) => (
          <Wrapper sticky={!isHomepage || sticky} {...props}>
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
}
