import { html } from 'itty-router'

const generateIframeHtml = (
  tileViewerBaseUrl: string,
  tileJsonUrl: string
) => `<!DOCTYPE html>
<head>
  <meta charset="utf-8" />
  <title>Allmaps Tile Server</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
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
  <iframe src="${tileViewerBaseUrl}/?url=${encodeURIComponent(
  tileJsonUrl
)}"></iframe>
</body>`

export function generateTilesHtml(
  req: Request,
  tileViewerBaseUrl: string
): Response {
  const tileJsonUrl = req.url.replace(
    '%7Bz%7D/%7Bx%7D/%7By%7D.png',
    'tiles.json'
  )

  return html(generateIframeHtml(tileViewerBaseUrl, tileJsonUrl))
}
