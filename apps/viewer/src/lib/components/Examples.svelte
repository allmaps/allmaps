<script lang="ts">
  import examples from '$lib/components/examples.js'
</script>

<p class="text-2xl font-bold text-black p-8 text-center">
  Or explore one of the following maps:
</p>

<ul class="grid grid-cols-1 sm:grid-cols-2 list-none gap-4 rounded-2xl">
  {#each examples as example}
    <li class="flex flex-col p-4 bg-white rounded-2xl shadow-md gap-2">
      <a class="contents" href={`?url=${encodeURIComponent(example.url)}`}>
        <img
          alt={`Preview of ${example.title}`}
          class="border-2 bg-white/50 border-pink/20 rounded-lg aspect-3/2 overflow-clip"
          src={`http://localhost:5514/${example.allmapsId}.jpg?fit=best&background=fff&width=600&height=400`}
        />

        <span class="underline">{example.title}</span>
      </a>
      <span class=" font-light">{example.organization}</span>
    </li>
  {/each}
</ul>
