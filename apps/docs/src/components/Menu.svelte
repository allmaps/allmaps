<script lang="ts">
  import { fade } from 'svelte/transition'
  import { DropdownMenu } from 'bits-ui'

  import CaretDown from 'phosphor-svelte/lib/CaretDown'

  let open = false
</script>

<div class="flex flex-row items-center gap-2 md:gap-3">
  <a href="/#getting-started" class="w-min text-black no-underline"
    >Getting&nbsp;started</a
  >
  <DropdownMenu.Root bind:open preventScroll={false}>
    <DropdownMenu.Trigger
      class="w-min bg-[transparent] cursor-pointer flex items-center gap-1"
    >
      Tools <div class:rotate-180={open} class="flex transition-transform">
        <CaretDown weight="bold" />
      </div>
    </DropdownMenu.Trigger>

    <DropdownMenu.Content
      class="z-50 w-full max-w-[220px] rounded-xl border border-gray-100 px-1 py-1.5 shadow-md bg-white fixed"
      align="start"
      sideOffset={0}
      strategy="fixed"
      overlap={true}
      transition={fade}
      transitionConfig={{
        duration: 50
      }}
    >
      <DropdownMenu.Item
        class="text-sm md:text-base select-none rounded-md py-3 pl-3 pr-1.5 hover:bg-gray-100"
        ><a class="text-black no-underline" href="https://viewer.allmaps.org"
          >Allmaps Viewer</a
        ></DropdownMenu.Item
      >
      <DropdownMenu.Item
        class="text-sm md:text-base select-none rounded-md py-3 pl-3 pr-1.5 hover:bg-gray-100"
        ><a class="text-black no-underline" href="https://editor.allmaps.org"
          >Allmaps Editor</a
        ></DropdownMenu.Item
      >
      <DropdownMenu.Separator
        class="my-1 -ml-1 -mr-1 block h-px bg-gray-100 w-[90%]"
      />

      <DropdownMenu.Item
        class="text-sm md:text-base select-none rounded-md py-3 pl-3 pr-1.5 hover:bg-gray-100"
        ><a class="text-black no-underline" href="#tools">More tools</a
        ></DropdownMenu.Item
      >
    </DropdownMenu.Content>
  </DropdownMenu.Root>

  <div><a class="text-black no-underline" href="/#about-allmaps">About</a></div>
  <div>
    <a class="text-black no-underline" href="/reference/packages/annotation"
      >Docs</a
    >
  </div>
</div>
