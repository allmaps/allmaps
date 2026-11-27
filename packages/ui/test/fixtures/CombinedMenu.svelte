<script lang="ts">
  import {
    LoginMenuItems,
    LoginMenuTrigger,
    type LoginUser
  } from '../../src/lib/auth.js'
  import * as DropdownMenu from '../../src/lib/dropdown-menu.js'

  let { user, showAction = true }: { user?: LoginUser; showAction?: boolean } =
    $props()
</script>

{#snippet appAction()}
  <DropdownMenu.Item>Open another map…</DropdownMenu.Item>
{/snippet}

<DropdownMenu.Root open>
  <LoginMenuTrigger {user} aria-label="Viewer menu" />
  <DropdownMenu.Content>
    <LoginMenuItems
      {user}
      children={showAction ? appAction : undefined}
      onLogIn={() => {}}
      onSignOut={() => {}}
    />
  </DropdownMenu.Content>
</DropdownMenu.Root>
