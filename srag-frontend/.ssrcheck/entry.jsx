/* Render every route to a string with the network broken, so loading and error
   paths are exercised too. Not shipped: this directory is build-time only. */
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { AppRoutes } from '../src/App.jsx'

export function renderRoute(path) {
  return renderToString(
    <StrictMode>
      <StaticRouter location={path}>
        <AppRoutes />
      </StaticRouter>
    </StrictMode>,
  )
}
