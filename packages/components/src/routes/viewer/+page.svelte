<script lang="ts">
  import Viewer from '$lib/components/Viewer.svelte'

  import { OptionsState } from '$lib/components/options/OptionsState.svelte'

  // Diemer meer
  // const annoationUrl =
  //   'https://annotations.allmaps.org/manifests/a0d6d3379cfd9f0a'
  // Europa
  // const annoationUrl = 'https://annotations.allmaps.org/images/f6033bee94f7763e'
  // UK
  const annoationUrl = 'https://annotations.allmaps.org/maps/135dfd2d58dc26ec'
  // Rottedam
  // const annoationUrl =
  //   'https://annotations.allmaps.org/manifests/631b96e4d6d3f421'

  let annotations = $state<unknown[]>([])

  fetch(annoationUrl)
    .then((response) => response.json())
    .then((response) => {
      annotations = [response]
    })

  let optionsState = new OptionsState({
    addNavigationControl: true,
    addGeolocateControl: true
  })
</script>

<div class="absolute w-full h-full flex flex-col">
  <Viewer {annotations} {optionsState} />
</div>
