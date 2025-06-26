<script lang="ts">
  import { Logo } from '@allmaps/ui'
</script>

<!-- TODO: move to @allmaps/ui -->
<footer
  class="w-full px-4 py-16 lg:py-24 flex flex-col gap-4 justify-center items-center
  text-white text-center"
>
  <div class="w-12">
    <a href="https://allmaps.org">
      <Logo inverted />
    </a>
  </div>
  <p class="max-w-md">
    Allmaps makes it easier and more inspiring to curate, georeference and
    explore collections of digitized maps.
  </p>
  <a href="https://allmaps.org" class="underline">allmaps.org</a>
</footer>

<style>
  footer {
    background-image: radial-gradient(
      circle at 50% 50%,
      #25318f 0%,
      #101656 100%
    );
  }
</style>
