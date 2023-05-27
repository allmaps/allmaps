<script lang="ts">
  export let backgroundColor = '#FF56BA'
</script>

<div
  style:background-color={backgroundColor}
  style="--background-color: {backgroundColor}"
  class="speech-balloon
    p-4 relative
    pointer-events-auto
    w-[30rem]
    max-w-[90%]
    text-white
    rounded-md
    shadow-md
    after:content-['']
    after:absolute
    after:bottom-0
    after:right-28
    after:w-0
    after:h-0
    after:border-[1.2em]
    after:border-solid
    after:border-transparent
    after:border-b-0
    after:border-r-0
    after:ml-[-0.5em]
    after:mb-[-1.19em]"
>
  <slot />
</div>

<style scoped>
  .speech-balloon:after {
    border-top-color: var(--background-color);
  }
</style>
