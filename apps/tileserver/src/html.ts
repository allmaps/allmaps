import type { Request } from 'itty-router'

const tilesBaseUrl = 'https://tiles.allmaps.org'

const generateIframeHtml = (tileJsonUrl: string) => `<!DOCTYPE html>
<header>
<style>
  html {
    height: 100%;
  }

  body {
    margin: 0;
    width: 100%;
    height: 100%;
  }

  iframe {
    border: none;
    width: 100%;
    height: 100%;
  }
</style>
</header
<body>
  <iframe src="${tilesBaseUrl}/?url=${tileJsonUrl}"></iframe>
</body>`

export function generateTilesHtml(req: Request): Response {
  const tileJsonUrl = req.url.replace(
    '%7Bz%7D/%7Bx%7D/%7By%7D.png',
    'tiles.json'
  )

  return new Response(generateIframeHtml(tileJsonUrl), {
    headers: {
      'content-type': 'text/html;charset=UTF-8'
    }
  })
}
