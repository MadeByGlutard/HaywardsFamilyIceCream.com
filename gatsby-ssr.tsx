/**
 * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/ssr-apis/
 */

import type { GatsbySSR } from 'gatsby'

export const onRenderBody: GatsbySSR['onRenderBody'] = ({ setHtmlAttributes, setHeadComponents }) => {
  setHtmlAttributes({ lang: `en` })

  setHeadComponents([<link key={0} rel="stylesheet" href="https://fonts.googleapis.com/css?family=Lobster+Two" />])
}

// Move external stylesheets to the top of the head section so they're loaded first.
export const onPreRenderHTML: GatsbySSR['onPreRenderHTML'] = ({ getHeadComponents, replaceHeadComponents }) => {
  const headComponents = getHeadComponents()
  headComponents.sort((x, y) => {
    if (typeof x === 'object' && x != null && 'props' in x && x.props.rel === 'stylesheet') {
      return -1
    } else if (typeof y === 'object' && y != null && 'props' in y && y.props.rel === 'stylesheet') {
      return 1
    }
    return 0
  })
  replaceHeadComponents(headComponents)
}
