<script lang="ts">
  import examples from '$lib/components/examples.yaml'

  // type Example = {
  //   title: string
  //   organization: string
  //   url: string
  // }

  // const chips: Example[] = examples
</script>

<p>
  You can also use one of these examples:
</p>

<ul>
  {#each examples as example}
    <li>
      <a href={`#data=data:text/x-url,${encodeURIComponent(example.url)}`}>
        <span>{example.title}</span>
      </a> <span class="light organization">{example.organization}</span>
    </li>
  {/each}
</ul>

<style scoped>
li {
  margin-bottom: 0.5em;
}

.organization {
  color: #aaa;
  text-decoration: none;
}
</style>
