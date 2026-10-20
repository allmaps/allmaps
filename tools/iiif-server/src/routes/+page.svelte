<script lang="ts">
  import Root from '../lib/components/Root.svelte'

  import type { PageData } from './$types'

  type Props = {
    data: PageData
  }

  let { data }: Props = $props()
</script>

<Root catalog={data.catalog} />
