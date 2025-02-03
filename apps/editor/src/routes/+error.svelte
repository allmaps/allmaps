<script>
  import { page } from '$app/stores'

  import { MapMonster } from '@allmaps/ui'
  import { red } from '@allmaps/tailwind'

  const message = $page.error?.message || 'Unknown error '
</script>

<div class="w-full h-full flex flex-col items-center justify-center gap-4">
  <div class="w-96 max-w-(--breakpoint-sm)">
    <MapMonster
      color="red"
      mood="sad"
      speechBalloonBackgroundColor={red}
      speechBalloonTextColor="white"
    >
      <div class="space-y-2">
        <p>{message}</p>
        <p>
          <a class="font-bold underline" href="/"
            >Please reload Allmaps Editor</a
          >.
        </p>
      </div>
    </MapMonster>
  </div>
</div>
