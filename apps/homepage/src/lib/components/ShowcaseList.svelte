<script lang="ts">
  import ScreenshotPanel from '$lib/components/ScreenshotPanel.svelte'
  import { Screenshot } from '@allmaps/ui'
  import { blue, green, orange, pink, purple } from '@allmaps/tailwind'
  import {
    showcaseProjects,
    getShowcaseScreenshot
  } from '$lib/data/showcase.js'

  import { getScreenshotImage } from '$lib/data/screenshot-images.js'

  const colors = [orange, blue, purple, green, pink]
</script>

<div class="breakout-width text-[#121a1c] not-prose">
  <ul class="m-0 list-none p-0">
    {#each showcaseProjects as project, index (project.id)}
      <li
        class="scroll-mt-24 border-t border-[#121a1c]/15 pt-8 pb-10 md:pt-10 md:pb-14"
        id={project.id}
      >
        <div
          class="grid items-center gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-12"
        >
          <div>
            <header class="mb-5 md:mb-7">
              <h2 class="section-title m-0 text-balance">
                {project.title}
              </h2>
            </header>

            <p class="m-0 text-base leading-7 text-pretty text-[#4a5356]">
              {project.description}
            </p>
            <ul class="mt-6 mb-0 grid list-none justify-items-start gap-3 p-0">
              {#each project.links ?? [{ title: 'website', url: project.url }] as link (link.url)}
                <li>
                  <a
                    class="focus-visible:outline-3 focus-visible:outline-offset-5 focus-visible:outline-pink group inline-flex items-center gap-3 text-sm font-bold text-pink no-underline"
                    href={link.url}
                    rel="external"
                  >
                    <span class="underline underline-offset-3">
                      View {link.title}
                    </span>
                    {#if !project.links}
                      <span class="sr-only"> — {project.title}</span>
                    {/if}
                    <span
                      class="grid size-7 place-items-center rounded-full bg-[#fff0f8] transition duration-150 group-hover:translate-x-0.5 group-hover:bg-[#ffd9ed] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                      aria-hidden="true">→</span
                    >
                  </a>
                </li>
              {/each}
            </ul>
          </div>

          <ScreenshotPanel
            color={colors[index % colors.length]}
            href={project.url}
            external
            label={`View ${project.title}`}
          >
            <Screenshot
              {...getShowcaseScreenshot(project)}
              {...getScreenshotImage(`showcase-${project.id}`)}
              sizes="auto, (min-width: 1168px) 596px, (min-width: 768px) calc((100vw - 96px) * 0.6 - 48px), (min-width: 640px) calc(100vw - 96px), calc(100vw - 64px)"
              showUrl
              alt={project.screenshotSource?.title ??
                `Screenshot of ${project.title}`}
            />
          </ScreenshotPanel>
        </div>
      </li>
    {/each}
  </ul>
</div>
