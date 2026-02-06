import React from 'react'

export default function NotFound() {
  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>404</h2>
        <div className="label">Page not found</div>
        <div style={{ marginTop: 12 }}>
          <a className="btn secondary" href="/">Go home</a>
        </div>
      </div>
    </div>
  )
}
