<script lang="ts">
  import { Logo } from '@allmaps/ui'
</script>

<!-- TODO: move to @allmaps/ui -->
<footer class="w-full h-72 flex justify-center items-center">
  <div class="w-12">
    <a href="https://allmaps.org">
      <Logo inverted />
    </a>
  </div>
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
