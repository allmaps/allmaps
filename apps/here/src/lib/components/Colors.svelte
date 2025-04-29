<script lang="ts">
  import { RadioGroup } from 'bits-ui'

  import { pink, blue, green, red, yellow, orange } from '@allmaps/tailwind'

  const colors = [
    {
      name: 'Pink',
      color: pink,
      value: 'pink'
    },
    {
      name: 'Blue',
      color: blue,
      value: 'blue'
    },
    {
      name: 'Green',
      color: green,
      value: 'green'
    },
    {
      name: 'Red',
      color: red,
      value: 'red'
    },
    {
      name: 'Yellow',
      color: yellow,
      value: 'yellow'
    },
    {
      name: 'Orange',
      color: orange,
      value: 'orange'
    }
  ]
</script>

<RadioGroup.Root class="flex flex-row gap-2">
  {#each colors as color}
    <RadioGroup.Item
      id={color.value}
      value={color.value}
      style="background-color: {color.color};"
      class="data-[state=checked]:outline-2 outline-offset-2
      data-[state=checked]:outline-black size-6
      inset-shadow-sm
      shrink-0 cursor-pointer rounded-full transition-all duration-100 ease-in-out"
    />
  {/each}
</RadioGroup.Root>
