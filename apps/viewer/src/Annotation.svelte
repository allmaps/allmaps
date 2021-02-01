<script>
  export let annotation
</script>

<div class="annotation">
  <pre><code>{JSON.stringify(annotation, null, 2)}
  </code></pre>
</div>

<style>
.annotation {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

pre {
  font-size: 75%;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  margin: 0;
}
</style>