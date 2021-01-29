<script>
  import examples from './examples.yaml'
</script>

<p>
  You can also use one of these examples:
</p>

<ul>
	{#each examples as example}
		<li><a href={`#data=data:text/x-url,${encodeURIComponent(example.url)}`}>
			{example.title}
		</a></li>
	{/each}
</ul>