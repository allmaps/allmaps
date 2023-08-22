<script lang="ts">
  let name: string = ''
</script>

<div class="my-5 bg-blue-200 rounded-lg p-5">
  <h1>Hello from {name || 'Svelte'}!</h1>
  <input placeholder="enter name" bind:value={name} />
</div>
