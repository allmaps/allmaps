<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import FileImage from 'phosphor-svelte/lib/FileImageIcon'
  import ArrowUpRight from 'phosphor-svelte/lib/ArrowUpRightIcon'
  import * as Select from '@allmaps/ui/select'
  import { CodeBlock } from '@allmaps/ui/code'
  import { annotationExamples } from '../../lib/examples/annotations.js'
  import { fetchAnnotation } from '../../lib/examples/annotation.js'
  import { validateAnnotationUrl } from '../../lib/examples/source.js'
  import type { CodeThemeConfig, RenderedCodeBlock } from '@allmaps/ui/code'
  import type { MapExampleOption } from '../../lib/examples/types.js'
  import type {
    generateGeotiffExample,
    generateSourceImageCommands
  } from '../../lib/examples/geotiff.js'

  let {
    annotationUrl = annotationExamples[0].annotationUrl,
    examples = annotationExamples,
    codeTheme
  }: {
    annotationUrl?: string
    examples?: MapExampleOption[]
    codeTheme?: CodeThemeConfig
  } = $props()

  const id = $props.id()
  let draftUrl = $state(untrack(() => annotationUrl))
  let result = $state.raw<
    Awaited<ReturnType<typeof generateGeotiffExample>> & {
      highlighted: RenderedCodeBlock
      sourceCommands: ReturnType<typeof generateSourceImageCommands>
    }
  >()
  let loading = $state(false)
  let error = $state('')
  let controller: AbortController | undefined
  const selectedExample = $derived(
    examples.find((option) => option.annotationUrl === draftUrl.trim())
  )

  function changeUrl(value: string) {
    controller?.abort()
    draftUrl = value
    result = undefined
    loading = false
    error = ''
  }

  async function generate() {
    controller?.abort()
    const request = new AbortController()
    controller = request
    error = ''
    loading = true
    try {
      const url = validateAnnotationUrl(draftUrl.trim())
      const [
        annotation,
        { generateGeotiffExample, generateSourceImageCommands }
      ] = await Promise.all([
        fetchAnnotation(url, request.signal),
        import('../../lib/examples/geotiff.js')
      ])
      request.signal.throwIfAborted()
      const generated = await generateGeotiffExample(annotation)
      const { renderCode } = await import('@allmaps/ui/code/renderer')
      const highlighted = await renderCode({
        code: generated.script,
        language: 'bash',
        folds: generated.folds,
        theme: codeTheme
      })
      if (!request.signal.aborted) {
        result = {
          ...generated,
          highlighted,
          sourceCommands: generateSourceImageCommands(url)
        }
      }
    } catch (cause) {
      if (!request.signal.aborted) {
        result = undefined
        error =
          cause instanceof Error
            ? cause.message
            : 'Could not generate the script.'
      }
    } finally {
      if (!request.signal.aborted) loading = false
    }
  }

  function download() {
    if (!result) return
    const url = URL.createObjectURL(
      new Blob([result.script], { type: 'text/x-shellscript;charset=utf-8' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'allmaps-geotiff.sh'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  onDestroy(() => controller?.abort())
</script>

{#snippet exampleLabel(label: string)}
  {@const separator = label.indexOf(' — ')}
  <span
    class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap [&_strong]:font-semibold"
    ><strong>{separator === -1 ? label : label.slice(0, separator)}</strong
    >{#if separator !== -1}<span class="font-normal opacity-75"
        >{label.slice(separator)}</span
      >{/if}</span
  >
{/snippet}

<div
  class="not-content border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] rounded-[14px] bg-[color:var(--sl-color-bg,#fff)] text-[color:var(--sl-color-text,#182a2f)] overflow-hidden"
>
  <form
    class="p-5 grid gap-4 [&_[data-slot='select-trigger']]:w-full [&_[data-slot='select-trigger']]:min-w-0 [&_[data-slot='select-trigger']]:h-auto [&_[data-slot='select-trigger']]:py-2.5 [&_[data-slot='select-trigger']]:px-3 [&_[data-slot='select-trigger']]:rounded-lg [&_[data-slot='select-trigger']]:text-sm"
    onsubmit={(event) => {
      event.preventDefault()
      void generate()
    }}
  >
    <div>
      <label
        class="block mb-1 text-xs font-medium"
        id={`${id}-example-label`}
        for={`${id}-example`}>Example map</label
      >
      <Select.Root
        type="single"
        items={examples.map(({ annotationUrl, label }) => ({
          value: annotationUrl,
          label
        }))}
        value={selectedExample?.annotationUrl ?? ''}
        onValueChange={(value) => {
          if (value) changeUrl(value)
        }}
      >
        <Select.Trigger
          id={`${id}-example`}
          aria-labelledby={`${id}-example-label`}
        >
          {@render exampleLabel(selectedExample?.label ?? 'Custom URL')}
        </Select.Trigger>
        <Select.Content>
          {#each examples as option (option.annotationUrl)}
            <Select.Item value={option.annotationUrl} label={option.label}>
              {#snippet children()}{@render exampleLabel(
                  option.label
                )}{/snippet}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
    <div>
      <label class="block mb-1 text-xs font-medium" for={`${id}-url`}
        >Annotation URL</label
      >
      <div class="flex flex-wrap gap-2">
        <input
          class="[font-family:inherit] [font-weight:inherit] [line-height:inherit] border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] rounded-lg py-2.5 px-3 flex-1 [min-width:min(100%,14rem)] bg-[color:var(--sl-color-bg,#fff)] text-[color:inherit] font-[family-name:var(--sl-font-mono,monospace)] text-xs focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:#ff56ba] focus-visible:outline-offset-[2px]"
          id={`${id}-url`}
          type="url"
          value={draftUrl}
          oninput={(event) => changeUrl(event.currentTarget.value)}
          required
        />
        <button
          class="[font-family:inherit] [line-height:inherit] border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] rounded-lg py-2.5 px-3 cursor-pointer text-sm font-semibold text-[color:#ff56ba] border-[color:color-mix(in_srgb,#ff56ba_55%,var(--sl-color-gray-5,#bac4c8))] bg-[color:color-mix(in_srgb,#ff56ba_10%,var(--sl-color-bg,#fff))] hover:bg-[color:color-mix(in_srgb,#ff56ba_20%,var(--sl-color-bg,#fff))] disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:#ff56ba] focus-visible:outline-offset-[2px]"
          type="submit"
          disabled={loading}>Generate script</button
        >
      </div>
    </div>
    {#if error}
      <div
        class="text-sm text-[color:var(--sl-color-red-high,#b91c1c)]"
        role="alert"
      >
        {error}
      </div>
    {/if}
  </form>
  {#if result}
    <div
      class="p-5 border-t border-solid border-t-[color:var(--sl-color-gray-5,#bac4c8)]"
    >
      <div class="[--allmaps-code-max-height:30rem]">
        <CodeBlock
          code={result.script}
          folds={result.folds}
          language="bash"
          theme={codeTheme}
          initial={result.highlighted}
          title="allmaps-geotiff.sh"
          ondownload={download}
        >
          {#snippet titleContent()}
            <span
              class="font-[family-name:var(--allmaps-code-font,var(--allmaps-ui-font-mono,ui-monospace,monospace))] text-[length:var(--allmaps-code-font-size,0.85rem)]"
              >allmaps-geotiff.sh</span
            >
          {/snippet}
        </CodeBlock>
      </div>
      <section
        class="text-sm mt-4 [&_h2]:m-0 [&_h2]:[font-size:inherit] [&_h2]:font-semibold [&_p]:my-3 [&_p]:text-[color:var(--sl-color-gray-2,#495c62)] [&_p]:text-[0.8125rem] [&_h3]:mt-5 [&_h3]:mb-3 [&_h3]:text-sm [&_h3]:font-semibold"
        aria-labelledby={`${id}-required-images`}
      >
        <h2 id={`${id}-required-images`}>Required source images</h2>
        <p>
          Save the full-resolution JPEGs in the same directory as the generated
          script. The commands below use your selected annotation and save the
          images with the filenames listed below. Run them from that directory
          after installing
          <a
            class="text-[color:#ff56ba] underline"
            href="https://docs.allmaps.org/packages/cli#installation"
            >Allmaps CLI</a
          >.
        </p>
        <h3>Download with Allmaps CLI</h3>
        <p>
          This command only works if the IIIF server supports downloading the
          full-resolution image in a single request. If the server limits
          full-image downloads, use the dezoomify-rs method below.
        </p>
        <CodeBlock
          code={result.sourceCommands.download}
          language="bash"
          theme={codeTheme}
          title="Download source images"
        />
        <h3>Download with dezoomify-rs</h3>
        <p>
          If the image server limits full-image downloads, install
          <a
            class="text-[color:#ff56ba] underline"
            href="https://dezoomify-rs.ophir.dev/">dezoomify-rs</a
          > to assemble the images from IIIF tiles. Allmaps CLI generates the download
          script.
        </p>
        <CodeBlock
          code={result.sourceCommands.dezoomify}
          language="bash"
          theme={codeTheme}
          title="Download source images with dezoomify-rs"
        />
        <h3>List image URLs</h3>
        <p>
          To use another download tool, list the IIIF image service URLs with
          <code class="font-[family-name:var(--sl-font-mono,monospace)]"
            >allmaps annotation image-ids</code
          >. Each image below also has a link to request its full-resolution
          JPEG.
        </p>
        <CodeBlock
          code={result.sourceCommands.imageIds}
          language="bash"
          theme={codeTheme}
          title="List IIIF image service URLs"
        />
        <h3>Required files</h3>
        <p>
          For manual downloads, save each JPEG with the filename shown and check
          that its pixel dimensions match. The GeoTIFF script checks both before
          rendering.
        </p>
        <ul
          class="m-0 p-0 list-none border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] rounded-lg bg-[color:color-mix(in_srgb,var(--sl-color-text,#182a2f)_3%,var(--sl-color-bg,#fff))] [&_li]:flex [&_li]:flex-wrap [&_li]:items-center [&_li]:gap-3 [&_li]:py-3.5 [&_li]:px-4 [&_li_+_li]:border-t [&_li_+_li]:border-solid [&_li_+_li]:border-t-[color:var(--sl-color-gray-5,#bac4c8)]"
          role="list"
        >
          {#each result.images as image (image.url)}
            <li>
              <span class="flex text-[color:var(--sl-color-gray-3,#495c62)]"
                ><FileImage size={22} aria-hidden="true" /></span
              >
              <div
                class="flex flex-wrap items-baseline gap-y-1 gap-x-3 flex-1 [min-width:min(100%,12rem)] [&_code]:text-[0.8125rem] [&_code]:wrap-anywhere"
              >
                <code class="font-[family-name:var(--sl-font-mono,monospace)]"
                  >{image.filename}</code
                >
                <span
                  class="text-xs text-[color:var(--sl-color-gray-2,#495c62)]"
                  >JPEG · {image.width?.toLocaleString('en-US')} × {image.height?.toLocaleString(
                    'en-US'
                  )} pixels</span
                >
              </div>
              {#if image.downloadUrl}
                <a
                  class="text-[color:#ff56ba] inline-flex items-center gap-1 text-xs no-underline whitespace-nowrap hover:underline hover:[text-underline-offset:3px] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:#ff56ba] focus-visible:outline-offset-[3px]"
                  href={image.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Full-resolution JPEG for ${image.filename}`}
                >
                  Full-resolution JPEG <ArrowUpRight
                    size={14}
                    aria-hidden="true"
                  />
                </a>
              {/if}
              <a
                class="text-[color:#ff56ba] inline-flex items-center gap-1 text-xs no-underline whitespace-nowrap hover:underline hover:[text-underline-offset:3px] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:#ff56ba] focus-visible:outline-offset-[3px]"
                href={`${image.url}/info.json`}
                target="_blank"
                rel="noreferrer"
                aria-label={`IIIF details for ${image.filename}`}
              >
                IIIF details <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </li>
          {/each}
        </ul>
      </section>
    </div>
  {/if}
</div>
