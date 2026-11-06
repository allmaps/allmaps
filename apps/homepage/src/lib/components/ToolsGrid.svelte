<script lang="ts">
  import { Screenshot } from '@allmaps/ui'
  import ScreenshotPanel from '$lib/components/ScreenshotPanel.svelte'
  import type { Tool } from '$lib/data/tools.js'

  type Props = {
    tools: Tool[]
  }

  const { tools }: Props = $props()
  const screenshotSizes =
    'auto, (min-width: 768px) 284px, (min-width: 640px) min(656px, calc(100vw - 96px)), calc(100vw - 64px)'
</script>

<ul class="not-prose m-0 grid list-none gap-12 p-0 md:gap-16">
  {#each tools as tool (tool.href)}
    <li class="grid min-w-0 items-center gap-6 md:grid-cols-2 md:gap-10">
      <div class="min-w-0">
        <ScreenshotPanel
          color={tool.color}
          href={tool.href}
          label={`Open ${tool.label}`}
        >
          {#if tool.screenshot}
            <Screenshot
              {...tool.screenshot}
              src={tool.image.src}
              srcset={tool.image.srcset}
              alt={tool.image.alt}
              sizes={screenshotSizes}
              showUrl
              urlDisplay="route"
            />
          {:else}
            <img
              class="h-full w-full object-contain!"
              src={tool.image.src}
              srcset={tool.image.srcset}
              alt={tool.image.alt}
              sizes={screenshotSizes}
              loading="lazy"
            />
          {/if}
        </ScreenshotPanel>
      </div>
      <div class="min-w-0 space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="section-title m-0 text-black">
            <a class="text-inherit hover:underline" href={tool.href}
              >{tool.label}</a
            >
          </h2>
          {#if tool.badge}
            <span
              class="rounded-full bg-purple/20 px-3 py-1 text-xs font-medium text-purple-700"
            >
              {tool.badge}
            </span>
          {/if}
        </div>
        <p class="m-0 leading-relaxed text-black/70">{tool.description}</p>
      </div>
    </li>
  {/each}
</ul>
