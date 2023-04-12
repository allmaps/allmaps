async function fetchJson (url) {
  return fetch(url).then((response) => response.json())
}

async function addGeoreferenceAnnotationByUrl(warpedMapSource, url) {
  const annotation = await fetchJson(url)
  warpedMapSource.addGeoreferenceAnnotation(annotation)
}

async function initialize(WarpedMapLayer, WarpedMapSource) {
  const warpedMapSource = new WarpedMapSource()
  const warpedMapLayer = new WarpedMapLayer({
    source: warpedMapSource
  })

  const map = new ol.Map({
    target: 'map',
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      }),
      warpedMapLayer
    ],
    view: new ol.View({
      center: ol.proj.fromLonLat([-71.0599, 42.3589]),
      zoom: 14
    })
  })

  addGeoreferenceAnnotationByUrl(warpedMapSource, 'https://annotations.allmaps.org/images/813b0579711371e2@2c1d7e89d8c309e8')
  addGeoreferenceAnnotationByUrl(warpedMapSource, 'https://annotations.allmaps.org/images/25b19ade19654e66@6a6b14487e882f79')
  addGeoreferenceAnnotationByUrl(warpedMapSource, 'https://allmaps.org/webgl2-preview/west-roxbury.json')

  if (initializeControls) {
    initializeControls(warpedMapLayer)
  }
}
