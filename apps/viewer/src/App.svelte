<script>
	import Header from './Header.svelte'
	import Map from './Map.svelte'

	import { parse as parseAnnotation } from '@allmaps/annotation'

	const dataUrlPrefix = 'data:text/x-url,'
	const dataJsonPrefix = 'data=data:application/json,'

	let queryParams

	let annotationUrl = ''
	let annotationString = ''

	$: hash = location.hash.slice(1)
	$: queryParams = new URLSearchParams(hash)
	$: data = queryParams.get('data')

	function handleUrlSubmit () {
		queryParams.set('data', dataUrlPrefix + encodeURIComponent(annotationUrl))

		history.replaceState(null, null, '#' + queryParams.toString())
		window.dispatchEvent(new HashChangeEvent('hashchange'))

		data = queryParams.get('data')
	}

	function handleStringSubmit () {
		queryParams.set('data', dataJsonPrefix + encodeURIComponent(annotationString))

		history.replaceState(null, null, '#' + queryParams.toString())
		window.dispatchEvent(new HashChangeEvent('hashchange'))

		data = queryParams.get('data')
	}

	async function fetchAnnotation (url) {
		const response = await fetch(url)
		const annotation = await response.json()
		return annotation
	}

	async function parseUrlData (data) {
		if (data.startsWith(dataUrlPrefix)) {
			const url = decodeURIComponent(data.replace(dataUrlPrefix, ''))
			return fetchAnnotation(url)
		} else if (data.startsWith(dataJsonPrefix)) {
			const annotation = JSON.parse(decodeURIComponent(data.replace(dataJsonPrefix, '')))
			return annotation
		} else {
			throw new Error('Unsupported!')
		}
	}
</script>

<Header />
<main>
	{#if data}
		{#await parseUrlData(data)}
			<p>Loading...</p>
		{:then annotation}
			<!-- TODO: check annotation! -->
			<Map annotation={annotation} maps={parseAnnotation(annotation)} />
		{:catch error}
			<p>An error occurred!</p>
		{/await}
	{:else}
		<form on:submit|preventDefault={handleUrlSubmit}>
			<input bind:value="{annotationUrl}" name="url" placeholder="Annotation URL" autofocus />
			<button disabled="{annotationUrl.length === 0}">Go</button>
		</form>
		<p>Or, past an annotation in the text box:</p>
		<form on:submit|preventDefault={handleStringSubmit}>
			<textarea bind:value="{annotationString}"
				autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
			<button disabled="{annotationString.length === 0}">Go</button>
		</form>
		<section>
			<h2>Examples</h2>
		</section>
	{/if}
</main>

<style>
main {
	padding: 0;
	height: 100%;
}
</style>