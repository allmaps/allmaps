<script lang="ts">
  import { Banner } from '@allmaps/components'

  const { children, data } = $props()

  const bannerEnabled = $derived(data.env.PUBLIC_BANNER_ENABLED)
  const bannerText = $derived(data.env.PUBLIC_BANNER_TEXT)
</script>

<!-- TODO: add head tags -->
<Banner bannerTextEnabled={bannerEnabled} {bannerText} />
{@render children()}
