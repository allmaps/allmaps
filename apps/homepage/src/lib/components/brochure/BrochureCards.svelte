<script lang="ts">
  import { toolIdentities } from '$lib/data/tool-identities.js'
  import MaskedMap from '../MaskedMap.svelte'
  import type { MaskedMapData } from '$lib/masked-map.js'
  import { partnershipMapSources } from '$lib/data/partnership-maps.js'

  let { maskedMaps }: { maskedMaps: MaskedMapData[] } = $props()
</script>

{#snippet renderMaskedMap(
  index: number,
  outlineClass: string,
  textColor: string
)}
  {@const source = partnershipMapSources[index]}
  <a
    href={`${toolIdentities.viewer.href}/?url=${encodeURIComponent(source.annotationUrl)}`}
    aria-label={`View ${source.label} in Allmaps Viewer`}
  >
    <MaskedMap
      map={maskedMaps[index]}
      alt={source.label}
      {outlineClass}
      outlineWidth={5}
    />
  </a>
  <p class={[textColor, 'text-sm text-right']}>
    <strong>{source.label}</strong>
  </p>
  <p class={[textColor, 'text-sm text-right']}>
    {source.institution}
  </p>
{/snippet}

<ol
  class="m-0 w-full h-full flex flex-col lg:grid lg:grid-rows-1 lg:grid-cols-3 print:grid print:grid-rows-1 print:grid-cols-3 list-none p-4 gap-4"
>
  <li
    class="p-4 md:p-6 lg:p-8 bg-yellow/5 rounded-xl grid grid-cols-1 sm:grid-cols-[2fr_1fr] lg:grid-cols-1 lg:grid-rows-[1fr_min-content] print:grid-cols-1 print:grid-rows-[1fr_min-content] gap-8"
  >
    <div class="flex flex-col gap-4">
      <h3 class="text-yellow section-title print:text-4xl">
        Works with any IIIF map
      </h3>
      <p>
        Allmaps is an ecosystem for working with maps, plans and aerial photos.
        It offers tools to annotate such resources with geospatial information,
        and turns images into interactive map layers to overlay and compare.
      </p>
      <p>
        Allmaps is IIIF-first and does not require specific infrastructure or
        expertise to turn digitized images into interactive maps. The only
        requirement is a map collection that is available through the <a
          class="underline text-yellow"
          href="https://iiif.io/api/image/">IIIF Image API</a
        >, and, preferably, the
        <a
          class="underline text-yellow"
          href="https://iiif.io/api/presentation/">IIIF Presentation API</a
        >.
      </p>
    </div>
    <!-- place-self-end md:place-self-auto -->
    <div class="w-full justify-self-end">
      {#if maskedMaps[0]}
        {@render renderMaskedMap(0, 'stroke-yellow', 'text-yellow')}
      {/if}
    </div>
  </li>
  <li
    class="p-4 md:p-6 lg:p-8 bg-blue/5 rounded-xl grid grid-cols-1 sm:grid-cols-[1fr_2fr] lg:grid-cols-1 lg:grid-rows-[1fr_min-content] print:grid-cols-1 print:grid-rows-[1fr_min-content] gap-8"
  >
    <div class="flex flex-col gap-4">
      <h3 class="text-blue section-title print:text-4xl">
        Open & light-weight
      </h3>
      <p>
        Georeferencing is the process of annotating images with geospatial
        information. Other than creating new versions of the image, Allmaps uses
        light-weight and <a
          class="underline text-blue"
          href="https://iiif.io/api/extension/georef/"
          >standardized Georeference Annotations</a
        > to annotate the original IIIF resource.
      </p>
      <p>
        All georeference data created with Allmaps is <a
          class="underline text-blue"
          href="/data">published daily</a
        > as an openly licensed dataset. Its open source packages can be tailored
        to existing workflows and institutional requirements.
      </p>
    </div>
    <!-- place-self-end md:place-self-auto md:-order-1 print:-order-1 print:place-self-auto -->
    <div class="w-full justify-self-end sm:-order-1">
      {#if maskedMaps[1]}
        {@render renderMaskedMap(1, 'stroke-blue', 'text-blue')}
      {/if}
    </div>
  </li>
  <li
    class="p-4 md:p-6 lg:p-8 bg-orange/5 rounded-xl grid grid-cols-1 sm:grid-cols-[2fr_1fr] lg:grid-cols-1 lg:grid-rows-[1fr_min-content] print:grid-cols-1 print:grid-rows-[1fr_min-content] gap-8"
  >
    <div class="flex flex-col gap-4">
      <h3 class="text-orange section-title print:text-4xl">
        Making maps accessible
      </h3>
      <p>
        Allmaps is a collaboration between <a
          class="underline text-orange"
          href="https://www.tudelft.nl/en/library"
          >Delft University of Technology Library</a
        >
        and independent developer and cartographer
        <a class="underline text-orange" href="https://bertspaan.nl"
          >Bert Spaan</a
        >. A legal entity is being established for its maintenance and further
        development, while preserving the commitment to open data and open
        source.
      </p>
      <p>
        The ultimate goal of Allmaps is to make all digitized maps accessible
        and to provide an interface for exploring IIIF maps across collections
        and institutions.
      </p>
    </div>
    <!-- place-self-end md:place-self-auto -->
    <div class="w-full justify-self-end">
      {#if maskedMaps[2]}
        {@render renderMaskedMap(2, 'stroke-orange', 'text-orange')}
      {/if}
    </div>
  </li>
</ol>
