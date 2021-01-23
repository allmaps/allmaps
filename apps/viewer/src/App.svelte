<script>
	import Map from './Map.svelte'

	import queryString from 'query-string'

	let queryParams
	let url
	let annotation

	$: queryParams = queryString.parse(window.location.search)
	$: url = queryParams.url

	async function fetchAnnotation (url) {
		const response = await fetch(url)

		// TODO: check annotation!
		annotation = await response.json()
	}
</script>

<main>
	{#if url}
		{#await fetchAnnotation(url)}
			<p>Loading...</p>
		{:then data}
			<Map annotation={annotation} />
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