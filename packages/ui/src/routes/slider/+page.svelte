<script lang="ts">
  import Header from '$lib/components/Header.svelte'
  import URLInput from '$lib/components/URLInput.svelte'
  import Slider from '$lib/components/SliderNext.svelte'
  import Opacity from '$lib/components/icons/Opacity.svelte'

  let value = 1
  let active = true

  function onChange(event: { detail: object }) {
    // console.log('slider', event.detail)
  }
</script>

<Header appName="Style Guide">
  <URLInput />
</Header>

<main class="container mx-auto p-4 space-y-8">
  <section>
    <h1 class="text-xl font-bold mb-4">Slider:</h1>
    <div class="absolute bottom-80">
      <Slider bind:value bind:active on:change={onChange} label="test">
        <Opacity class="stroke-pink-500" closed={value === 0} />
      </Slider>
    </div>
  </section>
</main>
