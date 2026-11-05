<script lang="ts">
  import ErrorPage from '$lib/components/ErrorPage.svelte'
</script>

<!-- Prerenders to 404.html for static hosts, including visits without JavaScript. -->
<ErrorPage />
