import { defineScreenshot } from '@allmaps/ui/screenshots'

export const broadwayGeojsonUrl =
  'https://docs.allmaps.org/examples/transforming-coordinates/broadway.geojson'

export const broadwayGeojsonPreviewUrl = `https://geojson.io/#data=data:text/x-url,${encodeURIComponent(broadwayGeojsonUrl)}`

export const broadwayGeojsonScreenshot = defineScreenshot({
  slug: 'geojson-io-broadway',
  url: broadwayGeojsonPreviewUrl,
  viewport: { width: 960, height: 640, deviceScaleFactor: 1 }
})

export const lynnAtlasGeojsonUrl =
  'https://api.allmaps.org/manifests/23379602e8187445/maps.geojson'

export const lynnAtlasGeojsonPreviewUrl = `https://geojson.io/#data=data:text/x-url,${encodeURIComponent(lynnAtlasGeojsonUrl)}`

export const lynnAtlasGeojsonScreenshot = defineScreenshot({
  slug: 'geojson-io-lynn-atlas',
  url: lynnAtlasGeojsonPreviewUrl,
  viewport: { width: 1067, height: 667, deviceScaleFactor: 1 },
  delay: 8000
})
