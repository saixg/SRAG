// Breaks the network before importing the app, so loading and error branches
// are the ones that render.
globalThis.fetch = () => Promise.reject(new Error('offline (ssr check)'))
globalThis.localStorage = undefined
const { renderRoute } = await import('../dist-ssr/entry.js')

const routes = ['/', '/securerag', '/knowledge', '/evidence', '/security', '/audit', '/apps', '/help', '/people', '/bogus']
let failed = 0
for (const path of routes) {
  try {
    const html = renderRoute(path)
    console.log(`  ok   ${path.padEnd(12)} ${String(html.length).padStart(6)} bytes`)
  } catch (err) {
    failed++
    console.log(`  FAIL ${path.padEnd(12)} ${err.message}`)
  }
}
console.log(failed ? `\n${failed} route(s) failed to render` : `\nall ${routes.length} routes rendered`)
process.exit(failed ? 1 : 0)
