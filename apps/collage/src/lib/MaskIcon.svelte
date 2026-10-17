<script lang="ts">
  let { size = 20 }: { size?: number } = $props()
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="currentColor"
  aria-hidden="true"
>
  <path
    fill-rule="evenodd"
    d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"
  />
</svg>
