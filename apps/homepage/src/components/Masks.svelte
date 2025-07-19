<script lang="ts">
  let width = $state(0)
  let height = $state(0)

  type Mask = {
    points: [number, number][]
    color: string
    angle: number
  }

  const masks: Mask[] = [
    {
      points: [
        [1028.3, 975.1],
        [624.5, 1017.6],
        [659.3, 1341.3],
        [956.4, 1310.1],
        [945, 1201.2],
        [1051.7, 1190]
      ],
      color: '#ffc742',
      angle: 265
    }
    // {
    //   points: [
    //     [1457.1, 459],
    //     [921.5, 305.9],
    //     [997.5, 39],
    //     [1284.9, 120.7],
    //     [1254.9, 226.1],
    //     [1503.1, 297.5]
    //   ],
    //   color: '#FE5E60',
    //   angle: 135
    // }
  ]

  function getBounds(points: [number, number][]) {
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (let point of points) {
      minX = Math.min(minX, point[0])
      minY = Math.min(minY, point[1])

      maxX = Math.max(maxX, point[0])
      maxY = Math.max(maxY, point[1])
    }

    return [
      [minX, minY],
      [maxX, maxY]
    ]
  }

  function degreesToRadians(degrees: number) {
    return degrees * (Math.PI / 180)
  }

  function getPointOnRect(angle: number, width: number, height: number) {
    const sin = Math.sin(degreesToRadians(angle + 90))
    const cos = Math.cos(degreesToRadians(angle + 90))

    let dy = sin > 0 ? height / 2 : height / -2
    let dx = cos > 0 ? width / 2 : width / -2

    if (Math.abs(dx * sin) < Math.abs(dy * cos)) {
      dy = (dx * sin) / cos
    } else {
      dx = (dy * cos) / sin
    }

    return [-dx + width / 2, -dy + height / 2]
  }

  function getTransform(mask: Mask) {
    const bounds = getBounds(mask.points)

    const center = [
      (bounds[1][0] - bounds[0][0]) / 2 + bounds[0][0],
      (bounds[1][1] - bounds[0][1]) / 2 + bounds[0][1]
    ]

    const translate0 = [-center[0], -center[1]]
    const scale = 1
    const translate1 = getPointOnRect(mask.angle, width, height)

    return `translate(${translate0[0]}px, ${translate0[1]}px) translate(${translate1[0]}px, ${translate1[1]}px) scale(${scale})`
  }
</script>

<div
  bind:clientWidth={width}
  bind:clientHeight={height}
  class="w-full h-full opacity-30 pointer-events-none"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="xMinYMin slice"
  >
    {#each masks as mask, index (index)}
      <polygon
        points={mask.points.map((p) => p.join(',')).join(' ')}
        style:transform={getTransform(mask)}
        style:fill={mask.color}
        style:fill-opacity={0.6}
        style:stroke={mask.color}
        style:stroke-width={5}
        style:stroke-opacity={1}
      />
    {/each}
  </svg>
</div>
