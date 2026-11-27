<script lang="ts">
  import { Avatar, AvatarFallback, AvatarImage } from '@ui-sdk/svelte/avatar'
  import UserCircleIcon from 'phosphor-svelte/lib/UserCircleIcon'

  let { image }: { image?: string | null } = $props()
</script>

{#snippet userIcon()}
  <UserCircleIcon
    aria-hidden="true"
    class="block size-7 max-h-full max-w-full shrink-0"
  />
{/snippet}

{#if image}
  <Avatar
    aria-hidden="true"
    class="inline-flex size-full overflow-hidden rounded-full"
  >
    <AvatarImage src={image} alt="" class="size-full object-cover" />
    <AvatarFallback
      class="grid size-full place-items-center bg-transparent text-inherit"
    >
      {@render userIcon()}
    </AvatarFallback>
  </Avatar>
{:else}
  {@render userIcon()}
{/if}
