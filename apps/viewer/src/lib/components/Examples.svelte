<script lang="ts">
  import { examples } from '$lib/components/examples.json'
</script>

<p>You can also use one of these examples:</p>

<ul>
  {#each examples as example}
    <li>
      <a href={`#url=${encodeURIComponent(example.url)}`}>
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
