<script lang="ts">
  import Viewer from '$lib/components/Viewer.svelte'

  // Diemer meer
  const annotationUrl =
    'https://annotations.allmaps.org/manifests/a0d6d3379cfd9f0a'
  // Europa
  // const annotationUrl = 'https://annotations.allmaps.org/images/f6033bee94f7763e'
  // UK
  // const annotationUrl = 'https://annotations.allmaps.org/maps/135dfd2d58dc26ec'
  // Rottedam
  // const annotationUrl =
  //   'https://annotations.allmaps.org/manifests/631b96e4d6d3f421'
  // Piranesi
  // const annotationUrl = 'https://annotations.allmaps.org/images/9f888622a47479cc'
  // Netkaart
  // const annotationUrl =
  //   'https://gist.githubusercontent.com/sammeltassen/fa3dbfaf4dfa800e00824478c4bd1928/raw/f182beac911e38b0a1d1eb420fbd54b4e6d2f2eb/nl-railway-map.json'

  let annotations = $state<unknown[]>([])

  fetch(annotationUrl)
    .then((response) => response.json())
    .then((response) => {
      annotations = [response]
    })

  let componentOptions = {
    addNavigationControl: true,
    addGeolocateControl: true
  }
</script>

<div class="absolute w-full h-full flex flex-col">
  <Viewer {annotations} {componentOptions} />
</div>
