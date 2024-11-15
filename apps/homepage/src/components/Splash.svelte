<script lang="ts">
  import { Logo } from '@allmaps/ui'

  const masks = [
    '1028.3,975.1 624.5,1017.6 659.3,1341.3 956.4,1310.1 945,1201.2 1051.7,1190',
    '1457.1,459 921.5,305.9 997.5,39 1284.9,120.7 1254.9,226.1 1503.1,297.5',
    '178.7,142.9 375.3,114 602.3,73.3 678.9,56.4 698.6,164.9 624.8,183.3 653.5,375 167.5,463.5 144.5,284.5 196.5,273.5',
    '483.8,640 419.3,875.1 478.6,893.4 488.9,942.8 484.1,998.5 465.1,1056.6 431.7,1110.7 401.4,1146.2 83.4,1056.1 223.6,565.6',
    '1097.7,572 1446.1,571.9 1446.1,856 1295.3,856 1295.3,784.1 1183.3,774.9 1173.3,855.5 1097.1,855.5'
  ]

  const maskStyles = [
    {
      fill: '#A5DFE6',
      fillOpacity: 0.3873,
      stroke: '#63D8E6'
    },
    {
      fill: '#FE5E60',
      fillOpacity: 0.2548,
      stroke: '#FE5E60'
    },
    {
      fill: '#ffc742',
      fillOpacity: 0.3361,
      stroke: '#ffc742'
    },
    {
      fill: '#C552B5',
      fillOpacity: 0.5033,
      stroke: '#C552B5'
    },
    {
      fill: '#64C18F',
      fillOpacity: 0.5256,
      stroke: '#64C18F'
    }
  ]

  function maskToPoints(mask: string) {
    const points = mask
      .split(' ')
      .map((pointStr) => pointStr.split(',').map((str) => parseFloat(str)))

    return [...points, points[0]]
  }

  function pointsToPath(points: number[][], length?: number) {
    if (!length) {
      length = points.length
    }

    return points
      .slice(0, length)
      .map((point, index) => [
        index === 0 ? 'M' : 'L',
        ...point,
        index === points.length - 1 ? 'Z' : ''
      ])
      .flat()
      .join(' ')
  }
</script>

<section
  class="relative overflow-hidden flex justify-center items-center h-screen min-h-[600px] text-center"
>
  <svg
    class="background pointer-events-none"
    id="masks"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    preserveAspectRatio="xMinYMin slice"
    x="0px"
    y="0px"
    viewBox="0 0 1600 1381"
  >
    {#each masks as mask, index}
      <path
        d={pointsToPath(maskToPoints(mask))}
        style:fill={maskStyles[index].fill}
        style:fill-opacity={maskStyles[index].fillOpacity}
        style:stroke={maskStyles[index].stroke}
      />
    {/each}
  </svg>

  <div class="flex flex-col items-center w-96 p-4 prose text-white">
    <div class="w-24">
      <Logo inverted />
    </div>
    <h1 class="text-white mt-0 mb-5 text-4xl geograph">Allmaps</h1>
    <h2 class="text-white mt-0 mb-4 text-2xl leading-9">
      Curating, georeferencing and exploring for IIIF maps
    </h2>
    <p>
      Millions of maps are available through IIIF, across libraries, archives
      and museums worldwide. Allmaps makes it easier and more inspiring to
      curate, georeference and explore collections of digitized maps.
    </p>
  </div>
</section>

<style scoped>
  section {
    background-color: #101656;
    color: white;
    background-image: radial-gradient(
      circle at 50% 50%,
      #25318f 0%,
      #101656 100%
    );
  }

  #masks {
    position: absolute;
    height: 100%;
    min-height: 1081px;
  }

  #masks path {
    stroke-width: 10;
  }
</style>
