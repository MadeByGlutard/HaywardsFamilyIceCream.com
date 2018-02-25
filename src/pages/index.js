import React from 'react'

export default () => (
  <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', justifyContent: 'center' }}>
    <img
      style={{ margin: '2rem 0', maxWidth: '80%', maxHeight: '80%', width: '768px' }}
      src={require('assets/logo.svg')}
    />

    <h1>
      <em>Coming Soon!</em>
    </h1>
  </div>
)
