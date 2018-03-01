import React from 'react'

export default () => (
  <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
    <img
      style={{ margin: '2rem 0', maxWidth: '80%', maxHeight: '80%', width: '768px' }}
      src={require('assets/logo.svg')}
    />

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
)
