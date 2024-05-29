<!-- TODO: is the the !important modifier for the container queries really needed?
  Is there another way to make sure container queries have precedence over media queries? -->
<div class="w-full @container">
  <ol
    class="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
      @xl:!grid-cols-3 @5xl:!grid-cols-4 @7xl:!grid-cols-5"
  >
    <slot />
  </ol>
</div>
