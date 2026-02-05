import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    // Same-origin proxy: fetch URL server-side so no CORS (HTTP localhost → HTTPS works)
    {
      name: 'json-fetch-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/fetch')) {
            next()
            return
          }
          const parsed = new URL(req.url, 'http://localhost')
          const target = parsed.searchParams.get('url')
          if (!target) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'text/plain')
            res.end('Missing url parameter')
            return
          }
          try {
            const response = await fetch(target, { method: 'GET' })
            const text = await response.text()
            if (!response.ok) {
              res.statusCode = response.status
              res.setHeader('Content-Type', 'text/plain')
              res.end(text || 'HTTP ' + response.status)
              return
            }
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.end(text)
          } catch (e) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'text/plain')
            res.end(e.message || 'Proxy fetch failed')
          }
        })
      },
    },
  ],
})
