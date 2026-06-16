<script lang="ts">
  import { parseLanguageString } from '@allmaps/iiif-inspector'

  import type { OrganizationSummary } from '$lib/types/shared.js'

  type Props = {
    organization?: OrganizationSummary
    link?: boolean
    class?: string
  }

  let { organization, link = false, class: className = '' }: Props = $props()

  let label = $derived.by(() => {
    const organizationLabel = parseLanguageString(
      organization?.organization.label,
      'en'
    )

    if (!organizationLabel) {
      return
    }

    if (organization?.otherOrganizationCount) {
      const count = organization.otherOrganizationCount
      const suffix = count === 1 ? 'other' : 'others'

      return `${organizationLabel} + ${count} ${suffix}`
    }

    return organizationLabel
  })

  let url = $derived(organization?.organization.url)

  const badgeClass =
    'shrink-0 rounded-full border-[0.5px] border-blue bg-blue/10 px-2 py-0.5 text-xs text-blue-600/80 transition-colors'
</script>

{#if label}
  {#if link && url}
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    <a
      class={[
        badgeClass,
        'hover:bg-blue/15 hover:text-blue-700 hover:underline',
        className
      ]}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onclick={(event) => event.stopPropagation()}
    >
      {label}
    </a>
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  {:else}
    <span class={[badgeClass, className]}>{label}</span>
  {/if}
{/if}
