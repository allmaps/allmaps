/* global umami */

function trackEvent (detail, event) {
  try {
    setTimeout(() => {
      umami.trackEvent(detail, event)
    }, 5000)
  } catch (err) {
    // Do nothing!
  }
}

export function trackHostnames (maps) {
  const imageUris = maps.map((map) => map.image.uri)
  const hostnames = [...new Set(imageUris.map((uri) => new URL(uri).hostname))]

  hostnames.forEach((hostname) => {
    trackEvent(hostname, 'image-hostname')
  })
}

export function trackAnnotationUrl (url) {
  trackEvent(url, 'annotation-url')
}

export function trackAnnotationSource (source) {
  trackEvent(source, 'annotation-source')
}
