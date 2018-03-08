import React, { Fragment } from 'react'

import Header from 'components/header'
import Viewport from 'components/viewport'

export default ({ data }) => (
  <Fragment>
    <Header logo={data.logo} />

    <div style={{ minHeight: 0 /*8000*/, marginBottom: 128 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center',
          textAlign: 'center'
        }}
      >
        <h1>
          <em>Coming Soon!</em>
        </h1>

        <br />
        <br />

        <a href="https://www.facebook.com/haywardsofmilford/">Find us on Facebook</a>

        <br />
        <br />

        <a href="tel:16036728383">
          Give us a Call<br />(603) 672-8383
        </a>
      </div>
    </div>

    {/* <Viewport.Width> */}
    <div style={{ margin: '0 auto', maxWidth: '768px', marginBottom: 128 }}>
      <iframe
        frameBorder="0"
        style={{ display: 'block', width: '100%', height: 450, margin: 0, border: 0 }}
        src="https://www.google.com/maps/embed/v1/place?key=AIzaSyAuu-v8xK1P-uy_NekuEs5z6NRrseapngc&q=Hayward's+Ice+Cream+of+Milford,+Elm+Street,+Milford,+NH"
        allowFullScreen
      />
    </div>
    {/* </Viewport.Width> */}
  </Fragment>
)

export const query = graphql`
  query IndexPage {
    logo: file(relativePath: { eq: "assets/logo.png" }) {
      childImageSharp {
        sizes {
          ...GatsbyImageSharpSizes_noBase64
        }
      }
    }
  }
`
