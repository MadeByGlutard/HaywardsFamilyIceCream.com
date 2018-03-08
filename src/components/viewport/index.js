import styled from 'react-emotion'

export const Viewport = {}

export const ViewportWidth = styled('div')`
  /* https://twitter.com/una/status/951519740840873984 */
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
`

export const ViewportHeight = styled('div')``

export default Viewport
Viewport.Width = ViewportWidth
Viewport.Height = ViewportHeight
