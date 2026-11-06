<script lang="ts">
  import PartnerMap from './PartnerMap.svelte'
  import type { PartnerPreviewData } from '$lib/partner-preview.js'
  import {
    highlightedPartnerMaps,
    partnerLogoSizes,
    type PartnerOrganization
  } from '$lib/data/partners.js'

  let {
    organizations,
    partnerPreviews
  }: {
    organizations: PartnerOrganization[]
    partnerPreviews: Record<string, PartnerPreviewData>
  } = $props()
</script>

<ul
  class="breakout-width my-10 list-none p-0 text-[#121a1c] not-prose"
  aria-label="Allmaps partners"
>
  {#each organizations as organization (organization.slug)}
    {@const highlightedMap = highlightedPartnerMaps[organization.slug]}
    {@const preview = partnerPreviews[organization.slug]}
    {@const logoSize = partnerLogoSizes[organization.slug] ?? {
      width: 128,
      height: 80
    }}
    <li
      id={`partner-${organization.slug}`}
      class="grid min-w-0 scroll-mt-24 grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 border-b border-black/10 py-6 md:grid-cols-[8rem_minmax(0,1fr)_min(32%,17.5rem)] md:gap-6 lg:grid-cols-[10rem_minmax(0,1fr)_17.5rem] [&>figure]:col-span-2 md:[&>figure]:col-span-1 md:[&>figure]:col-start-3"
    >
      <div
        class="flex aspect-square w-full items-center justify-center rounded-md bg-[#f7f8f9] p-2 data-[plan=innovator]:bg-pink/10 data-[plan=supporter]:bg-green/10 md:p-3"
        class:invisible={!organization.logo}
        data-plan={organization.plan}
      >
        {#if organization.logo}
          <img
            class="max-h-full max-w-full object-contain"
            class:brightness-0={organization.slug === 'lmec'}
            style:width={`${logoSize.width}px`}
            style:height={`${logoSize.height}px`}
            src={organization.logo}
            alt=""
            width={logoSize.width}
            height={logoSize.height}
            loading="lazy"
          />
        {/if}
      </div>
      <div
        class="flex min-w-0 flex-col justify-center gap-2 self-stretch md:grid md:grid-cols-1 md:grid-rows-[1.5rem_auto_1.5rem] md:content-between md:justify-normal"
      >
        {#if organization.plan !== 'partner'}
          <span
            class="max-w-full self-start rounded-full bg-green/10 px-2.5 py-1 text-xs leading-none font-medium text-green data-[plan=innovator]:bg-pink/10 data-[plan=innovator]:text-pink md:row-start-1 md:justify-self-start"
            data-plan={organization.plan}
            >{organization.plan === 'innovator'
              ? 'Allmaps Innovator'
              : 'Allmaps Supporter'}</span
          >
        {/if}
        <h2
          class="subsection-title m-0 min-w-0 [overflow-wrap:anywhere] md:row-start-2 md:self-center"
        >
          {#if organization.homepage}
            <a
              class="text-inherit hover:underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#d63fa7]"
              href={organization.homepage}>{organization.name}</a
            >
          {:else}
            {organization.name}
          {/if}
        </h2>
      </div>
      {#if highlightedMap && preview}
        <PartnerMap
          map={highlightedMap}
          {preview}
          institution={organization.name}
        />
      {/if}
    </li>
  {/each}
</ul>
