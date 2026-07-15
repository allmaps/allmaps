<script lang="ts">
  let {
    title,
    description
  }: {
    title: string
    description: string
  } = $props()
</script>

<div class="max-w-80 text-blue-900 font-[inherit]">
  <h2 class="mb-1 text-base font-semibold leading-[1.3]">{title}</h2>
  <p class="text-sm leading-normal">{description}</p>
</div>
