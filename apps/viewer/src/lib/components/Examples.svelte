<script lang="ts">
  import examples from '$lib/components/examples.js'
</script>

<p class="mb-2">You can also use one of these examples:</p>

<ul class="list-disc list-inside space-y-1">
  {#each examples as example}
    <li>
      <a class="underline" href={`?url=${encodeURIComponent(example.url)}`}>
        <span>{example.title}</span>
      </a> <span class="text-gray-500 font-light">{example.organization}</span>
    </li>
  {/each}
</ul>
