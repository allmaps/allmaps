<script lang="ts">
  import examples from '$lib/components/examples.js'

  const getHref = (url: string | string[]) => {
    // if url is an array, return multiple url params
    if (Array.isArray(url)) {
      const searchParams = new URLSearchParams()
      url.forEach((u) => searchParams.append('url', u))
      return `?${searchParams.toString()}`
    } else {
      return `?url=${encodeURIComponent(url)}`
    }
  }
</script>

<p class="mb-2">You can also use one of these examples:</p>

<ul class="list-disc list-inside space-y-1">
  {#each examples as example}
    <li>
      <a class="underline" href={getHref(example.url)}>
        <span>{example.title}</span>
      </a> <span class="text-gray-500 font-light">{example.organization}</span>
    </li>
  {/each}
</ul>
