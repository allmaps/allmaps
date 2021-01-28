<!-- <script>
	import { onMount } from 'svelte'

  import Map from 'ol/Map'
  import View from 'ol/View'
  import {Tile as TileLayer} from 'ol/layer'
  import IIIF from 'ol/source/IIIF'
  import IIIFInfo from 'ol/format/IIIFInfo'

  export let annotation

  let iiifLayer
  let iiifOl

  function updateIiif (image) {
    const options = new IIIFInfo(image).getTileSourceOptions()
    if (options === undefined || options.version === undefined) {
      throw new Error('Data seems to be no valid IIIF image information.')
    }

    options.zDirection = -1
    const iiifTileSource = new IIIF(options)
    iiifLayer.setSource(iiifTileSource)

    const extent = iiifTileSource.getTileGrid().getExtent()

    iiifOl.setView(new View({
      resolutions: iiifTileSource.getTileGrid().getResolutions(),
      extent,
      constrainOnlyCenter: true
    }))

    iiifOl.getView().fit(iiifTileSource.getTileGrid().getExtent())
  }

  async function fetchImage (imageUri) {
		const response = await fetch(`${imageUri}/info.json`)
    const image = await response.json()
    return image
	}

	onMount(async () => {
    let imageUri
    if (annotation.type === 'Annotation') {
      imageUri = annotation.target.source
    } else if (annotation.type === 'AnnotationPage') {
      imageUri = annotation.items[0].target.source
    }

    iiifLayer = new TileLayer()
    iiifOl = new Map({
      layers: [iiifLayer],
      target: 'iiif'
    })

    const image = await fetchImage(imageUri)
    updateIiif(image)
	})
</script>

<div id="iiif" class="iiif">
</div>

<style>
  .iiif {
    width: 100vw;
    height: 100vh;
  }
</style> -->