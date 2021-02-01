<script>
	import { onMount } from 'svelte'

	import Header from './Header.svelte'
	import Tabs from './Tabs.svelte'
	import Examples from './Examples.svelte'

	import { parse as parseAnnotation } from '@allmaps/annotation'

	const dataUrlPrefix = 'data:text/x-url,'
	const dataJsonPrefix = 'data=data:application/json,'

	let data

	let annotationUrl = ''
	let annotationString = ''

	function getHash () {
		return location.hash.slice(1)
	}

	let hash = getHash()

	$: {
		const queryParams = new URLSearchParams(hash)
		data = queryParams.get('data')
	}

	function setDataHash (data) {
		const queryParams = new URLSearchParams('')
		queryParams.set('data', data)
		history.replaceState(null, null, '#' + queryParams.toString())
		window.dispatchEvent(new HashChangeEvent('hashchange'))
	}

	function handleUrlSubmit () {
		setDataHash(dataUrlPrefix + encodeURIComponent(annotationUrl))
	}

	function handleStringSubmit () {
		setDataHash(dataJsonPrefix + encodeURIComponent(annotationString))
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

	onMount(async () => {
		window.addEventListener('hashchange', () => {
			hash = getHash()
		}, false);
	})
</script>

<Header />
<main>
	{#if data}
		{#await parseUrlData(data)}
			<div class="content">
				<!-- TODO: centered  -->
				<p>Loading…</p>
			</div>
		{:then annotation}
			<Tabs annotation={annotation} maps={parseAnnotation(annotation)} />
		{:catch error}
			<div class="content">
				<!-- TODO: centered! Make Error component!  -->
				<p>An error occurred!</p>
			</div>
		{/await}
	{:else}
		<div class="content">
			<p>Open a <a href="https://allmaps.org/#annotations">
				IIIF georeference annotation</a> from a URL:</p>
			<form on:submit|preventDefault={handleUrlSubmit}>
				<input bind:value="{annotationUrl}" name="url" placeholder="Annotation URL" autofocus />
				<button disabled="{annotationUrl.length === 0}">View</button>
			</form>
			<p>Or, paste an annotation in the text box:</p>
			<form on:submit|preventDefault={handleStringSubmit}>
				<textarea bind:value="{annotationString}" class="monospace"
					autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
				<button disabled="{annotationString.length === 0}">View</button>
			</form>
			<section>
				<Examples />
			</section>
			<footer>
				<a href="https://bertspaan.nl">
					<img alt="Made by Bert Spaan"
					src="https://raw.githubusercontent.com/allmaps/style/master/images/bertspaan.svg" />
				</a>
			</footer>
		</div>
	{/if}
</main>

<style>
main {
	flex-grow: 1;
	/* overflow: hidden; */
	overflow: auto;
}

.content {
	padding: 0.5em;
	margin: 0 auto;
	max-width: 900px;
}

form input,
form textarea {
	width: 100%;
	display: block;
}

form textarea {
	height: 10em;
}

form > *:not(:last-child) {
	margin-bottom: 0.5em;
}

footer {
	padding-top: 4em;
	padding-bottom: 1em;
	display: flex;
	flex-direction: column;
	align-items: center;
}

footer img {
	margin: 1em;
	width: 128px;
}
</style>