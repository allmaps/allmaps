<script lang="ts">
  type Color = 'green' | 'purple' | 'red' | 'yellow'

  export let color: Color = 'green'

  import mapMonsterGreen from '$lib/shared/images/map-monsters/map-monster-green.svg'
  import mapMonsterPurple from '$lib/shared/images/map-monsters/map-monster-purple.svg'
  import mapMonsterRed from '$lib/shared/images/map-monsters/map-monster-red.svg'
  import mapMonsterYellow from '$lib/shared/images/map-monsters/map-monster-yellow.svg'

  const mapMonsters = {
    green: mapMonsterGreen,
    purple: mapMonsterPurple,
    red: mapMonsterRed,
    yellow: mapMonsterYellow
  }
</script>

<img alt="Map Monster" src={mapMonsters[color]} />
