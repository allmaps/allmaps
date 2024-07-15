<script lang="ts">
  import Header from '$lib/components/Header.svelte'
  import URLInput from '$lib/components/URLInput.svelte'
  import Dial from '$lib/components/Dial.svelte'

  import Color from '$lib/components/styleguide/Color.svelte'

  import MapMonster from '$lib/components/MapMonster.svelte'

  import Geocoder from '$lib/components/Geocoder.svelte'

  import { shades, originalColorIndex } from '@allmaps/tailwind'

  import { mapMonsterColors, mapMonsterMoods } from '$lib/shared/constants.js'

  import GeocodeEarth from '$lib/shared/geocoder/providers/geocode-earth'
  import WorldHistoricalGazetteer from '$lib/shared/geocoder/providers/world-historical-gazetteer'
  import { PUBLIC_GEOCODE_EARTH_API_KEY } from '$env/static/public'

  let opacity = 1
</script>

<Header appName="Style Guide">
  <URLInput />
</Header>

<main class="container mx-auto p-4 space-y-8">
  <section>
    <h1 class="text-xl font-bold mb-4">Icons:</h1>
    <Geocoder
      providers={[
        new GeocodeEarth(PUBLIC_GEOCODE_EARTH_API_KEY),
        new WorldHistoricalGazetteer()
      ]}
      on:select={(event) => console.log(event.detail)}
    />
  </section>
  <section>
    <h1 class="text-xl font-bold mb-4">Colors:</h1>
    <ul class="flex flex-row basis-full gap-2">
      {#each Object.entries(shades) as [color, colorShades]}
        <li><Color {color} shades={colorShades} {originalColorIndex} /></li>
      {/each}
    </ul>
  </section>
  <section>
    <h1 class="text-xl font-bold mb-4">Controls:</h1>
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label class="flex items-center gap-2">
      <Dial bind:value={opacity} keyCode="Space" label="Opacity" />
      <span>{Math.round(opacity * 100)}%</span>
    </label>
  </section>
  <section>
    <h1 class="text-xl font-bold mb-4">Map Monsters:</h1>
    <ul class="columns-2">
      {#each mapMonsterColors as color}
        <li class="mb-4">
          <ul class="flex flex-col gap-4">
            {#each mapMonsterMoods as mood}
              <li class="flex flex-row items-center gap-4">
                <MapMonster {color} {mood} />
                <pre
                  class="text-sm">&lt;MapMonster color="{color}" mood="{mood}" /&gt;</pre>
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
  </section>
</main>
