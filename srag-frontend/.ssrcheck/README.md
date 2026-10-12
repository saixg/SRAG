# SSR render check

`src/srag/app.py` mounts `srag-frontend/dist` and falls back to `index.html` for
client-side routes, so a page that throws on first render returns a blank 200
rather than an error anyone would notice. This renders every route to a string
with `fetch` rejected, which exercises the loading and error branches too.

    npx vite build --ssr .ssrcheck/entry.jsx --outDir dist-ssr
    node .ssrcheck/run.mjs

Build-time only; nothing here ships. `dist-ssr/` is gitignored.
