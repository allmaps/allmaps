<script lang="ts">
  import SpeechBalloon from '$lib/components/SpeechBalloon.svelte'

  type Color =
    | 'green'
    | 'purple'
    | 'red'
    | 'yellow'
    | 'orange'
    | 'pink'
    | 'blue'
    | 'gray'

  type Mood = 'happy' | 'sad' /*| 'angry'*/ | 'confused' | 'excited' | 'neutral'

  const shapes = [
    '98.07 2.91 14.82 2.91 14.08 24.73 3.52 24.73 1.93 97.09 82.39 97.09 82.56 49.81 98.07 49.81 98.07 2.91',
    '98.07 2.91 2.91 3.86 2.93 97.09 76.39 97.09 76.56 69.81 98.07 69.81 98.07 2.91',
    '88.07 2.91 11.82 2.91 12.93 97.09 82.39 97.09 82.56 49.81 88.07 49.81 88.07 2.91',
    '96.07 2.91 66.21 2.91 65.83 10.91 35.95 10.91 36.07 2.91 3.82 2.91 2.93 97.09 96.39 97.09 96.07 2.91',
    '98.07 2.91 24.82 2.91 3.52 44.73 1.93 97.09 82.39 97.09 82.56 79.81 98.07 79.81 98.07 2.91'
  ]

  export let color: Color = 'green'
  export let mood: Mood = 'happy'
  export let shape = 0

  export let fillClass = ''
  export let strokeClass = ''
  export let faceClass = ''

  // Tailwind CSS needs complete class strings to work
  // I don't think it's possible to create a function that outputs the object below
  // See https://v2.tailwindcss.com/docs/optimizing-for-production#writing-purgeable-html
  const classes = {
    green: {
      stroke: 'stroke-green',
      fill: 'fill-green',
      face: 'fill-green-300 stroke-green'
    },
    purple: {
      stroke: 'stroke-purple',
      fill: 'fill-purple',
      face: 'fill-purple-300 stroke-purple'
    },
    red: {
      stroke: 'stroke-red',
      fill: 'fill-red',
      face: 'fill-red-300 stroke-red'
    },
    yellow: {
      stroke: 'stroke-yellow',
      fill: 'fill-yellow',
      face: 'fill-yellow-300 stroke-yellow'
    },
    orange: {
      stroke: 'stroke-orange',
      fill: 'fill-orange',
      face: 'fill-orange-300 stroke-orange'
    },
    pink: {
      stroke: 'stroke-pink',
      fill: 'fill-pink',
      face: 'fill-pink-300 stroke-pink'
    },
    blue: {
      stroke: 'stroke-blue',
      fill: 'fill-blue',
      face: 'fill-blue-300 stroke-blue'
    },
    gray: {
      stroke: 'stroke-gray',
      fill: 'fill-gray',
      face: 'fill-gray-300 stroke-gray'
    }
  }

  if (!strokeClass) {
    strokeClass = classes[color].stroke
  }

  if (!fillClass) {
    fillClass = classes[color].fill
  }

  if (!faceClass) {
    faceClass = classes[color].face
  }

  const points = shapes[Math.max(Math.min(shape, shapes.length - 1), 0)]

  // TODO: updated paths, remove translateX
  const translateX = -20
</script>

<div class="w-full flex flex-col justify-end items-end gap-8">
  {#if $$slots.default}
    <SpeechBalloon backgroundColor={'green'}>
      <slot />
    </SpeechBalloon>
  {/if}
  <!-- <img alt="Map Monster" src={mapMonsters[color]} draggable="false" /> -->
  <div>
    <svg
      class="w-full"
      width="100"
      height="98"
      viewBox="0 0 100 98"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" fill-rule="evenodd">
        <!-- Face -->

        <polygon {points} stroke-width="5" class={faceClass} />
        <!-- <path
          d="m15.285 2.5-.725 21.541H4.435L2.566 95.5h83.367l-2-46.69H97.5V2.5H15.285Z"
          stroke={strokeColor}
          stroke-width="5"
          fill={fillColor}
        /> -->
        <!-- Eyes and mouth -->
        {#if mood === 'happy'}
          <g transform="translate({translateX} 0)">
            <path
              d="M81.024697 47.833398 86 50.666667C81.994942 57.429862 74.55201 62 66 62s-15.994942-4.570138-20-11.333333l4.975303-2.83327C54.06491 53.09581 59.79681 56.338618 66 56.333463c6.20319.005155 11.935089-3.237653 15.024697-8.500064ZM79.032311 28c2.399136 0 4.344103 1.90285 4.344103 4.250032 0 2.347183-1.944967 4.250032-4.344103 4.250032-2.399136 0-4.344104-1.902849-4.344104-4.250032C74.688207 29.90285 76.633175 28 79.032311 28Zm-26.064622 0c-2.399136 0-4.344103 1.90285-4.344103 4.250032 0 2.347183 1.944967 4.250032 4.344103 4.250032 2.399136 0 4.344104-1.902849 4.344104-4.250032C57.311793 29.90285 55.366825 28 52.967689 28"
              class={fillClass}
            /></g
          >
        {:else if mood === 'sad'}
          <g transform="translate({translateX} 0)">
            <path
              d="M53.975303 59 49 56.166731c4.005058-6.763196 11.44799-11.333333 20-11.333333s15.994942 4.570137 20 11.333333L84.024697 59C80.93509 53.737589 75.20319 50.49478 69 50.499936 62.79681 50.49478 57.064911 53.737589 53.975303 59M82.03231 29c-2.399136 0-4.344104 1.90285-4.344104 4.250032 0 2.347183 1.944968 4.250032 4.344104 4.250032 2.399136 0 4.344103-1.902849 4.344103-4.250032C86.376414 30.90285 84.431447 29 82.032311 29m-26.064622 0c-2.399136 0-4.344103 1.90285-4.344103 4.250032 0 2.347183 1.944967 4.250032 4.344103 4.250032 2.399136 0 4.344104-1.902849 4.344104-4.250032C60.311793 30.90285 58.366825 29 55.967689 29"
              class={fillClass}
            />
          </g>
        {:else if mood === 'confused'}
          <path
            d="M58.409 56c-2.4 0-4.344 1.903-4.344 4.25s1.945 4.25 4.344 4.25 4.344-1.903 4.344-4.25S60.808 56 58.409 56m-26.065 0C29.945 56 28 57.903 28 60.25s1.945 4.25 4.344 4.25c2.4 0 4.344-1.903 4.344-4.25S34.743 56 32.344 56"
            class={fillClass}
          />
          <path
            class={strokeClass}
            stroke-width="5"
            stroke-linecap="square"
            d="m28.5 73.5 31.877 3M34.624 47.5l-9.876 3M59.624 47.5l-9.876 3"
          />
        {:else if mood === 'excited'}
          <g transform="translate({translateX} 0)">
            <path
              d="M87.019375 43.198458v.10757c0 10.03191-8.200762 18.16456-18.316688 18.16456h-.216945c-10.115925 0-18.316688-8.13265-18.316688-18.16456v-.10757h36.85032ZM81.03231 26c2.399136 0 4.344103 1.90285 4.344103 4.250032 0 2.347183-1.944967 4.250032-4.344103 4.250032-2.399136 0-4.344104-1.902849-4.344104-4.250032C76.688207 27.90285 78.633175 26 81.032311 26Zm-26.064622 0c-2.399136 0-4.344103 1.90285-4.344103 4.250032 0 2.347183 1.944967 4.250032 4.344103 4.250032 2.399136 0 4.344104-1.902849 4.344104-4.250032C59.311793 27.90285 57.366825 26 54.967689 26"
              class={strokeClass}
            /></g
          >
        {:else if mood === 'neutral'}
          <g transform="translate({translateX} 0)">
            <path
              d="M81.032311 59c-2.399136 0-4.344104 1.90285-4.344104 4.250032 0 2.347183 1.944968 4.250032 4.344104 4.250032 2.399136 0 4.344104-1.902849 4.344104-4.250032C85.376415 60.90285 83.431447 59 81.03231 59m-26.06462 0c-2.399136 0-4.344104 1.90285-4.344104 4.250032 0 2.347183 1.944968 4.250032 4.344104 4.250032 2.399136 0 4.344103-1.902849 4.344103-4.250032C59.311793 60.90285 57.366826 59 54.96769 59"
              class={strokeClass}
            />
            <path
              class={strokeClass}
              stroke-width="5"
              stroke-linecap="square"
              d="M50.623586 82.5h34.752829"
            />
          </g>
        {/if}
      </g>
      <!-- TODO: add shadow! -->
    </svg>
  </div>
</div>
