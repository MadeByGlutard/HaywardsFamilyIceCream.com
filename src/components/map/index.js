import React from 'react'
import { stringify } from 'querystring'

import Divider from 'components/divider'
import Viewport from 'components/viewport'

const src = `https://www.google.com/maps/embed/v1/place?${stringify({
  key: 'AIzaSyAuu-v8xK1P-uy_NekuEs5z6NRrseapngc',
  q: "Hayward's+Ice+Cream+of+Milford,+Elm+Street,+Milford,+NH"
})}`

export function MapA() {
  return (
    <Viewport.Width style={{ backgroundColor: 'rgb(17, 107, 180)', marginTop: 128, marginBottom: 128, padding: 64 }}>
      <h1 style={{ color: '#fff', marginTop: 0, textAlign: 'center' }}>Our Location</h1>
      <Divider style={{ color: '#fff' }} />

      <div style={{ margin: '0 auto', maxWidth: '768px' }}>
        <div style={{ padding: 8, backgroundColor: '#fff', border: '4px solid rgb(183, 30, 35)' }}>
          <iframe style={{ display: 'block', width: '100%', height: 450, margin: 0, border: 0 }} src={src} />
        </div>
      </div>
    </Viewport.Width>
  )
}

export function MapB() {
  return (
    <Viewport.Width style={{ backgroundColor: 'rgb(183, 30, 35)' }}>
      <div style={{ margin: '0 auto', maxWidth: '768px', marginTop: 64, marginBottom: 64 }}>
        {/* <div style={{ boxShadow: '0 0 0 10px #fff, 0 0 0 12px rgb(17, 107, 180)' }}> */}
        <div style={{ boxShadow: '0 0 0 10px #fff, 0 0 0 12px rgb(183, 30, 35)' }}>
          <iframe style={{ display: 'block', width: '100%', height: 450, margin: 0, border: 0 }} src={src} />
        </div>
      </div>
    </Viewport.Width>
  )
}

export function MapC() {
  return (
    <Viewport.Width style={{ filter: 'grayscale(100%)' }}>
      <iframe style={{ display: 'block', width: '100%', height: 320, margin: 0, border: 0 }} src={src} />
    </Viewport.Width>
  )
}

export function MapD() {
  return (
    <div style={{ margin: '0 auto', maxWidth: '768px', marginTop: 64, marginBottom: 64 }}>
      <div style={{ boxShadow: '0 0 0 10px #fff, 0 0 0 12px rgb(183, 30, 35)' }}>
        <iframe style={{ display: 'block', width: '100%', height: 450, margin: 0, border: 0 }} src={src} />
      </div>
    </div>
  )
}

export function MapE() {
  return (
    <div
      style={{
        margin: '64px auto',
        padding: 8,
        maxWidth: '768px',
        backgroundColor: '#fff',
        border: '4px solid rgb(183, 30, 35)'
      }}
    >
      <iframe style={{ display: 'block', width: '100%', height: 450, margin: 0, border: 0 }} src={src} />
    </div>
  )
}
