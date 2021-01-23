<script>
	import queryString from 'query-string'

	let queryParams

	export let url
	export let annotation


	$: queryParams = queryString.parse(window.location.search)
	$: url = queryParams.url

	async function fetchAnnotation (url) {
		console.log('nu', url)
		const response = await fetch(url)

		// TODO: check annotation!
		annotation = await response.json()
	}
</script>

<main>
	{#if url}
		{#await fetchAnnotation(url)}
			<p>...waiting</p>
		{:then data}
			<pre><code>{JSON.stringify(annotation, null, 2)}</code></pre>
		{:catch error}
			<p>An error occurred!</p>
		{/await}
	{:else}
		<form>
			<input name="url" placeholder="Annotation URL" autofocus />
			<button>Go</button>
		</form>
	{/if}
</main>

<style>
	main {
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>